
INSERT INTO storage.buckets (id, name, public) VALUES ('chantier-photos', 'chantier-photos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload chantier photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chantier-photos');
CREATE POLICY "Authenticated users can view chantier photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chantier-photos');
CREATE POLICY "Users can delete own chantier photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chantier-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
