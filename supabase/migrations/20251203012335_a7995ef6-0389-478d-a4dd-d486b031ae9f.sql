-- project_budget_lines.cost_code_id → cost_codes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_budget_lines_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines DROP CONSTRAINT IF EXISTS project_budget_lines_cost_code_id_fkey;
    ALTER TABLE public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'costs_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.costs DROP CONSTRAINT IF EXISTS costs_cost_code_id_fkey;
    ALTER TABLE public.costs
    ADD CONSTRAINT costs_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_logs_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.time_logs DROP CONSTRAINT IF EXISTS time_logs_cost_code_id_fkey;
    ALTER TABLE public.time_logs
    ADD CONSTRAINT time_logs_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scope_block_cost_items_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.scope_block_cost_items DROP CONSTRAINT IF EXISTS scope_block_cost_items_cost_code_id_fkey;
    ALTER TABLE public.scope_block_cost_items
    ADD CONSTRAINT scope_block_cost_items_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estimate_items_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.estimate_items DROP CONSTRAINT IF EXISTS estimate_items_cost_code_id_fkey;
    ALTER TABLE public.estimate_items
    ADD CONSTRAINT estimate_items_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;