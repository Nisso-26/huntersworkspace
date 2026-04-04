
-- Add new fields to profiles for mandataire enrichment
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niveau text DEFAULT 'N1';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parrain_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_entree date DEFAULT CURRENT_DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pack_status text DEFAULT 'actif';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pack_montant numeric DEFAULT 99;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban text;

-- Create commissions table
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mandataire_id uuid NOT NULL,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'commission',
  taux numeric NOT NULL DEFAULT 50,
  montant numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'due',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS: mandataires see own commissions
CREATE POLICY "Mandataires can view own commissions"
ON public.commissions FOR SELECT TO authenticated
USING (mandataire_id = auth.uid());

-- RLS: super admins full access
CREATE POLICY "Super admins can do all on commissions"
ON public.commissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to insert commissions
CREATE POLICY "Super admins can insert commissions"
ON public.commissions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
