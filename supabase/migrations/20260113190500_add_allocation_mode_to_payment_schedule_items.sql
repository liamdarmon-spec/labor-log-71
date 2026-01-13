-- ============================================================================
-- ADD allocation_mode TO payment_schedule_items (canonical)
-- ============================================================================
-- Root cause of runtime error:
-- - Frontend writes `allocation_mode` to public.payment_schedule_items
-- - PostgREST schema cache doesn't include the column because it doesn't exist
--   in this DB (or cache wasn't reloaded).
-- - Error: "Could not find the 'allocation_mode' column of 'payment_schedule_items' in the schema cache"
--
-- This migration is intentionally small and idempotent so it can be applied
-- safely to any environment (including ones that haven't received the larger
-- schedule-recalc migration yet).
-- ============================================================================

BEGIN;

-- 1) Add column (idempotent)
ALTER TABLE public.payment_schedule_items
  ADD COLUMN IF NOT EXISTS allocation_mode text;

-- 2) Default (choose 'percentage' to match current UX default)
ALTER TABLE public.payment_schedule_items
  ALTER COLUMN allocation_mode SET DEFAULT 'percentage';

-- 3) Backfill existing rows
UPDATE public.payment_schedule_items
SET allocation_mode = CASE
  WHEN fixed_amount IS NOT NULL THEN 'fixed'
  WHEN percent_of_contract IS NOT NULL THEN 'percentage'
  ELSE 'percentage'
END
WHERE allocation_mode IS NULL;

-- 4) CHECK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payment_schedule_items'::regclass
      AND conname = 'payment_schedule_items_allocation_mode_check'
  ) THEN
    ALTER TABLE public.payment_schedule_items
      ADD CONSTRAINT payment_schedule_items_allocation_mode_check
      CHECK (allocation_mode IN ('fixed','percentage','remaining'));
  END IF;
END $$;

-- 5) Best-effort PostgREST schema cache refresh
DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;


