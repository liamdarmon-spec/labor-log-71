-- Fix: Update activity_log check constraint to allow work_schedule entity type
-- Also drop the trigger from work_schedules if it exists

-- First, drop any activity logging trigger from work_schedules
DROP TRIGGER IF EXISTS log_work_schedule_activity ON work_schedules;

-- Update the check constraint on activity_log to allow work_schedule
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;

-- Add a more permissive constraint or no constraint at all
-- (allowing any entity type for flexibility)
ALTER TABLE activity_log ADD CONSTRAINT activity_log_entity_type_check 
CHECK (entity_type IS NOT NULL AND length(entity_type) > 0);