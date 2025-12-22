-- Drop existing constraints if they exist
ALTER TABLE public.costs DROP CONSTRAINT IF EXISTS costs_category_check;
ALTER TABLE public.project_budget_lines DROP CONSTRAINT IF EXISTS project_budget_lines_category_check;
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_category_check;

-- Costs: enforce only subs/materials/other
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'costs_category_check'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.costs
    ADD CONSTRAINT costs_category_check
CHECK (category IN ('subs', 'materials', 'other'));
  END IF;
END
$$;

-- Budget lines: enforce 4-way breakdown
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'project_budget_lines_category_check'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_category_check
CHECK (category IN ('labor', 'subs', 'materials', 'other'));
  END IF;
END
$$;

-- Cost codes: keep them aligned with the same 4 categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'cost_codes_category_check'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.cost_codes
    ADD CONSTRAINT cost_codes_category_check
CHECK (category IN ('labor', 'subs', 'materials', 'other'));
  END IF;
END
$$;