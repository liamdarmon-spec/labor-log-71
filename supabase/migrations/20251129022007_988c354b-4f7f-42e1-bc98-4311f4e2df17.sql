-- ============================
-- CANONICAL BUDGETING MODEL
-- ============================

-- ============================
-- 1) PROJECT BUDGET HEADER - Add missing columns
-- ============================

-- Add missing columns to existing project_budgets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='name') THEN
    ALTER TABLE public.project_budgets ADD COLUMN name text NOT NULL DEFAULT 'Main Budget';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='status') THEN
    ALTER TABLE public.project_budgets ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='default_markup_pct') THEN
    ALTER TABLE public.project_budgets ADD COLUMN default_markup_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='default_tax_pct') THEN
    ALTER TABLE public.project_budgets ADD COLUMN default_tax_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='notes') THEN
    ALTER TABLE public.project_budgets ADD COLUMN notes text;
  END IF;
END;
$$;

-- Add status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budgets_status_check'
  ) THEN
    ALTER TABLE public.project_budgets
      ADD CONSTRAINT project_budgets_status_check
      CHECK (status IN ('draft','active','archived'));
  END IF;
END;
$$;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_budgets_set_timestamp ON public.project_budgets;
CREATE TRIGGER trg_project_budgets_set_timestamp
BEFORE UPDATE ON public.project_budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- ============================
-- 2) PROJECT BUDGET GROUPS (SECTIONS)
-- ============================

CREATE TABLE IF NOT EXISTS public.project_budget_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_budget_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_groups_project_budget_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_groups
      ADD CONSTRAINT project_budget_groups_project_budget_id_fkey
      FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_budget_groups_set_timestamp ON public.project_budget_groups;
CREATE TRIGGER trg_project_budget_groups_set_timestamp
BEFORE UPDATE ON public.project_budget_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- ============================
-- 3) PROJECT BUDGET LINES - Add missing columns
-- ============================

-- Add missing columns to existing project_budget_lines table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='project_budget_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN project_budget_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='group_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN group_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='scope_type') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN scope_type text NOT NULL DEFAULT 'base';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='line_type') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN line_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='description_internal') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN description_internal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='description_client') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN description_client text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='qty') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN qty numeric NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='unit') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN unit text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='unit_cost') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN unit_cost numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='markup_pct') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN markup_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='tax_pct') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN tax_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='allowance_cap') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN allowance_cap numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='is_optional') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN is_optional boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='client_visible') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN client_visible boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='sort_order') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='internal_notes') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN internal_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='change_order_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN change_order_id uuid;
  END IF;
END;
$$;

-- Add FKs for new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_project_budget_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_project_budget_id_fkey
      FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_group_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.project_budget_groups(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- scope_type + line_type checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_scope_type_check'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_scope_type_check
      CHECK (scope_type IN ('base','change_order','allowance','option'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_line_type_check'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_line_type_check
      CHECK (line_type IS NULL OR line_type IN ('labor','subs','materials','other'));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_budget_lines_set_timestamp ON public.project_budget_lines;
CREATE TRIGGER trg_project_budget_lines_set_timestamp
BEFORE UPDATE ON public.project_budget_lines
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- Helpful indexes for budget lookups
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_project_budget_lines_project_budget 
  ON public.project_budget_lines (project_budget_id, group_id, sort_order);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_project_budget_lines_project_costcode 
  ON public.project_budget_lines (project_budget_id, cost_code_id);