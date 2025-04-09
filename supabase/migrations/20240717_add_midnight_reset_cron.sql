-- Function to reset all view counts to zero
CREATE OR REPLACE FUNCTION reset_all_view_counts()
RETURNS void AS $$
BEGIN
  -- Update all rows in pet_uploads table, setting view_count to 0
  UPDATE pet_uploads SET view_count = 0;
  
  -- Log the reset (optional, helps with debugging)
  RAISE NOTICE 'All view counts reset to zero at %', now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run at midnight CEST (which is 22:00 UTC)
-- Format: minute hour day month weekday
SELECT cron.schedule(
  'midnight-view-count-reset',   -- unique job name
  '0 22 * * *',                  -- cron schedule (22:00 UTC daily)
  'SELECT reset_all_view_counts()'  -- SQL command to execute
);

-- Comment explaining the schedule
COMMENT ON FUNCTION reset_all_view_counts() IS 'Resets all pet view counts to zero, scheduled to run at midnight CEST (22:00 UTC) daily';

-- Log initial setup
DO $$
BEGIN
  RAISE NOTICE 'View count reset scheduled for midnight CEST (22:00 UTC) daily';
END $$; 