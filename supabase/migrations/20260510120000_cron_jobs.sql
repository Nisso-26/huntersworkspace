-- Activation de pg_cron (déjà disponible sur Supabase)
-- Ces jobs appellent les Edge Functions automatiquement

-- 1. Génération des alertes : toutes les heures
SELECT cron.schedule(
  'generate-alertes-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-alertes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Génération des packs mensuels : le 1er de chaque mois à 8h00
SELECT cron.schedule(
  'generate-monthly-packs',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-monthly-packs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
