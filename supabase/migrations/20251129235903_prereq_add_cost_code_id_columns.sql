-- Prereq: ensure cost_code_id exists on all tables referenced by the UNASSIGNED backfill DO block.
DO $$
BEGIN
  IF to_regclass('public.scope_block_cost_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.scope_block_cost_items ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;

  IF to_regclass('public.estimate_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;

  IF to_regclass('public.project_budget_lines') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;

  IF to_regclass('public.time_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;

  IF to_regclass('public.daily_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;

  IF to_regclass('public.costs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.costs ADD COLUMN IF NOT EXISTS cost_code_id uuid';
  END IF;
END $$;
