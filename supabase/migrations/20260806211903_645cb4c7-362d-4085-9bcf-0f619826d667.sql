ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS email_statut text NOT NULL DEFAULT 'non_envoye',
  ADD COLUMN IF NOT EXISTS email_destinataire text,
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_erreur text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devis_email_statut_check'
  ) THEN
    ALTER TABLE public.devis
      ADD CONSTRAINT devis_email_statut_check
      CHECK (email_statut IN ('non_envoye','envoi_en_cours','envoye','echec'));
  END IF;
END $$;