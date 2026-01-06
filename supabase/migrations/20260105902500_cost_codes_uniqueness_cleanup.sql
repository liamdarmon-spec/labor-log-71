-- ============================================================================
-- db: enforce cost code uniqueness (cleanup)
-- ============================================================================
-- Removes legacy/extra uniqueness constraints so the canonical set is:
-- - cost_codes_company_id_code_key   UNIQUE(company_id, code)
-- - cost_codes_trade_id_category_key UNIQUE(trade_id, category)
-- ============================================================================

BEGIN;

ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_company_code_key;
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_company_trade_id_category_key;
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_company_trade_category_key;

-- Ensure canonical constraints exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cost_codes'::regclass AND conname = 'cost_codes_company_id_code_key'
  ) THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_company_id_code_key UNIQUE (company_id, code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cost_codes'::regclass AND conname = 'cost_codes_trade_id_category_key'
  ) THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_trade_id_category_key UNIQUE (trade_id, category);
  END IF;
END $$;

COMMIT;


