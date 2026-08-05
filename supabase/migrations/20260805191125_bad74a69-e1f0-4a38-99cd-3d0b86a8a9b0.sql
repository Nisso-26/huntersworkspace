DROP POLICY IF EXISTS "Authenticated can read partenaires" ON public.partenaires;

CREATE POLICY "Partenaires readable by creator, assigned or admin"
ON public.partenaires
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1
    FROM public.partenaire_dossiers pd
    JOIN public.dossiers d ON d.id = pd.dossier_id
    WHERE pd.partenaire_id = partenaires.id
      AND d.mandataire_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Mandataires can view reseau evenements" ON public.evenements;

CREATE OR REPLACE FUNCTION public.get_evenements_reseau()
RETURNS TABLE (
  id uuid,
  titre text,
  type text,
  date_debut timestamptz,
  date_fin timestamptz,
  lieu text,
  mandataire_id uuid,
  is_reseau boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.titre, e.type, e.date_debut, e.date_fin, e.lieu,
         e.mandataire_id, e.is_reseau, e.created_at, e.updated_at
  FROM public.evenements e
  WHERE e.is_reseau = true
    AND auth.uid() IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_evenements_reseau() TO authenticated;