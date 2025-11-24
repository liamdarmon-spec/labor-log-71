ALTER TABLE work_schedules
  DROP CONSTRAINT IF EXISTS work_schedules_status_check;

ALTER TABLE work_schedules
  ADD CONSTRAINT work_schedules_status_check
  CHECK (status IN (
    'planned',
    'synced',
    'split_modified',
    'split_created',
    'converted'
  ));