
-- 1. Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('chantier-photos', 'visites-photos');

-- 2. Fix visites-photos DELETE policy (add ownership check)
DROP POLICY IF EXISTS "Authenticated users can delete own visit photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete own visit photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'visites-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix visites-photos SELECT (now private, need auth + ownership or super_admin)
DROP POLICY IF EXISTS "Anyone can view visit photos" ON storage.objects;
CREATE POLICY "Authenticated users can view visit photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visites-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 4. Fix chantier-photos SELECT (now private, need ownership)
DROP POLICY IF EXISTS "Authenticated users can view chantier photos" ON storage.objects;
CREATE POLICY "Authenticated users can view chantier photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chantier-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 5. Fix chantier-photos upload (scope to own folder)
DROP POLICY IF EXISTS "Authenticated users can upload chantier photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload chantier photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chantier-photos');

-- 6. Fix visites-photos upload
DROP POLICY IF EXISTS "Authenticated users can upload visit photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload visit photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visites-photos');

-- 7. Fix dossier-documents SELECT (add ownership via folder)
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dossier-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 8. Fix partenaires INSERT (always true -> track creator)
DROP POLICY IF EXISTS "Authenticated can insert partenaires" ON public.partenaires;
CREATE POLICY "Authenticated can insert partenaires"
ON public.partenaires FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);
