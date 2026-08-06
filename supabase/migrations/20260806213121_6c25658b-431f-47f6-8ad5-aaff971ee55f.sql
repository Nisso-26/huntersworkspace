ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS email_statut text NOT NULL DEFAULT 'non_envoye',
  ADD COLUMN IF NOT EXISTS email_destinataire text,
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_erreur text;

ALTER TABLE public.documents_generes
  ADD COLUMN IF NOT EXISTS email_statut text NOT NULL DEFAULT 'non_envoye',
  ADD COLUMN IF NOT EXISTS email_destinataire text,
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_erreur text;

ALTER TABLE public.documents_generiques
  ADD COLUMN IF NOT EXISTS email_statut text NOT NULL DEFAULT 'non_envoye',
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_erreur text;

CREATE TABLE IF NOT EXISTS public.envois_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  chantier_id uuid REFERENCES public.chantiers(id) ON DELETE SET NULL,
  contexte text NOT NULL,
  document_nom text NOT NULL,
  destinataire text,
  email_statut text NOT NULL DEFAULT 'non_envoye',
  email_envoye_at timestamptz,
  email_erreur text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.envois_documents TO authenticated;
GRANT ALL ON public.envois_documents TO service_role;

ALTER TABLE public.envois_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envois_documents_select" ON public.envois_documents
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "envois_documents_insert" ON public.envois_documents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "envois_documents_update" ON public.envois_documents
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "envois_documents_delete" ON public.envois_documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_envois_documents_updated_at
  BEFORE UPDATE ON public.envois_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_envois_documents_dossier ON public.envois_documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_envois_documents_chantier ON public.envois_documents(chantier_id);