-- Activation pg_cron pour les jobs automatiques
-- Note: pg_cron doit être activé dans Supabase Dashboard > Database > Extensions

-- Supprimer les anciens jobs si existants
SELECT cron.unschedule('generate-alertes-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-alertes-hourly'
);
SELECT cron.unschedule('generate-monthly-packs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-packs'
);

-- Job 1: Génération alertes toutes les heures
SELECT cron.schedule(
  'generate-alertes-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_config WHERE key = 'supabase_functions_url') || '/generate-alertes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_config WHERE key = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: Génération packs mensuels le 1er du mois à 8h
SELECT cron.schedule(
  'generate-monthly-packs',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_config WHERE key = 'supabase_functions_url') || '/generate-monthly-packs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_config WHERE key = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
