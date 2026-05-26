
-- =============================================================
-- MODULE 1 : Workflow de validation directeur
-- =============================================================
CREATE TABLE public.validations_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','valide','refuse','infos_demandees')),
  decideur_id uuid,
  motif text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX validations_dossiers_dossier_id_idx ON public.validations_dossiers(dossier_id);
CREATE INDEX validations_dossiers_statut_idx ON public.validations_dossiers(statut);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.validations_dossiers TO authenticated;
GRANT ALL ON public.validations_dossiers TO service_role;

ALTER TABLE public.validations_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins all validations"
  ON public.validations_dossiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires read own validations"
  ON public.validations_dossiers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = validations_dossiers.dossier_id AND d.mandataire_id = auth.uid()
  ));

CREATE POLICY "Mandataires can update infos_demandees status"
  ON public.validations_dossiers FOR UPDATE TO authenticated
  USING (
    statut = 'infos_demandees' AND EXISTS (
      SELECT 1 FROM public.dossiers d
      WHERE d.id = validations_dossiers.dossier_id AND d.mandataire_id = auth.uid()
    )
  );

CREATE TRIGGER update_validations_updated_at
  BEFORE UPDATE ON public.validations_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create validation entry when dossier flagged
CREATE OR REPLACE FUNCTION public.create_validation_for_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.validation_directeur_requise = true AND (
    TG_OP = 'INSERT'
    OR (TG_OP = 'UPDATE' AND COALESCE(OLD.validation_directeur_requise, false) = false)
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.validations_dossiers
      WHERE dossier_id = NEW.id AND statut IN ('en_attente','infos_demandees')
    ) THEN
      INSERT INTO public.validations_dossiers (dossier_id, statut)
      VALUES (NEW.id, 'en_attente');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_validation_dossier
AFTER INSERT OR UPDATE OF validation_directeur_requise ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.create_validation_for_dossier();

