
-- Table: dossiers (client cases)
CREATE TABLE public.dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mandataire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','conseil','chasse','visite','offre','compromis','signe','cloture')),
  budget NUMERIC DEFAULT 0,
  ville TEXT,
  strategie TEXT,
  honoraires NUMERIC DEFAULT 0,
  etape INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: factures (invoices)
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mandataire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'abonnement' CHECK (type IN ('abonnement','commission','honoraires')),
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','payee','impayee','annulee')),
  date_emission TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_paiement TIMESTAMP WITH TIME ZONE,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: alertes (notifications/alerts)
CREATE TABLE public.alertes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('urgente','warning','info')),
  title TEXT NOT NULL,
  detail TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  target_date TIMESTAMP WITH TIME ZONE,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;

-- Dossiers RLS: super_admin sees all, mandataire sees own
CREATE POLICY "Super admins can do all on dossiers" ON public.dossiers FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Mandataires can view own dossiers" ON public.dossiers FOR SELECT TO authenticated USING (mandataire_id = auth.uid());
CREATE POLICY "Mandataires can insert own dossiers" ON public.dossiers FOR INSERT TO authenticated WITH CHECK (mandataire_id = auth.uid());
CREATE POLICY "Mandataires can update own dossiers" ON public.dossiers FOR UPDATE TO authenticated USING (mandataire_id = auth.uid()) WITH CHECK (mandataire_id = auth.uid());

-- Factures RLS: super_admin sees all, mandataire sees own
CREATE POLICY "Super admins can do all on factures" ON public.factures FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Mandataires can view own factures" ON public.factures FOR SELECT TO authenticated USING (mandataire_id = auth.uid());

-- Alertes RLS: super_admin sees all, user sees own
CREATE POLICY "Super admins can do all on alertes" ON public.alertes FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own alertes" ON public.alertes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own alertes" ON public.alertes FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime for dossiers and alertes
ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertes;
