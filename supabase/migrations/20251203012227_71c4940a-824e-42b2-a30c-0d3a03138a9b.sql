-- estimates.project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estimates_project_id_fkey'
  ) THEN
    ALTER TABLE public.estimates
    ADD CONSTRAINT estimates_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

-- project_budgets.project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_budgets_project_id_fkey'
  ) THEN
    ALTER TABLE public.project_budgets
    ADD CONSTRAINT project_budgets_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

-- project_budget_lines.project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_budget_lines_project_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

-- project_budget_lines.project_budget_id → project_budgets.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_budget_lines_budget_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_budget_id_fkey
      FOREIGN KEY (project_budget_id)
      REFERENCES public.project_budgets(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END$$;