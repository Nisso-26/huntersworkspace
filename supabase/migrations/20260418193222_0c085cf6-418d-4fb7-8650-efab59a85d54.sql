-- Restreint la lecture publique aux fichiers logo-*
DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
CREATE POLICY "Public read company logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-assets'
    AND name LIKE 'logo-%'
  );