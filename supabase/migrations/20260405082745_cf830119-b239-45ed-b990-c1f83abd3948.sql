
-- Create biens table
CREATE TABLE public.biens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL,
  type text NOT NULL DEFAULT 'appartement',
  adresse text,
  ville text,
  code_postal text,
  surface numeric DEFAULT 0,
  prix_acquisition numeric DEFAULT 0,
  frais_notaire numeric DEFAULT 0,
  budget_travaux numeric DEFAULT 0,
  loyer_mensuel_cible numeric DEFAULT 0,
  regime_fiscal text DEFAULT 'nu',
  statut text NOT NULL DEFAULT 'en_recherche',
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  mandataire_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.biens ENABLE ROW LEVEL SECURITY;

-- RLS: mandataires see own biens
CREATE POLICY "Mandataires can view own biens"
ON public.biens FOR SELECT TO authenticated
USING (mandataire_id = auth.uid());

CREATE POLICY "Mandataires can insert own biens"
ON public.biens FOR INSERT TO authenticated
WITH CHECK (mandataire_id = auth.uid());

CREATE POLICY "Mandataires can update own biens"
ON public.biens FOR UPDATE TO authenticated
USING (mandataire_id = auth.uid())
WITH CHECK (mandataire_id = auth.uid());

CREATE POLICY "Mandataires can delete own biens"
ON public.biens FOR DELETE TO authenticated
USING (mandataire_id = auth.uid());

-- RLS: super admins full access
CREATE POLICY "Super admins can do all on biens"
ON public.biens FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Sequence for auto-generating references
CREATE SEQUENCE IF NOT EXISTS biens_ref_seq START 1;
