-- ============================================================================
-- FIX: Trades + Cost Codes Admin Flow (Production-Grade)
-- ============================================================================
-- PROBLEM: idx_cost_codes_trade_category_unique enforces UNIQUE(trade_id, category)
-- without company_id scoping. This means only ONE company can have a "labor" code
-- for a given trade - causing collisions for multi-tenant usage.
--
-- SOLUTION:
-- 1. Drop the problematic global unique index
-- 2. Keep the company-scoped unique constraints that already exist
-- 3. Fix the auto-generate RPC to use correct ON CONFLICT targets
-- 4. Make trades read-only for app (global presets), writeable only by service role
-- ============================================================================

-- =====================
-- Part 1: Drop the problematic index
-- =====================
DROP INDEX IF EXISTS public.idx_cost_codes_trade_category_unique;

-- Verify we still have the correct company-scoped constraints:
-- - cost_codes_company_code_key: UNIQUE(company_id, code)
-- - cost_codes_company_trade_category_key: UNIQUE(company_id, trade_id, category)

-- =====================
-- Part 2: Trades = Global Presets (Read-Only for App)
-- =====================
-- Trades table has NO company_id - they are shared presets across all tenants.
-- Only service role / migrations can create/modify trades.
-- App users can only READ trades.

-- Enable RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "trades_select" ON public.trades;
DROP POLICY IF EXISTS "trades_insert" ON public.trades;
DROP POLICY IF EXISTS "trades_update" ON public.trades;
DROP POLICY IF EXISTS "trades_delete" ON public.trades;
DROP POLICY IF EXISTS "Anyone can read trades" ON public.trades;

-- Trades are readable by all authenticated users
CREATE POLICY "trades_select" ON public.trades
  FOR SELECT TO authenticated
  USING (true);

-- Trades are NOT insertable/updatable/deletable by app users
-- (Service role bypasses RLS, so migrations and admin scripts can still modify)

-- =====================
-- Part 3: Cost Codes = Company-Scoped
-- =====================
-- Already have:
-- - company_id NOT NULL
-- - UNIQUE(company_id, code)
-- - UNIQUE(company_id, trade_id, category)
-- - tenant_* RLS policies

-- =====================
-- Part 4: Slugify Function for Deterministic Code Generation
-- =====================
CREATE OR REPLACE FUNCTION public.slugify_trade_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT UPPER(
    LEFT(
      REGEXP_REPLACE(
        REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]+', '', 'g'),
        '^(.{0,4}).*$',
        '\1'
      ),
      4
    )
  );
$$;

COMMENT ON FUNCTION public.slugify_trade_name(text) IS 
  'Convert trade name to deterministic 4-char uppercase slug for cost code generation';

