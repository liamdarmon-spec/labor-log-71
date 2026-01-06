-- ============================================================================
-- db: enforce cost code uniqueness
-- ============================================================================
-- Ensures:
-- - UNIQUE (company_id, code) on public.cost_codes  -> cost_codes_company_id_code_key
-- - UNIQUE (trade_id, category) on public.cost_codes -> cost_codes_trade_id_category_key
-- Drops duplicate/legacy indexes that overlap these constraints.
-- Migration will FAIL with a clear error if duplicates exist.
-- ============================================================================

BEGIN;

-- 1) Fail fast if duplicates exist for (company_id, code)
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT company_id, code
    FROM public.cost_codes
    GROUP BY 1,2
    HAVING COUNT(*) > 1
  ) d;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Duplicate cost_codes found for (company_id, code). Resolve duplicates before applying uniqueness constraints.';
  END IF;
END $$;

-- 2) Fail fast if duplicates exist for (trade_id, category) where trade_id is not null
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT trade_id, category
    FROM public.cost_codes
    WHERE trade_id IS NOT NULL
    GROUP BY 1,2
    HAVING COUNT(*) > 1
  ) d;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Duplicate cost_codes found for (trade_id, category). Resolve duplicates before applying uniqueness constraints.';
  END IF;
END $$;

-- 3) Drop legacy/duplicate indexes if they exist
-- NOTE: Older migrations created overlapping unique indexes with different names.
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_company_code_key;
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_company_trade_category_key;
DROP INDEX IF EXISTS public.cost_codes_company_trade_id_category_key;

-- Also drop non-unique duplicates if present (safe no-op)
DROP INDEX IF EXISTS public.idx_cost_codes_company_code;

-- 4) Create canonical unique constraints with required names
ALTER TABLE public.cost_codes
  ADD CONSTRAINT cost_codes_company_id_code_key UNIQUE (company_id, code);

ALTER TABLE public.cost_codes
  ADD CONSTRAINT cost_codes_trade_id_category_key UNIQUE (trade_id, category);

COMMIT;


