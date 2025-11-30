DO $$
DECLARE
  v_unassigned_id uuid;
BEGIN
  -- 1) Find or create UNASSIGNED cost code
  SELECT id INTO v_unassigned_id
  FROM public.cost_codes
  WHERE code = 'UNASSIGNED';

  IF v_unassigned_id IS NULL THEN
    INSERT INTO public.cost_codes (id, code, name, category, created_at)
    VALUES (
      gen_random_uuid(),
      'UNASSIGNED',
      'Unassigned / Misc',
      'other',
      now()
    )
    RETURNING id INTO v_unassigned_id;
  END IF;

  -- 2) Backfill NULL cost_code_id in all relevant tables

  UPDATE public.scope_block_cost_items
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  UPDATE public.estimate_items
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  UPDATE public.project_budget_lines
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  UPDATE public.time_logs
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  UPDATE public.daily_logs
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  UPDATE public.costs
  SET cost_code_id = v_unassigned_id
  WHERE cost_code_id IS NULL;

  -- 3) Enforce NOT NULL on cost_code_id

  ALTER TABLE public.scope_block_cost_items
    ALTER COLUMN cost_code_id SET NOT NULL;

  ALTER TABLE public.estimate_items
    ALTER COLUMN cost_code_id SET NOT NULL;

  ALTER TABLE public.project_budget_lines
    ALTER COLUMN cost_code_id SET NOT NULL;

  ALTER TABLE public.time_logs
    ALTER COLUMN cost_code_id SET NOT NULL;

  ALTER TABLE public.daily_logs
    ALTER COLUMN cost_code_id SET NOT NULL;

  ALTER TABLE public.costs
    ALTER COLUMN cost_code_id SET NOT NULL;

END;
$$;