-- RPC : decideur statue (super_admin)
CREATE OR REPLACE FUNCTION public.decide_validation_dossier(
  _validation_id uuid,
  _statut text,
  _motif text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier_id uuid;
  v_client_name text;
  v_mandataire_id uuid;
  v_label text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès réservé au directeur';
  END IF;
  IF _statut NOT IN ('valide','refuse','infos_demandees') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;
  IF _statut IN ('refuse','infos_demandees') AND (_motif IS NULL OR length(trim(_motif)) = 0) THEN
    RAISE EXCEPTION 'Motif obligatoire';
  END IF;

  UPDATE public.validations_dossiers
  SET statut = _statut, decideur_id = auth.uid(), motif = _motif, updated_at = now()
  WHERE id = _validation_id
  RETURNING dossier_id INTO v_dossier_id;

  IF v_dossier_id IS NULL THEN
    RAISE EXCEPTION 'Validation introuvable';
  END IF;

  SELECT client_name, mandataire_id INTO v_client_name, v_mandataire_id
  FROM public.dossiers WHERE id = v_dossier_id;

  -- Si validé : libérer le dossier
  IF _statut = 'valide' THEN
    UPDATE public.dossiers
    SET validation_directeur_requise = false, updated_at = now()
    WHERE id = v_dossier_id;
    v_label := 'Dossier validé par le directeur';
  ELSIF _statut = 'refuse' THEN
    v_label := 'Dossier refusé par le directeur';
  ELSE
    v_label := 'Informations complémentaires demandées';
  END IF;

  -- Journal activité
  INSERT INTO public.activites (dossier_id, auteur_id, type, commentaire)
  VALUES (
    v_dossier_id,
    auth.uid(),
    'validation',
    v_label || CASE WHEN _motif IS NOT NULL THEN E' — Motif : ' || _motif ELSE '' END
  );

  -- Alerte mandataire
  IF v_mandataire_id IS NOT NULL THEN
    INSERT INTO public.alertes (user_id, dossier_id, type, title, detail)
    VALUES (
      v_mandataire_id,
      v_dossier_id,
      CASE WHEN _statut = 'valide' THEN 'success'
           WHEN _statut = 'refuse' THEN 'error'
           ELSE 'warning' END,
      v_label || ' — ' || v_client_name,
      COALESCE(_motif, '')
    );
  END IF;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.validations_dossiers;
ALTER TABLE public.validations_dossiers REPLICA IDENTITY FULL;

-- Backfill : créer une ligne en_attente pour les dossiers déjà marqués sans validation
INSERT INTO public.validations_dossiers (dossier_id, statut)
SELECT d.id, 'en_attente'
FROM public.dossiers d
WHERE d.validation_directeur_requise = true
  AND NOT EXISTS (
    SELECT 1 FROM public.validations_dossiers v
    WHERE v.dossier_id = d.id AND v.statut IN ('en_attente','infos_demandees')
  );

-- =============================================================
-- MODULE 2 : Conformité légale mandataires
-- =============================================================
CREATE TABLE public.conformite_mandataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandataire_id uuid NOT NULL,
  annee int NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  heures_formation_annee numeric NOT NULL DEFAULT 0,
  justificatifs jsonb NOT NULL DEFAULT '[]'::jsonb,
  statut_formation text NOT NULL DEFAULT 'non_conforme',
  attestation_debut date,
  attestation_fin date,
  statut_attestation text NOT NULL DEFAULT 'inactive',
  suspendu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mandataire_id, annee)
);
CREATE INDEX conformite_mandataire_idx ON public.conformite_mandataires(mandataire_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conformite_mandataires TO authenticated;
GRANT ALL ON public.conformite_mandataires TO service_role;

ALTER TABLE public.conformite_mandataires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins all conformite"
  ON public.conformite_mandataires FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires read own conformite"
  ON public.conformite_mandataires FOR SELECT TO authenticated
  USING (mandataire_id = auth.uid());

CREATE POLICY "Mandataires update own formation hours"
  ON public.conformite_mandataires FOR UPDATE TO authenticated
  USING (mandataire_id = auth.uid())
  WITH CHECK (mandataire_id = auth.uid());

CREATE POLICY "Mandataires insert own conformite"
  ON public.conformite_mandataires FOR INSERT TO authenticated
  WITH CHECK (mandataire_id = auth.uid());

-- Auto-compute statuts
CREATE OR REPLACE FUNCTION public.compute_conformite_statuts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jours_restants int;
BEGIN
  -- Formation
  IF NEW.heures_formation_annee >= 14 THEN
    NEW.statut_formation := 'conforme';
  ELSIF NEW.heures_formation_annee > 0 THEN
    NEW.statut_formation := 'en_cours';
  ELSE
    NEW.statut_formation := 'non_conforme';
  END IF;

  -- Attestation
  IF NEW.attestation_fin IS NULL THEN
    NEW.statut_attestation := 'inactive';
  ELSE
    jours_restants := (NEW.attestation_fin - CURRENT_DATE);
    IF jours_restants < 0 THEN
      NEW.statut_attestation := 'expiree';
    ELSIF jours_restants <= 60 THEN
      NEW.statut_attestation := 'expirante';
    ELSE
      NEW.statut_attestation := 'valide';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_conformite_compute
BEFORE INSERT OR UPDATE ON public.conformite_mandataires
FOR EACH ROW EXECUTE FUNCTION public.compute_conformite_statuts();

-- Storage bucket pour justificatifs
INSERT INTO storage.buckets (id, name, public)
VALUES ('conformite-justificatifs', 'conformite-justificatifs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Mandataires manage own conformite files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'conformite-justificatifs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'conformite-justificatifs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Super admins read all conformite files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'conformite-justificatifs' AND public.has_role(auth.uid(), 'super_admin'));

-- =============================================================
-- MODULE 3 : Pack 149 € + facturation auto
-- =============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspendu boolean NOT NULL DEFAULT false;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS relance_etape smallint NOT NULL DEFAULT 0;

UPDATE public.company_settings SET tarif_abonnement_defaut = 149 WHERE tarif_abonnement_defaut = 125;
ALTER TABLE public.company_settings ALTER COLUMN tarif_abonnement_defaut SET DEFAULT 149;
UPDATE public.profiles SET pack_montant = 149 WHERE pack_montant = 99 OR pack_montant = 125;
