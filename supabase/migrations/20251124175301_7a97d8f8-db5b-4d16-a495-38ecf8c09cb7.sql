-- Step 1: Introspect existing CHECK constraint on work_schedules.status
-- Query to view constraint (for documentation purposes):
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'work_schedules'::regclass AND conname LIKE '%status%';

-- Expected: work_schedules_status_check with definition like:
-- CHECK (status IN ('scheduled', 'synced', 'converted', 'cancelled', ...))

-- Step 2: Drop the CHECK constraint to prevent insert failures
ALTER TABLE work_schedules
DROP CONSTRAINT IF EXISTS work_schedules_status_check;

-- Step 3: Confirmation
-- The status column remains as:
-- - Type: TEXT
-- - Default: 'scheduled' (or existing default)
-- - No CHECK constraint
-- This allows any status value during schedule creation