
-- =============================================
-- TABLE: prospects (CRM pipeline léger)
-- =============================================
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  source TEXT DEFAULT 'autre',
  budget_estime NUMERIC DEFAULT 0,
  objectif TEXT,
  notes TEXT,
  mandataire_id UUID,
  statut TEXT NOT NULL DEFAULT 'contact_entrant',
  motif_perte TEXT,
  dossier_id UUID REFERENCES public.dossiers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on prospects" ON public.prospects FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can manage own prospects" ON public.prospects FOR ALL TO authenticated USING (mandataire_id = auth.uid()) WITH CHECK (mandataire_id = auth.uid());

-- =============================================
-- TABLE: partenaires (prescripteurs)
-- =============================================
CREATE TABLE public.partenaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  societe TEXT,
  specialite TEXT NOT NULL DEFAULT 'notaire',
  ville TEXT,
  telephone TEXT,
  email TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on partenaires" ON public.partenaires FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated can read partenaires" ON public.partenaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert partenaires" ON public.partenaires FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update partenaires" ON public.partenaires FOR UPDATE TO authenticated USING (true);

-- Junction table partenaire <-> dossier
CREATE TABLE public.partenaire_dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partenaire_id UUID NOT NULL REFERENCES public.partenaires(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  role_dans_dossier TEXT DEFAULT 'notaire',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partenaire_id, dossier_id)
);

ALTER TABLE public.partenaire_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on partenaire_dossiers" ON public.partenaire_dossiers FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated can read partenaire_dossiers" ON public.partenaire_dossiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert partenaire_dossiers" ON public.partenaire_dossiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete partenaire_dossiers" ON public.partenaire_dossiers FOR DELETE TO authenticated USING (true);

-- =============================================
-- TABLE: conversations (messagerie interne)
-- =============================================
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mandataire_id UUID NOT NULL,
  sujet TEXT NOT NULL DEFAULT 'Conversation',
  dossier_id UUID REFERENCES public.dossiers(id),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on conversations" ON public.conversations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can manage own conversations" ON public.conversations FOR ALL TO authenticated USING (mandataire_id = auth.uid()) WITH CHECK (mandataire_id = auth.uid());

-- =============================================
-- TABLE: messages (messagerie interne)
-- =============================================
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on messages" ON public.messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can view own conversation messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.mandataire_id = auth.uid()));
CREATE POLICY "Mandataires can insert own conversation messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.mandataire_id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
