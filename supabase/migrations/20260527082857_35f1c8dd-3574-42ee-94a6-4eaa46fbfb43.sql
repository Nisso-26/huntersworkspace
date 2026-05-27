-- Pack mensuel : 149€ HT par défaut
ALTER TABLE public.company_settings ALTER COLUMN tarif_abonnement_defaut SET DEFAULT 149;
UPDATE public.company_settings SET tarif_abonnement_defaut = 149 WHERE tarif_abonnement_defaut = 125 OR tarif_abonnement_defaut IS NULL;

ALTER TABLE public.profiles ALTER COLUMN pack_montant SET DEFAULT 149;
UPDATE public.profiles SET pack_montant = 149 WHERE pack_montant = 99 OR pack_montant = 125 OR pack_montant IS NULL;

-- Période d'essai supprimée
UPDATE public.company_settings SET periode_essai_jours = 0 WHERE periode_essai_jours > 0;

-- Grille commissions N1/N2 par service
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS commission_conseil_n1   numeric DEFAULT 30,
  ADD COLUMN IF NOT EXISTS commission_conseil_n2   numeric DEFAULT 40,
  ADD COLUMN IF NOT EXISTS commission_chasse_n1    numeric DEFAULT 55,
  ADD COLUMN IF NOT EXISTS commission_chasse_n2    numeric DEFAULT 60,
  ADD COLUMN IF NOT EXISTS commission_amo_n1       numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS commission_amo_n2       numeric DEFAULT 25,
  ADD COLUMN IF NOT EXISTS commission_deco_n1      numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS commission_deco_n2      numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS seuil_passage_n2        numeric DEFAULT 100000;

UPDATE public.company_settings SET
  commission_conseil_n1 = 30, commission_conseil_n2 = 40,
  commission_chasse_n1  = 55, commission_chasse_n2  = 60,
  commission_amo_n1     = 20, commission_amo_n2     = 25,
  commission_deco_n1    = 15, commission_deco_n2    = 20,
  seuil_passage_n2      = 100000;