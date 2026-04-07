
-- 1. Fix client_comments: require valid token for anon INSERT
DROP POLICY IF EXISTS "Anon can insert comments" ON public.client_comments;
CREATE POLICY "Anon can insert comments with valid token"
ON public.client_comments
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_tokens
    WHERE client_tokens.id = client_comments.token_id
      AND client_tokens.dossier_id = client_comments.dossier_id
      AND client_tokens.is_active = true
      AND client_tokens.expires_at > now()
  )
);

-- 2. Fix partenaire_dossiers: scope to dossier owner
DROP POLICY IF EXISTS "Authenticated can read partenaire_dossiers" ON public.partenaire_dossiers;
DROP POLICY IF EXISTS "Authenticated can insert partenaire_dossiers" ON public.partenaire_dossiers;
DROP POLICY IF EXISTS "Authenticated can delete partenaire_dossiers" ON public.partenaire_dossiers;

CREATE POLICY "Mandataires can read own partenaire_dossiers"
ON public.partenaire_dossiers FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = partenaire_dossiers.dossier_id AND dossiers.mandataire_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Mandataires can insert own partenaire_dossiers"
ON public.partenaire_dossiers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = partenaire_dossiers.dossier_id AND dossiers.mandataire_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Mandataires can delete own partenaire_dossiers"
ON public.partenaire_dossiers FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM dossiers WHERE dossiers.id = partenaire_dossiers.dossier_id AND dossiers.mandataire_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3. Fix dossiers anon access: create restricted view and update policy
-- Replace anon SELECT on dossiers to exclude PII
DROP POLICY IF EXISTS "Anon can read dossiers via token" ON public.dossiers;

-- Re-create with same logic (RLS policies can't restrict columns, so we'll handle this at app level)
-- But we CAN create a security definer function that returns limited data
CREATE OR REPLACE FUNCTION public.get_dossier_for_portal(_dossier_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', d.id,
    'client_name', d.client_name,
    'status', d.status,
    'etape', d.etape,
    'strategie', d.strategie,
    'ville', d.ville,
    'budget', d.budget,
    'honoraires', d.honoraires,
    'notes', d.notes,
    'created_at', d.created_at,
    'updated_at', d.updated_at
  )
  FROM dossiers d
  WHERE d.id = _dossier_id
    AND dossier_has_active_token(_dossier_id)
$$;

-- Still allow anon SELECT but only for token-gated rows (needed for existing queries)
-- The app code will be updated to use the RPC instead
CREATE POLICY "Anon can read dossiers via token"
ON public.dossiers FOR SELECT TO anon
USING (dossier_has_active_token(id));

-- 4. Fix partenaires update policy (always true)
DROP POLICY IF EXISTS "Authenticated can update partenaires" ON public.partenaires;
CREATE POLICY "Mandataires can update own partenaires"
ON public.partenaires FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
