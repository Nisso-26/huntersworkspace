ALTER TABLE public.signatures_electroniques
  ADD COLUMN IF NOT EXISTS email_statut text NOT NULL DEFAULT 'envoi_en_cours',
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_erreur text;

ALTER TABLE public.signatures_electroniques
  DROP CONSTRAINT IF EXISTS signatures_electroniques_email_statut_check;

ALTER TABLE public.signatures_electroniques
  ADD CONSTRAINT signatures_electroniques_email_statut_check
  CHECK (email_statut IN ('envoi_en_cours','envoye','echec'));

UPDATE public.signatures_electroniques
SET email_statut = 'envoye', email_envoye_at = COALESCE(email_envoye_at, created_at)
WHERE email_statut = 'envoi_en_cours' AND created_at < now() - interval '5 minutes';