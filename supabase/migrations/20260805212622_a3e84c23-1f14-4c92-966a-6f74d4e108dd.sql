CREATE POLICY "Authenticated can read signature files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated can upload signature files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Admins can manage signature files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'signatures' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete signature files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'signatures' AND public.has_role(auth.uid(), 'super_admin'));