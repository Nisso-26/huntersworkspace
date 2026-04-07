
-- Table for client portal tokens
CREATE TABLE public.client_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_name text NOT NULL,
  client_email text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.client_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on client_tokens" ON public.client_tokens
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires can manage own client_tokens" ON public.client_tokens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = client_tokens.dossier_id AND dossiers.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = client_tokens.dossier_id AND dossiers.mandataire_id = auth.uid()));

-- Client comments on their portal
CREATE TABLE public.client_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES public.client_tokens(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

-- Anon users can insert comments via token (validated in app)
CREATE POLICY "Anon can insert comments" ON public.client_comments
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can read comments" ON public.client_comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = client_comments.dossier_id AND dossiers.mandataire_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin')
  );

-- Signature requests (Yousign prep)
CREATE TABLE public.signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'mandat_recherche',
  document_name text NOT NULL,
  status text NOT NULL DEFAULT 'brouillon',
  yousign_id text,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signed_at timestamp with time zone,
  signed_document_path text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on signature_requests" ON public.signature_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires can manage own signature_requests" ON public.signature_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = signature_requests.dossier_id AND dossiers.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = signature_requests.dossier_id AND dossiers.mandataire_id = auth.uid()));
