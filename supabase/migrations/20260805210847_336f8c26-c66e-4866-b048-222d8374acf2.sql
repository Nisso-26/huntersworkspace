CREATE POLICY "Ressources readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ressources-documents');

CREATE POLICY "Ressources manageable by super admin"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'ressources-documents' AND public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'ressources-documents' AND public.has_role(auth.uid(), 'super_admin'));