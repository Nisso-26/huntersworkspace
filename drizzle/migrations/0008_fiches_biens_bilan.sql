ALTER TABLE public.fiches_biens
  ADD COLUMN IF NOT EXISTS hypotheses jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bilan jsonb,
  ADD COLUMN IF NOT EXISTS criteres_eval jsonb NOT NULL DEFAULT '{}'::jsonb;