
CREATE POLICY "Super admins can delete dossiers" ON public.dossiers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Mandataires can delete own dossiers" ON public.dossiers FOR DELETE TO authenticated USING (mandataire_id = auth.uid());
