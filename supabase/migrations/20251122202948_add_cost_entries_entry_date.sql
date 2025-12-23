-- Add missing column needed by idx_cost_entries_date
DO $$
BEGIN
  IF to_regclass('public.cost_entries') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.cost_entries ADD COLUMN IF NOT EXISTS entry_date date';
  END IF;
END $$;
