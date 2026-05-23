-- Allow analyste to view all dossiers and update them (for grille_*)
CREATE POLICY "Analystes can view all dossiers"
  ON public.dossiers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'analyste'));

CREATE POLICY "Analystes can update all dossiers"
  ON public.dossiers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'analyste'))
  WITH CHECK (public.has_role(auth.uid(), 'analyste'));