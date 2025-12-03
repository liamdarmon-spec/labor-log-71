DO $$
DECLARE
  v_unassigned uuid;
BEGIN
  SELECT id INTO v_unassigned
  FROM public.cost_codes
  WHERE code = 'UNASSIGNED';

  IF v_unassigned IS NULL THEN
    RAISE EXCEPTION 'UNASSIGNED cost code does not exist. Run the UNASSIGNED creation migration first.';
  END IF;

  -- Backfill nulls
  UPDATE public.scope_block_cost_items SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;
  UPDATE public.estimate_items        SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;
  UPDATE public.project_budget_lines  SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;
  UPDATE public.time_logs             SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;
  UPDATE public.daily_logs            SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;
  UPDATE public.costs                 SET cost_code_id = v_unassigned WHERE cost_code_id IS NULL;

  -- Enforce NOT NULL
  ALTER TABLE public.scope_block_cost_items ALTER COLUMN cost_code_id SET NOT NULL;
  ALTER TABLE public.estimate_items        ALTER COLUMN cost_code_id SET NOT NULL;
  ALTER TABLE public.project_budget_lines  ALTER COLUMN cost_code_id SET NOT NULL;
  ALTER TABLE public.time_logs             ALTER COLUMN cost_code_id SET NOT NULL;
  ALTER TABLE public.daily_logs            ALTER COLUMN cost_code_id SET NOT NULL;
  ALTER TABLE public.costs                 ALTER COLUMN cost_code_id SET NOT NULL;
END;
$$;