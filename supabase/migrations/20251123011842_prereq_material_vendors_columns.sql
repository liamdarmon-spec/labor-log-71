-- Prereq patch for 20251123011843_c336977a-7025-4323-be14-b31f980b56c5.sql
-- Ensure columns exist when material_vendors table already exists with a smaller shape.
-- Columns-only (no indexes/constraints/triggers/views).

DO $$
BEGIN
  IF to_regclass('public.material_vendors') IS NOT NULL THEN
    ALTER TABLE public.material_vendors
      ADD COLUMN IF NOT EXISTS name text,
      ADD COLUMN IF NOT EXISTS company_name text,
      ADD COLUMN IF NOT EXISTS trade_id uuid,
      ADD COLUMN IF NOT EXISTS default_cost_code_id uuid,
      ADD COLUMN IF NOT EXISTS phone text,
      ADD COLUMN IF NOT EXISTS email text,
      ADD COLUMN IF NOT EXISTS active boolean,
      ADD COLUMN IF NOT EXISTS notes text;
  END IF;
END $$;



