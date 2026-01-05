ALTER TABLE work_schedules
  DROP CONSTRAINT IF EXISTS work_schedules_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'work_schedules_status_check'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE work_schedules
    ADD CONSTRAINT work_schedules_status_check
  CHECK (status IN (
    'planned',
    'synced',
    'split_modified',
    'split_created',
    'converted'
  ));
  END IF;
END
$$;