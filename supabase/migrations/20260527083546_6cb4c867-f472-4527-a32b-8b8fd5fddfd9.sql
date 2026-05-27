ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS criteres_qualification jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.validations_dossiers
  ADD COLUMN IF NOT EXISTS score_client integer,
  ADD COLUMN IF NOT EXISTS tarif_conseil_calcule numeric;

-- Snapshot score & tarif au moment de la création de la validation
CREATE OR REPLACE FUNCTION public.snapshot_validation_from_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.score_client IS NULL OR NEW.tarif_conseil_calcule IS NULL THEN
    SELECT score_qualification, tarif_conseil_ht
      INTO NEW.score_client, NEW.tarif_conseil_calcule
    FROM public.dossiers WHERE id = NEW.dossier_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_validation ON public.validations_dossiers;
CREATE TRIGGER trg_snapshot_validation
  BEFORE INSERT ON public.validations_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_validation_from_dossier();