ALTER TABLE public.fiches_biens
  ADD COLUMN IF NOT EXISTS type_bien text,
  ADD COLUMN IF NOT EXISTS recommandation text,
  ADD COLUMN IF NOT EXISTS prochaines_etapes jsonb,
  ADD COLUMN IF NOT EXISTS risques jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS token_public text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS envoyee_at timestamptz,
  ADD COLUMN IF NOT EXISTS derniere_consultation_at timestamptz;
ALTER TABLE public.fiches_biens ADD CONSTRAINT fiches_biens_type_bien_check
  CHECK (type_bien IS NULL OR type_bien IN ('appartement','maison','terrain','immeuble','local'));
CREATE UNIQUE INDEX IF NOT EXISTS fiches_biens_token_public_key ON public.fiches_biens(token_public) WHERE token_public IS NOT NULL;