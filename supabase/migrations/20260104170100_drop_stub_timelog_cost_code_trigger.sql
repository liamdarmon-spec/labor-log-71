-- Ensure the old no-op/stub trigger can never come back
drop trigger if exists trigger_timelog_auto_assign_cost_code on public.time_logs;
