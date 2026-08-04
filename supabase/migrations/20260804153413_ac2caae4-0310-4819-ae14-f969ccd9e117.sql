DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('verify-db-functions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verify-db-functions');

SELECT cron.schedule(
  'verify-db-functions',
  '0 7 * * *',
  $cron$
  SELECT extensions.net.http_post(
    url := 'https://project--f5497ed2-ab98-41ba-bc2f-13bee16cc0b5.lovable.app/api/public/health/db-functions',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_3UgO3VKAodQuN-WTRxPR7A_jPSZ9fPQ"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $cron$
);