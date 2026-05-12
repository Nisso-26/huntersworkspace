
CREATE TABLE public.activites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  auteur_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('appel','visite','email','offre','note')),
  commentaire text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activites_dossier ON public.activites(dossier_id, created_at DESC);

ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on activites"
  ON public.activites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires can view activites of own dossiers"
  ON public.activites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = activites.dossier_id AND d.mandataire_id = auth.uid()));

CREATE POLICY "Mandataires can insert activites on own dossiers"
  ON public.activites FOR INSERT TO authenticated
  WITH CHECK (
    auteur_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = activites.dossier_id AND d.mandataire_id = auth.uid())
  );

CREATE POLICY "Authors can update own activites"
  ON public.activites FOR UPDATE TO authenticated
  USING (auteur_id = auth.uid())
  WITH CHECK (auteur_id = auth.uid());

CREATE POLICY "Authors can delete own activites"
  ON public.activites FOR DELETE TO authenticated
  USING (auteur_id = auth.uid());
