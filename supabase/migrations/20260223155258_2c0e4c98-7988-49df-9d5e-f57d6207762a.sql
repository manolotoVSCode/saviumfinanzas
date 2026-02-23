
-- Create keep-alive table
CREATE TABLE IF NOT EXISTS public.keepalive_pings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pinged_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed by cron (postgres role)
ALTER TABLE public.keepalive_pings ENABLE ROW LEVEL SECURITY;

-- Remove old cron job
SELECT cron.unschedule('keepalive-ping');

-- New cron: every 3 days, insert a ping and delete old ones
SELECT cron.schedule(
  'keepalive-write-ping',
  '0 12 */3 * *',
  $$
    INSERT INTO public.keepalive_pings (pinged_at) VALUES (now());
    DELETE FROM public.keepalive_pings WHERE pinged_at < now() - interval '6 days';
  $$
);
