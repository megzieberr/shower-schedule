-- ============================================================
--  Shower Schedule — the two timed jobs (schedules)
--
--  A "schedule" here = a job the database runs by itself at a set time.
--  These call the send-push Edge Function, which sends the notifications.
--
--  RUN THIS ONLY AFTER you have:
--    1. deployed the send-push Edge Function, and
--    2. set its secrets (including CRON_SECRET).
--
--  BEFORE running, replace the two placeholders below:
--    <PROJECT_REF>  -> your project ref (Project Settings -> General -> Reference ID)
--    <CRON_SECRET>  -> the EXACT same value you set as the CRON_SECRET secret
--
--  pg_cron runs on UTC. SA time is UTC+2 with no daylight saving, so:
--    17:00 SA = 15:00 UTC   ->  '0 15 * * *'
--    17:00-23:00 SA hourly  ->  '0 15-21 * * *'
-- ============================================================

-- Make sure the scheduling tools exist (also doable on the Extensions page).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old copies first so this file is safe to re-run.
do $$ begin perform cron.unschedule('shower-daily-reminder'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('shower-hourly-ping');    exception when others then null; end $$;

-- Daily "pick your time" reminder at 17:00 SA.
select cron.schedule(
  'shower-daily-reminder',
  '0 15 * * *',
  $job$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('type', 'daily')
  );
  $job$
);

-- "It's your shower time now" at the top of each hour, 17:00-23:00 SA.
select cron.schedule(
  'shower-hourly-ping',
  '0 15-21 * * *',
  $job$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('type', 'hourly')
  );
  $job$
);

-- To check the jobs were created, run:   select jobname, schedule from cron.job;
