
-- Helper function to check if a dossier has a valid client token
CREATE OR REPLACE FUNCTION public.dossier_has_active_token(_dossier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_tokens
    WHERE dossier_id = _dossier_id
      AND is_active = true
      AND expires_at > now()
  )
$$;

-- Anon can read client_tokens (to validate their own token)
CREATE POLICY "Anon can read active tokens" ON public.client_tokens
  FOR SELECT TO anon USING (is_active = true AND expires_at > now());

-- Anon can read dossiers linked to active tokens
CREATE POLICY "Anon can read dossiers via token" ON public.dossiers
  FOR SELECT TO anon USING (dossier_has_active_token(id));

-- Anon can read biens linked to token dossiers
CREATE POLICY "Anon can read biens via token" ON public.biens
  FOR SELECT TO anon USING (dossier_id IS NOT NULL AND dossier_has_active_token(dossier_id));

-- Anon can read chantiers linked to token biens
CREATE POLICY "Anon can read chantiers via token" ON public.chantiers
  FOR SELECT TO anon USING (
    bien_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM biens WHERE biens.id = chantiers.bien_id AND biens.dossier_id IS NOT NULL AND dossier_has_active_token(biens.dossier_id)
    )
  );

-- Anon can read lots via token chantiers
CREATE POLICY "Anon can read lots via token" ON public.lots_travaux
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM chantiers c JOIN biens b ON b.id = c.bien_id
      WHERE c.id = lots_travaux.chantier_id AND b.dossier_id IS NOT NULL AND dossier_has_active_token(b.dossier_id)
    )
  );

-- Anon can read documents via token
CREATE POLICY "Anon can read documents via token" ON public.documents
  FOR SELECT TO anon USING (dossier_has_active_token(dossier_id));

-- Anon can read evenements via token
CREATE POLICY "Anon can read evenements via token" ON public.evenements
  FOR SELECT TO anon USING (dossier_id IS NOT NULL AND dossier_has_active_token(dossier_id));
