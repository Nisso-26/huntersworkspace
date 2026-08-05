-- FACTURES
CREATE POLICY "Mandataires can insert own factures"
ON public.factures FOR INSERT TO authenticated
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super admins can update factures"
ON public.factures FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- COMMISSIONS
CREATE POLICY "Mandataires can insert own commissions"
ON public.commissions FOR INSERT TO authenticated
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super admins can update commissions"
ON public.commissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ALERTES
CREATE POLICY "Users can insert relevant alertes"
ON public.alertes FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR user_id = auth.uid()
  OR user_id IS NULL
  OR (dossier_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.dossiers d
        WHERE d.id = dossier_id AND d.mandataire_id = auth.uid()
     ))
);

-- CONSEILS MENSUELS
CREATE POLICY "Mandataires insert own conseils_mensuels"
ON public.conseils_mensuels FOR INSERT TO authenticated
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires update own conseils_mensuels"
ON public.conseils_mensuels FOR UPDATE TO authenticated
USING (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));