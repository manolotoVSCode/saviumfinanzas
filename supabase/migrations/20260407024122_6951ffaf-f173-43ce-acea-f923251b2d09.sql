CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('keepalive-ping', 'keepalive-write-ping', 'keepalive-edge-ping');

SELECT cron.schedule(
  'keepalive-edge-ping',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://alexhdutnvlxwhziudnr.supabase.co/functions/v1/keepalive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZXhoZHV0bnZseHdoeml1ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTk4NjAsImV4cCI6MjA2MzA5NTg2MH0.5xENkTcPI7cQR3fPG8_zD05E8b0EbfCMtr0HAhmHhzI'
    ),
    body := jsonb_build_object(
      'source', 'cron',
      'triggered_at', now()
    )
  ) AS request_id;
  $$
);