
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a simple keepalive cron job that runs every 6 days
SELECT cron.schedule(
  'keepalive-ping',
  '0 12 */6 * *',
  $$SELECT 1;$$
);
