-- Restrict the "signatures" storage bucket to the owning mandataire or super_admin.
DROP POLICY IF EXISTS "Authenticated can read signature files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload signature files" ON storage.objects;

CREATE POLICY "Owner or admin can read signature files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.signatures_electroniques s
      WHERE s.mandataire_id = auth.uid()
        AND (
          storage.objects.name LIKE s.id::text || '%'
          OR storage.objects.name LIKE '%' || s.token::text || '%'
          OR (s.dossier_id IS NOT NULL AND storage.objects.name LIKE s.dossier_id::text || '%')
        )
    )
  )
);

CREATE POLICY "Owner or admin can upload signature files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.signatures_electroniques s
      WHERE s.mandataire_id = auth.uid()
        AND (
          storage.objects.name LIKE s.id::text || '%'
          OR storage.objects.name LIKE '%' || s.token::text || '%'
          OR (s.dossier_id IS NOT NULL AND storage.objects.name LIKE s.dossier_id::text || '%')
        )
    )
  )
);