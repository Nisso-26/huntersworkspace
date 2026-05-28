
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS remise_pack_pct numeric DEFAULT 10;

UPDATE public.company_settings
  SET remise_pack_pct = COALESCE(remise_pack_pct, 10)
  WHERE remise_pack_pct IS NULL;

ALTER TABLE public.company_settings
  ALTER COLUMN tarif_abonnement_defaut SET DEFAULT 149;

UPDATE public.company_settings
  SET tarif_abonnement_defaut = 149
  WHERE tarif_abonnement_defaut IS NULL OR tarif_abonnement_defaut <= 125;

UPDATE public.company_settings
  SET periode_essai_jours = 0
  WHERE periode_essai_jours > 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='pack_montant'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN pack_montant SET DEFAULT 149';
    EXECUTE 'UPDATE public.profiles SET pack_montant = 149 WHERE pack_montant IS NULL OR pack_montant < 149';
  END IF;
END $$;
