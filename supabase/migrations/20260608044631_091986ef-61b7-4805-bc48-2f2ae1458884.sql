
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_naissance date,
  ADD COLUMN IF NOT EXISTS adresse_rue text,
  ADD COLUMN IF NOT EXISTS adresse_cp text,
  ADD COLUMN IF NOT EXISTS adresse_ville text,
  ADD COLUMN IF NOT EXISTS statut_juridique text,
  ADD COLUMN IF NOT EXISTS rsac_numero text,
  ADD COLUMN IF NOT EXISTS rsac_greffe text,
  ADD COLUMN IF NOT EXISTS rsac_date_immat date,
  ADD COLUMN IF NOT EXISTS rsac_justificatif_path text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS zone_prioritaire text,
  ADD COLUMN IF NOT EXISTS pack_accepte boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_accepte_at timestamptz,
  ADD COLUMN IF NOT EXISTS zone_acceptee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prescripteurs_acceptes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Storage policies: chaque utilisateur gère ses fichiers dans son dossier {uid}/...
CREATE POLICY "Mandataires gèrent leurs justificatifs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'mandataire-documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'mandataire-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Super admins accèdent à tous les justificatifs mandataires"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'mandataire-documents' AND public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'mandataire-documents' AND public.has_role(auth.uid(), 'super_admin'));
