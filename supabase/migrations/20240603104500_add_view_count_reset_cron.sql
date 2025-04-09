    -- Enable the pg_cron extension if not already enabled
    -- This might require database administrator privileges the first time it's run.
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Grant usage on the cron schema to the postgres role (or the role that needs to manage cron jobs)
    -- Supabase typically uses the 'postgres' role for administrative tasks.
    -- Adjust if your setup uses a different administrative role.
    GRANT USAGE ON SCHEMA cron TO postgres;

    -- Grant authenticated users SELECT permission on cron.job if they need to view jobs (Optional)
    -- GRANT SELECT ON cron.job TO authenticated;

    -- Schedule the daily reset job
    -- Cron format: minute hour day_of_month month day_of_week
    -- '0 23 * * *' means 23:00 UTC every day.
    -- This corresponds to 00:00 CET (UTC+1) during standard time.
    -- This corresponds to 01:00 CEST (UTC+2) during daylight saving time.
    SELECT cron.schedule(
      'reset_daily_pet_view_counts', -- Unique name for the job
      '0 23 * * *',                 -- Schedule: Run at 23:00 UTC daily
      $$
      UPDATE public.pet_uploads
      SET view_count = 0;
      $$
    );

    -- Example: How to unschedule the job later if needed
    -- Run this command manually in the SQL Editor if you want to remove the schedule:
    -- SELECT cron.unschedule('reset_daily_pet_view_counts');