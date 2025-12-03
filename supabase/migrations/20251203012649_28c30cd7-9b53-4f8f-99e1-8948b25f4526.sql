COMMENT ON TABLE public.daily_logs IS
  'LEGACY labor logging. New development should use work_schedules + time_logs + labor_pay_runs.';

COMMENT ON TABLE public.day_cards IS
  'LEGACY day-card system. Kept for historical data and migration only.';

COMMENT ON TABLE public.day_card_jobs IS
  'LEGACY day-card job allocation. See time_log_allocations + time_logs for new flows.';

COMMENT ON TABLE public.cost_entries IS
  'LEGACY cost entries synced from daily_logs. New AP/labor costs live in costs + time_logs.';

COMMENT ON TABLE public.payments IS
  'LEGACY labor payments table. Replaced by labor_pay_runs + labor_pay_run_items.';