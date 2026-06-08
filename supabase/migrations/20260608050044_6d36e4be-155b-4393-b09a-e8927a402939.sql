
-- 1. Colonnes manquantes dans profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rsac_numero         text,
  ADD COLUMN IF NOT EXISTS rsac_greffe         text,
  ADD COLUMN IF NOT EXISTS rsac_date           date,
  ADD COLUMN IF NOT EXISTS rsac_justificatif   text,
  ADD COLUMN IF NOT EXISTS statut_juridique    text,
  ADD COLUMN IF NOT EXISTS siret               text,
  ADD COLUMN IF NOT EXISTS zone_prioritaire    text,
  ADD COLUMN IF NOT EXISTS onboarding_step     integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_statut_juridique_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_statut_juridique_check
      CHECK (statut_juridique IS NULL OR statut_juridique IN ('auto-entrepreneur','eurl','sasu'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.zone_prioritaire IS
  '1=Tours centre | 2=Sud-ouest | 3=Ouest | 4=Est | 5=Sud — affectée par le directeur uniquement';

-- 2. Table onboarding_progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandataire_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_current    integer NOT NULL DEFAULT 1,
  step_completed  integer[] NOT NULL DEFAULT '{}',
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mandataire_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users manage own onboarding"
  ON public.onboarding_progress FOR ALL TO authenticated
  USING (mandataire_id = auth.uid())
  WITH CHECK (mandataire_id = auth.uid());

DROP POLICY IF EXISTS "Super admins read all onboarding" ON public.onboarding_progress;
CREATE POLICY "Super admins read all onboarding"
  ON public.onboarding_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS trg_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER trg_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table zones_mandataires
CREATE TABLE IF NOT EXISTS public.zones_mandataires (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandataire_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id         integer NOT NULL CHECK (zone_id BETWEEN 1 AND 5),
  zone_label      text NOT NULL,
  communes        text[] NOT NULL DEFAULT '{}',
  perimetre_km    integer NOT NULL DEFAULT 25,
  affectee_par    uuid REFERENCES auth.users(id),
  date_affectation date NOT NULL DEFAULT CURRENT_DATE,
  statut          text NOT NULL DEFAULT 'prioritaire',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mandataire_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones_mandataires TO authenticated;
GRANT ALL ON public.zones_mandataires TO service_role;

ALTER TABLE public.zones_mandataires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage zones" ON public.zones_mandataires;
CREATE POLICY "Super admins manage zones"
  ON public.zones_mandataires FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Mandataires read own zone" ON public.zones_mandataires;
CREATE POLICY "Mandataires read own zone"
  ON public.zones_mandataires FOR SELECT TO authenticated
  USING (mandataire_id = auth.uid());

-- 4. Enrichir partenaires
ALTER TABLE public.partenaires
  ADD COLUMN IF NOT EXISTS code_prescripteur   text,
  ADD COLUMN IF NOT EXISTS statut              text DEFAULT 'en_cours',
  ADD COLUMN IF NOT EXISTS date_accreditation  date,
  ADD COLUMN IF NOT EXISTS accredite_par       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS charte_signee       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nb_dossiers_envoyes integer DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partenaires_statut_check') THEN
    ALTER TABLE public.partenaires ADD CONSTRAINT partenaires_statut_check
      CHECK (statut IN ('en_cours','accredite','suspendu'));
  END IF;
END $$;

UPDATE public.partenaires
  SET code_prescripteur = 'HUNT-PRE-' || LPAD(FLOOR(RANDOM() * 9999)::int::text, 4, '0')
  WHERE code_prescripteur IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partenaires_code_prescripteur_uidx
  ON public.partenaires(code_prescripteur);

-- 5. RLS sur bucket documents-contractuels (bucket créé via tool)
DROP POLICY IF EXISTS "Mandataires access own contractuels" ON storage.objects;
CREATE POLICY "Mandataires access own contractuels"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-contractuels'
    AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents-contractuels'
    AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Super admins access all contractuels" ON storage.objects;
CREATE POLICY "Super admins access all contractuels"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-contractuels'
    AND has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (bucket_id = 'documents-contractuels'
    AND has_role(auth.uid(), 'super_admin'::app_role));
