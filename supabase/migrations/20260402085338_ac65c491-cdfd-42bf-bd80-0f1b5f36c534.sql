
-- Create storage bucket for dossier documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-documents', 'dossier-documents', false);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dossier-documents');

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dossier-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create documents metadata table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can do all on documents"
ON public.documents FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Mandataires can view documents on their dossiers
CREATE POLICY "Mandataires can view own dossier documents"
ON public.documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers
    WHERE dossiers.id = documents.dossier_id
    AND dossiers.mandataire_id = auth.uid()
  )
);

-- Mandataires can insert documents on their dossiers
CREATE POLICY "Mandataires can insert own dossier documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.dossiers
    WHERE dossiers.id = documents.dossier_id
    AND dossiers.mandataire_id = auth.uid()
  )
);

-- Mandataires can delete their own uploaded documents
CREATE POLICY "Mandataires can delete own documents"
ON public.documents FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());
