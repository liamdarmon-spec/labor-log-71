-- ============================================================================
-- db: canonicalize cost code categories
-- ============================================================================
-- Canonical category set: 'labor', 'material', 'sub' ONLY.
-- This migration:
-- - creates enum public.cost_code_category
-- - converts public.cost_codes.category to enum using strict mapping
-- - fails migration if unknown category values exist
-- - adds a DEFERRABLE constraint trigger on public.trades to ensure default_* FK
--   references match the expected category
-- ============================================================================

BEGIN;

-- 1) Create enum type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'cost_code_category'
  ) THEN
    CREATE TYPE public.cost_code_category AS ENUM ('labor','material','sub');
  END IF;
END $$;

-- 2) Add new enum column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cost_codes' AND column_name='category_new'
  ) THEN
    ALTER TABLE public.cost_codes ADD COLUMN category_new public.cost_code_category;
  END IF;
END $$;

-- 3) Backfill enum column using strict mapping (NO silent fallback)
UPDATE public.cost_codes
SET category_new = CASE
  -- labor
  WHEN upper(trim(category)) IN ('LABOR','L') THEN 'labor'::public.cost_code_category
  -- material
  WHEN upper(trim(category)) IN ('MATERIAL','MATERIALS','MAT','M') THEN 'material'::public.cost_code_category
  -- sub
  WHEN upper(trim(category)) IN ('SUB','SUBS','SUBCONTRACTOR','VENDOR','S') THEN 'sub'::public.cost_code_category
  ELSE NULL
END
WHERE category_new IS NULL;

-- 4) Fail if any unmapped categories remain
DO $$
DECLARE
  v_count int;
  v_values text;
BEGIN
  SELECT COUNT(*), string_agg(DISTINCT category, ', ' ORDER BY category)
  INTO v_count, v_values
  FROM public.cost_codes
  WHERE category_new IS NULL;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Unknown cost_codes.category values detected (%). Migration aborted; fix data first.', v_values;
  END IF;
END $$;

-- 5) Drop old check constraint if present (we now enforce via enum)
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_category_check;

-- 6) Swap columns: category(text) -> category(enum)
-- Drop dependent view(s) and indexes that reference cost_codes.category first,
-- then recreate them after the swap.
DROP VIEW IF EXISTS public.cost_code_actuals;
DROP INDEX IF EXISTS public.idx_cost_codes_company_category;
DROP INDEX IF EXISTS public.idx_cost_codes_category;
ALTER TABLE public.cost_codes DROP COLUMN IF EXISTS category;
ALTER TABLE public.cost_codes RENAME COLUMN category_new TO category;
ALTER TABLE public.cost_codes ALTER COLUMN category SET NOT NULL;

-- Recreate dependent view (definition from pg_get_viewdef)
CREATE VIEW public.cost_code_actuals AS
 SELECT cc.id AS cost_code_id,
    cc.code,
    cc.name AS cost_code_name,
    cc.category,
    tla.project_id,
    p.project_name,
    sum(tla.hours) AS actual_hours,
    sum((tla.hours * dc.pay_rate)) AS actual_cost,
    count(DISTINCT dc.worker_id) AS worker_count
   FROM public.cost_codes cc
     LEFT JOIN public.time_log_allocations tla ON (tla.cost_code_id = cc.id)
     LEFT JOIN public.day_cards dc ON (dc.id = tla.day_card_id)
     LEFT JOIN public.projects p ON (p.id = tla.project_id)
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;

-- 7) Constraint trigger to ensure trades default_* cost code categories match
-- NOTE: trades.default_*_cost_code_id columns exist in schema.

CREATE OR REPLACE FUNCTION public.trg_validate_trade_default_cost_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cat public.cost_code_category;
BEGIN
  -- labor default
  IF NEW.default_labor_cost_code_id IS NOT NULL THEN
    SELECT cc.category INTO v_cat
    FROM public.cost_codes cc
    WHERE cc.id = NEW.default_labor_cost_code_id;

    IF v_cat IS DISTINCT FROM 'labor'::public.cost_code_category THEN
      RAISE EXCEPTION 'trades.default_labor_cost_code_id must reference a cost code with category=labor';
    END IF;
  END IF;

  -- material default
  IF NEW.default_material_cost_code_id IS NOT NULL THEN
    SELECT cc.category INTO v_cat
    FROM public.cost_codes cc
    WHERE cc.id = NEW.default_material_cost_code_id;

    IF v_cat IS DISTINCT FROM 'material'::public.cost_code_category THEN
      RAISE EXCEPTION 'trades.default_material_cost_code_id must reference a cost code with category=material';
    END IF;
  END IF;

  -- sub default
  IF NEW.default_sub_cost_code_id IS NOT NULL THEN
    SELECT cc.category INTO v_cat
    FROM public.cost_codes cc
    WHERE cc.id = NEW.default_sub_cost_code_id;

    IF v_cat IS DISTINCT FROM 'sub'::public.cost_code_category THEN
      RAISE EXCEPTION 'trades.default_sub_cost_code_id must reference a cost code with category=sub';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_trade_default_cost_codes ON public.trades;

CREATE CONSTRAINT TRIGGER trg_validate_trade_default_cost_codes
AFTER INSERT OR UPDATE OF default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id
ON public.trades
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.trg_validate_trade_default_cost_codes();

COMMIT;


