
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS validation_directeur_requise boolean NOT NULL DEFAULT false;

-- Trigger pour basculer validation_directeur_requise selon le score
CREATE OR REPLACE FUNCTION public.set_validation_directeur_requise()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.validation_directeur_requise := COALESCE(NEW.score_qualification, 0) >= 6;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validation_directeur ON public.dossiers;
CREATE TRIGGER trg_validation_directeur
  BEFORE INSERT OR UPDATE OF score_qualification ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_validation_directeur_requise();

-- Table devis
CREATE TABLE IF NOT EXISTS public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  numero text,
  date_emission timestamp with time zone NOT NULL DEFAULT now(),
  montant_ht numeric NOT NULL DEFAULT 0,
  remise_pack numeric NOT NULL DEFAULT 0,
  tva_taux numeric NOT NULL DEFAULT 20,
  montant_ttc numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'brouillon',
  contenu jsonb NOT NULL DEFAULT '{}'::jsonb,
  pack_actif boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage devis"
  ON public.devis FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Mandataires manage own devis"
  ON public.devis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dossiers d
                  WHERE d.id = devis.dossier_id AND d.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dossiers d
                       WHERE d.id = devis.dossier_id AND d.mandataire_id = auth.uid()));

CREATE POLICY "Analystes read devis"
  ON public.devis FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'analyste'::app_role));

CREATE POLICY "Anon read devis envoyes via token"
  ON public.devis FOR SELECT TO anon
  USING (statut IN ('envoye','accepte','refuse')
         AND dossier_has_active_token(dossier_id));

CREATE TRIGGER trg_devis_updated
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_devis_dossier ON public.devis(dossier_id);
