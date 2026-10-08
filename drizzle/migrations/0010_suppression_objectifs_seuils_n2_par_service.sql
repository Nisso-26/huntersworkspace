DROP FUNCTION IF EXISTS public.cloturer_trimestres_objectifs();
DROP FUNCTION IF EXISTS public.compute_objectif_trimestre();
DROP FUNCTION IF EXISTS public.compute_objectif_trimestre(uuid, integer, integer);
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS seuil_n2_conseil numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS seuil_n2_chasse numeric NOT NULL DEFAULT 40000,
  ADD COLUMN IF NOT EXISTS seuil_n2_amo numeric NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS seuil_n2_deco numeric NOT NULL DEFAULT 12000;
COMMENT ON TABLE public.objectifs_trimestriels IS 'DEPRECATED: objectifs mandataires supprimés, aucun objectif imposé';
COMMENT ON COLUMN public.company_settings.ca_objectif_n1_trimestre IS 'DEPRECATED: objectifs supprimés';
COMMENT ON COLUMN public.company_settings.ca_objectif_n2_trimestre IS 'DEPRECATED: objectifs supprimés';
COMMENT ON COLUMN public.company_settings.mandats_objectif_trimestre IS 'DEPRECATED: objectifs supprimés';
COMMENT ON COLUMN public.company_settings.conseils_objectif_mois IS 'DEPRECATED: objectifs supprimés';
COMMENT ON COLUMN public.company_settings.seuil_passage_n2 IS 'DEPRECATED: replaced by seuil_n2_conseil/chasse/amo/deco';
COMMENT ON COLUMN public.profiles.parrain_id IS 'DEPRECATED: parrainage supprimé';