-- =====================
-- Part 5: Improved Auto-Generate RPC
-- =====================
DROP FUNCTION IF EXISTS public.auto_generate_trade_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.auto_generate_trade_cost_codes(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid;
  v_trade_count int := 0;
  v_created_count int := 0;
BEGIN
  -- Get current user (null for service role)
  v_user_id := (SELECT auth.uid());
  
  -- Security: If authenticated user, verify membership
  IF v_user_id IS NOT NULL THEN
    IF NOT public.is_company_member(p_company_id) THEN
      RAISE EXCEPTION 'Access denied: not a member of company %', p_company_id;
    END IF;
  ELSE
    -- For service role, just verify company exists
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
      RAISE EXCEPTION 'Company % does not exist', p_company_id;
    END IF;
  END IF;

  -- Count trades
  SELECT COUNT(*) INTO v_trade_count FROM public.trades;
  
  IF v_trade_count = 0 THEN
    RETURN jsonb_build_object(
      'created_count', 0,
      'skipped_count', 0,
      'trade_count', 0,
      'message', 'No trades found. Trades are global presets - contact admin to add more.'
    );
  END IF;

  -- Set-based insert: Generate all missing cost codes in ONE statement
  -- Uses ON CONFLICT on the correct company-scoped constraint
  WITH codes_to_insert AS (
    SELECT 
      t.id as trade_id,
      p_company_id as company_id,
      public.slugify_trade_name(t.name) || '-' || bucket.suffix as code,
      t.name || ' (' || bucket.display_name || ')' as name,
      bucket.category,
      true as is_active
    FROM public.trades t
    CROSS JOIN (VALUES 
      ('labor', 'L', 'Labor'),
      ('materials', 'M', 'Material'),
      ('subs', 'S', 'Subcontractor')
    ) AS bucket(category, suffix, display_name)
    -- Only insert missing ones (LEFT JOIN pattern)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cost_codes cc
      WHERE cc.company_id = p_company_id
        AND cc.trade_id = t.id
        AND cc.category = bucket.category
    )
  ),
  inserted AS (
    INSERT INTO public.cost_codes (trade_id, company_id, code, name, category, is_active)
    SELECT trade_id, company_id, code, name, category, is_active
    FROM codes_to_insert
    -- Use the company-scoped constraint for ON CONFLICT
    ON CONFLICT (company_id, trade_id, category) DO NOTHING
    RETURNING id, trade_id, category
  )
  SELECT COUNT(*) INTO v_created_count FROM inserted;

  -- Update trades with their default cost code IDs for this company
  -- (only update if not already set - allows manual override)
  UPDATE public.trades t
  SET 
    default_labor_cost_code_id = COALESCE(t.default_labor_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc 
      WHERE cc.trade_id = t.id AND cc.company_id = p_company_id AND cc.category = 'labor'
      LIMIT 1
    )),
    default_material_cost_code_id = COALESCE(t.default_material_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc 
      WHERE cc.trade_id = t.id AND cc.company_id = p_company_id AND cc.category = 'materials'
      LIMIT 1
    )),
    default_sub_cost_code_id = COALESCE(t.default_sub_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc 
      WHERE cc.trade_id = t.id AND cc.company_id = p_company_id AND cc.category = 'subs'
      LIMIT 1
    ))
  WHERE EXISTS (
    SELECT 1 FROM public.cost_codes cc 
    WHERE cc.trade_id = t.id AND cc.company_id = p_company_id
  );

  RETURN jsonb_build_object(
    'created_count', v_created_count,
    'skipped_count', (v_trade_count * 3) - v_created_count,
    'trade_count', v_trade_count
  );
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_generate_trade_cost_codes(uuid) TO authenticated;

-- =====================
-- Part 6: Verification (run these manually to confirm)
-- =====================
/*
-- 1) Confirm problematic index is gone
SELECT indexname FROM pg_indexes 
WHERE tablename = 'cost_codes' AND indexname = 'idx_cost_codes_trade_category_unique';
-- Expected: 0 rows

-- 2) Confirm correct constraints exist
SELECT conname FROM pg_constraint 
WHERE conrelid = 'public.cost_codes'::regclass 
  AND conname IN ('cost_codes_company_code_key', 'cost_codes_company_trade_category_key');
-- Expected: 2 rows

-- 3) Test idempotency: Run generator twice, second run should create 0
-- First: SELECT public.auto_generate_trade_cost_codes('your-company-id');
-- Second: SELECT public.auto_generate_trade_cost_codes('your-company-id');
-- Second run should return created_count: 0

-- 4) Confirm trades are read-only for authenticated users
-- As authenticated user: INSERT INTO trades (name) VALUES ('Test'); -- Should fail
-- As service role: INSERT INTO trades (name) VALUES ('Test'); -- Should succeed
*/

DO $$
BEGIN
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Dropped idx_cost_codes_trade_category_unique (global unique)';
  RAISE NOTICE '  - Trades are now read-only for app (global presets)';
  RAISE NOTICE '  - Auto-generate RPC uses company-scoped ON CONFLICT';
  RAISE NOTICE '  - Cost codes properly scoped by (company_id, trade_id, category)';
END $$;

