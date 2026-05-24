ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS score_qualification integer,
  ADD COLUMN IF NOT EXISTS niveau_qualification text,
  ADD COLUMN IF NOT EXISTS tarif_conseil_ht numeric;