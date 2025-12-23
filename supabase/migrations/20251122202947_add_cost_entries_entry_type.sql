-- Add missing column needed by idx_cost_entries_type
DO $$
BEGIN
  IF to_regclass('public.cost_entries') IS NOT NULL THEN
    -- safest default: text, nullable
    EXECUTE 'ALTER TABLE public.cost_entries ADD COLUMN IF NOT EXISTS entry_type text';
  END IF;
END $$;
