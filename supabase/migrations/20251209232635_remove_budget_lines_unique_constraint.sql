-- Remove unique constraint on project_budget_lines (project_id, cost_code_id)
-- This allows multiple estimates to contribute to the same cost code in a budget
-- The constraint was preventing merge sync functionality

DO $$
BEGIN
  -- Drop the constraint if it exists (check both possible names)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_project_cost_code_unique'
  ) THEN
    ALTER TABLE public.project_budget_lines
      DROP CONSTRAINT project_budget_lines_project_cost_code_unique;
  END IF;

  -- Also check for alternative constraint name
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_project_id_cost_code_id_key'
  ) THEN
    ALTER TABLE public.project_budget_lines
      DROP CONSTRAINT project_budget_lines_project_id_cost_code_id_key;
  END IF;
END;
$$;

-- Add a comment explaining the change
COMMENT ON TABLE public.project_budget_lines IS 
  'Budget lines can have multiple entries per (project_id, cost_code_id) to support multiple estimates contributing to the same cost code. Lines are aggregated by cost_code_id in queries.';
