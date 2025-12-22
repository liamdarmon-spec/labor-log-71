-- CRITICAL FIX: Update daily_logs foreign key to reference work_schedules instead of deprecated scheduled_shifts

-- Step 1: Drop the old foreign key constraint
ALTER TABLE daily_logs 
DROP CONSTRAINT IF EXISTS daily_logs_schedule_id_fkey;

-- Step 2: Set any orphaned schedule_id values to NULL (referencing deleted scheduled_shifts)
UPDATE daily_logs 
SET schedule_id = NULL 
WHERE schedule_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM work_schedules WHERE id = daily_logs.schedule_id
);

-- Step 3: Add new foreign key constraint pointing to work_schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'daily_logs_schedule_id_fkey'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE daily_logs 
    ADD CONSTRAINT daily_logs_schedule_id_fkey 
FOREIGN KEY (schedule_id) 
REFERENCES work_schedules(id) 
ON DELETE SET NULL;
  END IF;
END
$$;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_schedule_id 
ON daily_logs(schedule_id) 
WHERE schedule_id IS NOT NULL;

COMMENT ON CONSTRAINT daily_logs_schedule_id_fkey ON daily_logs IS 
'Links time logs to work_schedules (the canonical labor schedule table)';

COMMENT ON COLUMN daily_logs.schedule_id IS 
'References work_schedules.id - links this time log to its originating schedule entry';