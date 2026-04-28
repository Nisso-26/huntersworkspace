-- Auto-promotion du tout premier utilisateur en super_admin
-- Sécurité : ne s'applique que si AUCUN super_admin n'existe encore.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_count int;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  -- Si aucun super_admin n'existe encore, promouvoir ce premier utilisateur.
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'super_admin';

  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mandataire');
  END IF;

  RETURN NEW;
END;
$function$;

-- Vérifier que le trigger sur auth.users existe (re-création idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();