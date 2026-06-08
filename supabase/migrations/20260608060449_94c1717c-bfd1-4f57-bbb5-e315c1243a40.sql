SELECT cron.unschedule('generate-alertes-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-alertes-hourly'
);

SELECT cron.unschedule('generate-monthly-packs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-packs'
);

SELECT cron.schedule(
  'generate-alertes-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url => current_setting('app.supabase_url') || '/functions/v1/generate-alertes',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body => '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'generate-monthly-packs',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url => current_setting('app.supabase_url') || '/functions/v1/generate-monthly-packs',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body => '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'cloture-trimestres',
  '0 23 * * *',
  $$
  SELECT public.compute_objectif_trimestre()
  WHERE EXTRACT(MONTH FROM CURRENT_DATE) IN (3, 6, 9, 12)
    AND CURRENT_DATE = (
      DATE_TRUNC('month', CURRENT_DATE)
      + INTERVAL '1 month'
      - INTERVAL '1 day'
    )::date;
  $$
);