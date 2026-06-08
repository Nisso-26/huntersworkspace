
-- Drop overly permissive storage INSERT policies
DROP POLICY IF EXISTS "Authenticated users can upload chantier photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

-- Add UPDATE policy on visites-photos for consistency
DROP POLICY IF EXISTS "Users can update own visites photos" ON storage.objects;
CREATE POLICY "Users can update own visites photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'visites-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'visites-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Lock down notify_super_admins_expert_dossier
REVOKE EXECUTE ON FUNCTION public.notify_super_admins_expert_dossier(uuid, text, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.notify_super_admins_expert_dossier(_dossier_id uuid, _client_name text, _score integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_id uuid;
BEGIN
  -- Caller must own the dossier (mandataire) or be a super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.dossiers
      WHERE id = _dossier_id AND mandataire_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  FOR admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
  LOOP
    INSERT INTO public.alertes (user_id, dossier_id, type, title, detail)
    VALUES (
      admin_id,
      _dossier_id,
      'warning',
      'Dossier Expert — validation requise',
      'Le dossier de ' || _client_name || ' a un score de qualification de ' || _score || ' (niveau Expert).'
    );
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.notify_super_admins_expert_dossier(uuid, text, integer) TO authenticated;
