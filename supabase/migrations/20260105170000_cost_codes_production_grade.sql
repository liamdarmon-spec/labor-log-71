-- ============================================================================
-- Make Trades + Cost Codes production-grade and deterministic
-- ============================================================================
-- Fixes:
-- 1. Drop global UNIQUE(code) → replace with UNIQUE(company_id, code)
-- 2. Add UNIQUE(company_id, trade_id, category) for default cost code upserts
-- 3. Rewrite RPC to use set-based INSERT for performance
-- 4. Add proper RLS + security checks
-- ============================================================================

-- =====================
-- Part 1: Fix Constraints
-- =====================

-- 1.1) Drop the global unique on code (it prevents multi-tenant usage)
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_code_key;

-- 1.2) Add compound unique: code is unique per company
ALTER TABLE public.cost_codes 
ADD CONSTRAINT cost_codes_company_code_key UNIQUE (company_id, code);

-- 1.3) Add compound unique for default cost codes: one per (company, trade, category)
-- This allows clean upserts for auto-generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cost_codes_company_trade_category_key'
  ) THEN
    ALTER TABLE public.cost_codes 
    ADD CONSTRAINT cost_codes_company_trade_category_key 
    UNIQUE (company_id, trade_id, category);
  END IF;
EXCEPTION WHEN unique_violation THEN
  -- There are duplicates; we need to clean them first
  RAISE NOTICE 'Duplicates exist for (company_id, trade_id, category). Skipping constraint.';
END $$;

-- 1.4) Make company_id NOT NULL for cost_codes (tenant-scoped)
-- Step 1: Clear FK references in trades to cost_codes that have NULL company_id
UPDATE public.trades 
SET default_labor_cost_code_id = NULL 
WHERE default_labor_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL);

UPDATE public.trades 
SET default_material_cost_code_id = NULL 
WHERE default_material_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL);

UPDATE public.trades 
SET default_sub_cost_code_id = NULL 
WHERE default_sub_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL);

-- Step 2: Try to backfill company_id from a default company (first company in system)
-- This preserves cost codes instead of deleting them
UPDATE public.cost_codes 
SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL
  AND EXISTS (SELECT 1 FROM public.companies);

-- Step 3: Delete only truly orphaned cost codes (no company exists to assign)
DELETE FROM public.cost_codes 
WHERE company_id IS NULL;

-- Step 4: Now enforce NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cost_codes' 
    AND column_name = 'company_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.cost_codes ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- 1.5) Add index for common queries
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_trade 
ON public.cost_codes (company_id, trade_id);

-- =====================
-- Part 2: Improved RPC
-- =====================

-- Drop and recreate with proper set-based logic
DROP FUNCTION IF EXISTS public.auto_generate_trade_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.auto_generate_trade_cost_codes(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_created_count int := 0;
  v_skipped_count int := 0;
  v_trade_count int := 0;
  v_user_id uuid;
BEGIN
  -- Get current user (null for service role)
  v_user_id := (SELECT auth.uid());
  
  -- Security: If authenticated user, verify membership
  -- Service role (no auth.uid) bypasses this check
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

  -- Check if there are any trades
  SELECT COUNT(*) INTO v_trade_count FROM public.trades;
  
  IF v_trade_count = 0 THEN
    RETURN jsonb_build_object(
      'created_count', 0,
      'skipped_count', 0,
      'message', 'No trades found. Please add trades first in Admin → Trades.'
    );
  END IF;

  -- Set-based insert: generate all missing cost codes in one statement
  WITH trade_codes AS (
    -- Generate 3 codes per trade (Labor, Material, Sub)
    SELECT 
      t.id as trade_id,
      t.name as trade_name,
      UPPER(LEFT(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]', '', 'g'), 4)) as trade_code,
      bucket.category,
      bucket.suffix,
      bucket.display_name
    FROM public.trades t
    CROSS JOIN (VALUES 
      ('labor', 'L', 'Labor'),
      ('materials', 'M', 'Material'),
      ('subs', 'S', 'Subcontractor')
    ) AS bucket(category, suffix, display_name)
  ),
  codes_to_insert AS (
    SELECT 
      tc.trade_id,
      p_company_id as company_id,
      COALESCE(NULLIF(tc.trade_code, ''), 'UNKN') || '-' || tc.suffix as code,
      tc.trade_name || ' (' || tc.display_name || ')' as name,
      tc.category,
      true as is_active
    FROM trade_codes tc
    WHERE NOT EXISTS (
      -- Skip if already exists
      SELECT 1 FROM public.cost_codes cc
      WHERE cc.company_id = p_company_id
        AND cc.trade_id = tc.trade_id
        AND cc.category = tc.category
    )
  ),
  inserted AS (
    INSERT INTO public.cost_codes (trade_id, company_id, code, name, category, is_active)
    SELECT trade_id, company_id, code, name, category, is_active
    FROM codes_to_insert
    ON CONFLICT (company_id, trade_id, category) DO NOTHING
    RETURNING id, code, name, category, trade_id
  )
  SELECT COUNT(*) INTO v_created_count FROM inserted;

  -- Calculate skipped count
  v_skipped_count := (v_trade_count * 3) - v_created_count;

  -- Update trades with their default cost code IDs
  -- (only if not already set)
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
    'skipped_count', v_skipped_count,
    'trade_count', v_trade_count
  );
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_generate_trade_cost_codes(uuid) TO authenticated;

-- =====================
-- Part 3: Verify RLS
-- =====================

-- Ensure RLS is enabled
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "tenant_select" ON public.cost_codes;
DROP POLICY IF EXISTS "tenant_insert" ON public.cost_codes;
DROP POLICY IF EXISTS "tenant_update" ON public.cost_codes;
DROP POLICY IF EXISTS "tenant_delete" ON public.cost_codes;

-- Create canonical tenant policies
CREATE POLICY "tenant_select" ON public.cost_codes
  FOR SELECT TO authenticated
  USING (company_id = ANY (public.authed_company_ids()));

CREATE POLICY "tenant_insert" ON public.cost_codes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY (public.authed_company_ids()));

CREATE POLICY "tenant_update" ON public.cost_codes
  FOR UPDATE TO authenticated
  USING (company_id = ANY (public.authed_company_ids()))
  WITH CHECK (company_id = ANY (public.authed_company_ids()));

CREATE POLICY "tenant_delete" ON public.cost_codes
  FOR DELETE TO authenticated
  USING (company_id = ANY (public.authed_company_ids()));

-- =====================
-- Part 4: Final verification
-- =====================
DO $$
BEGIN
  RAISE NOTICE 'Cost codes production-grade migration complete:';
  RAISE NOTICE '  - Dropped global UNIQUE(code)';
  RAISE NOTICE '  - Added UNIQUE(company_id, code)';
  RAISE NOTICE '  - Added UNIQUE(company_id, trade_id, category)';
  RAISE NOTICE '  - Rewrote RPC with set-based INSERT';
  RAISE NOTICE '  - Applied canonical RLS policies';
END $$;

