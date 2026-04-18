-- Bucket public pour les logos entreprise (lecture publique, écriture super_admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique (pour affichage dans PDF / pages publiques)
DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
CREATE POLICY "Public read company-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Upload réservé aux super_admin
DROP POLICY IF EXISTS "Super admin upload company-assets" ON storage.objects;
CREATE POLICY "Super admin upload company-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin update company-assets" ON storage.objects;
CREATE POLICY "Super admin update company-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin delete company-assets" ON storage.objects;
CREATE POLICY "Super admin delete company-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'super_admin'));

-- Active les extensions nécessaires aux cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;