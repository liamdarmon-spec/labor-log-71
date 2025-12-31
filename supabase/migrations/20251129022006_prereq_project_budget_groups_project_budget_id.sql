-- Prereq patch for 20251129022007_988c354b-4f7f-42e1-bc98-4311f4e2df17.sql
-- Columns-only: ensure project_budget_groups.project_budget_id exists before FK creation.

DO $$
BEGIN
  IF to_regclass('public.project_budget_groups') IS NOT NULL THEN
    ALTER TABLE public.project_budget_groups
      ADD COLUMN IF NOT EXISTS project_budget_id uuid;
  END IF;
END $$;



