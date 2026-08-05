-- 1. visites-photos : restreindre l'INSERT au dossier de l'utilisateur ou au chantier possédé
DROP POLICY IF EXISTS "Authenticated users can upload visit photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload visit photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visites-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.chantiers c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.mandataire_id = auth.uid()
    )
  )
);

-- 2. dossier-documents : ajouter une policy UPDATE (absente)
DROP POLICY IF EXISTS "Users can update dossier documents" ON storage.objects;

CREATE POLICY "Users can update dossier documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'dossier-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.documents doc
      JOIN public.dossiers ds ON ds.id = doc.dossier_id
      WHERE doc.file_path = storage.objects.name
        AND ds.mandataire_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'dossier-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.documents doc
      JOIN public.dossiers ds ON ds.id = doc.dossier_id
      WHERE doc.file_path = storage.objects.name
        AND ds.mandataire_id = auth.uid()
    )
  )
);

-- 3. profiles : annuaire minimal (id + nom) des mandataires actifs, sans données sensibles
CREATE OR REPLACE FUNCTION public.get_mandataires_annuaire()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'mandataire'
  WHERE auth.uid() IS NOT NULL
    AND COALESCE(p.status, 'actif') <> 'résilie'
    AND COALESCE(p.suspendu, false) = false
$$;

REVOKE ALL ON FUNCTION public.get_mandataires_annuaire() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mandataires_annuaire() TO authenticated;