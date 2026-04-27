-- 1) Recréer le trigger de création automatique de profil + rôle au signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2) Restreindre EXECUTE des fonctions SECURITY DEFINER sensibles
-- has_role et get_user_role : usage interne aux policies, pas besoin d'être appelable par anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- handle_new_user : trigger function uniquement
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- dossier_has_active_token / get_dossier_for_portal : utilisés par anon (espace client) -> on garde
-- mais on bloque les appels authenticated sur le portail anon helper
GRANT EXECUTE ON FUNCTION public.dossier_has_active_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dossier_for_portal(uuid) TO anon, authenticated;

-- 3) Activer pg_cron + pg_net pour la facturation mensuelle
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;