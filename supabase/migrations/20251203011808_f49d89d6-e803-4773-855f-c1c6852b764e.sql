-- Remove duplicate auto-assign trigger (same function)
DROP TRIGGER IF EXISTS auto_assign_labor_cost_code_trigger ON public.daily_logs;

-- Remove extra schedule sync trigger so only the conditional BEFORE trigger remains
DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON public.daily_logs;