-- Add missing columns required by downstream costs indexes & views
-- Columns-only, idempotent, safe for db:reset

DO $$
BEGIN
  IF to_regclass('public.costs') IS NOT NULL THEN
    ALTER TABLE public.costs
      ADD COLUMN IF NOT EXISTS vendor_id uuid,
      ADD COLUMN IF NOT EXISTS vendor_type text,
      ADD COLUMN IF NOT EXISTS status text,
      ADD COLUMN IF NOT EXISTS notes text;
  END IF;
END $$;
