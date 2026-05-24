
-- =============================================
-- 1. CLIENT_TOKENS — remove anon direct access
-- =============================================
DROP POLICY IF EXISTS "Anon can read active tokens" ON public.client_tokens;
DROP POLICY IF EXISTS "Anon can mark token viewed" ON public.client_tokens;

-- Secure RPC to validate a token (caller must supply the token value)
CREATE OR REPLACE FUNCTION public.get_portal_token(_token text)
RETURNS TABLE (
  id uuid,
  dossier_id uuid,
  client_name text,
  client_email text,
  expires_at timestamptz,
  is_active boolean,
  last_viewed_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, dossier_id, client_name, client_email, expires_at, is_active, last_viewed_at
  FROM public.client_tokens
  WHERE token = _token
    AND is_active = true
    AND expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_portal_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_token(text) TO anon, authenticated;

-- Secure RPC to mark a token viewed (caller must supply the token value)
CREATE OR REPLACE FUNCTION public.mark_portal_token_viewed(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.client_tokens
  SET last_viewed_at = now()
  WHERE token = _token
    AND is_active = true
    AND expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.mark_portal_token_viewed(text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_portal_token_viewed(text) TO anon, authenticated;

-- =============================================
-- 2. STORAGE — enforce ownership on INSERT
-- =============================================

-- dossier-documents : path is `${user_id}/${dossier_id}/${filename}`
DROP POLICY IF EXISTS "Authenticated can upload dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Mandataires can upload dossier documents" ON storage.objects;

CREATE POLICY "Users can upload own dossier documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dossier-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- chantier-photos : path is `${chantier_id}/${filename}` — verify caller owns the chantier
DROP POLICY IF EXISTS "Authenticated can upload chantier photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chantier photos" ON storage.objects;
DROP POLICY IF EXISTS "Mandataires can upload chantier photos" ON storage.objects;

CREATE POLICY "Mandataires can upload own chantier photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chantier-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.chantiers c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.mandataire_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);
