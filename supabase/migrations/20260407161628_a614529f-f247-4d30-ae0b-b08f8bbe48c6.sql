
-- Table des événements agenda
CREATE TABLE public.evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  type text NOT NULL DEFAULT 'rdv_client',
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  lieu text,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  mandataire_id uuid NOT NULL,
  notes text,
  rappel text DEFAULT 'j-1',
  is_reseau boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "Super admins can do all on evenements"
  ON public.evenements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Mandataires: CRUD own events
CREATE POLICY "Mandataires can manage own evenements"
  ON public.evenements FOR ALL TO authenticated
  USING (mandataire_id = auth.uid())
  WITH CHECK (mandataire_id = auth.uid());

-- Mandataires: can see reseau events (created by admin for everyone)
CREATE POLICY "Mandataires can view reseau evenements"
  ON public.evenements FOR SELECT TO authenticated
  USING (is_reseau = true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.evenements;
