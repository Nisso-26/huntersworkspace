CREATE OR REPLACE FUNCTION public.notify_super_admins_expert_dossier(
  _dossier_id uuid,
  _client_name text,
  _score integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
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
$$;