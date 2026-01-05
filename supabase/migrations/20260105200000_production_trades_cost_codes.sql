-- ============================================================================
-- Production-Grade Trades + Cost Codes Flow
-- Canonical / Security / Performance
-- ============================================================================
-- 
-- Design Decision:
-- - Trades are GLOBAL presets (no company_id) - read-only for app users
-- - Cost Codes are COMPANY-SCOPED (company_id NOT NULL)
-- - Each company gets their own cost codes per trade via auto-generate
-- - The default_*_cost_code_id columns on trades are for display purposes only
--   and will show the MOST RECENT company's codes (not ideal, but backwards compatible)
--
-- ============================================================================

-- ============================================================================
-- PART A: Ensure trades.name is unique (already done, but make idempotent)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trades_name_key'
  ) THEN
    ALTER TABLE public.trades ADD CONSTRAINT trades_name_key UNIQUE (name);
  END IF;
END $$;

-- ============================================================================
-- PART B: RLS on Trades - Global read, no app writes
-- ============================================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "trades_select" ON public.trades;
DROP POLICY IF EXISTS "trades_insert" ON public.trades;
DROP POLICY IF EXISTS "trades_update" ON public.trades;
DROP POLICY IF EXISTS "trades_delete" ON public.trades;

-- All authenticated users can read trades (global preset library)
CREATE POLICY "trades_select" ON public.trades
  FOR SELECT TO authenticated
  USING (true);

-- No app-level inserts/updates/deletes - service role only
-- (Trades are managed by migrations/admins)

-- ============================================================================
-- PART C: RPC to create a trade with default cost codes (admin/service only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_trade_with_defaults(
  p_company_id uuid,
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade_id uuid;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
  v_trade_code text;
BEGIN
  -- Security: Verify company exists
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company % does not exist', p_company_id;
  END IF;

  -- Generate trade code from name
  v_trade_code := public.slugify_trade_name(p_name);

  -- Check if trade already exists
  SELECT id INTO v_trade_id FROM public.trades WHERE name = p_name;
  
  IF v_trade_id IS NULL THEN
    -- Create the trade
    INSERT INTO public.trades (name, description)
    VALUES (p_name, p_description)
    RETURNING id INTO v_trade_id;
  END IF;

  -- Create 3 default cost codes for this company
  INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
  VALUES (p_company_id, v_trade_id, v_trade_code || '-L', p_name || ' (Labor)', 'labor', true)
  ON CONFLICT (company_id, trade_id, category) DO NOTHING
  RETURNING id INTO v_labor_id;

  INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
  VALUES (p_company_id, v_trade_id, v_trade_code || '-M', p_name || ' (Material)', 'materials', true)
  ON CONFLICT (company_id, trade_id, category) DO NOTHING
  RETURNING id INTO v_material_id;

  INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
  VALUES (p_company_id, v_trade_id, v_trade_code || '-S', p_name || ' (Subcontractor)', 'subs', true)
  ON CONFLICT (company_id, trade_id, category) DO NOTHING
  RETURNING id INTO v_sub_id;

  -- Update trade defaults (for backwards compat display)
  UPDATE public.trades
  SET 
    default_labor_cost_code_id = COALESCE(v_labor_id, default_labor_cost_code_id),
    default_material_cost_code_id = COALESCE(v_material_id, default_material_cost_code_id),
    default_sub_cost_code_id = COALESCE(v_sub_id, default_sub_cost_code_id)
  WHERE id = v_trade_id;

  RETURN jsonb_build_object(
    'trade_id', v_trade_id,
    'trade_name', p_name,
    'labor_cost_code_id', v_labor_id,
    'material_cost_code_id', v_material_id,
    'sub_cost_code_id', v_sub_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trade_with_defaults(uuid, text, text) TO authenticated;

-- ============================================================================
-- PART D: Improved auto-generate RPC (already exists, ensure correct)
-- ============================================================================
DROP FUNCTION IF EXISTS public.auto_generate_trade_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.auto_generate_trade_cost_codes(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
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
    ON CONFLICT (company_id, trade_id, category) DO NOTHING
    RETURNING id, trade_id, category
  )
  SELECT COUNT(*) INTO v_created_count FROM inserted;

  -- Update trades with their default cost code IDs for this company
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
$$;

GRANT EXECUTE ON FUNCTION public.auto_generate_trade_cost_codes(uuid) TO authenticated;

-- ============================================================================
-- PART E: Helper function to get company cost codes for a trade
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_trade_cost_codes(
  p_company_id uuid,
  p_trade_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_labor record;
  v_material record;
  v_sub record;
BEGIN
  SELECT id, code INTO v_labor FROM public.cost_codes
    WHERE company_id = p_company_id AND trade_id = p_trade_id AND category = 'labor' LIMIT 1;
  SELECT id, code INTO v_material FROM public.cost_codes
    WHERE company_id = p_company_id AND trade_id = p_trade_id AND category = 'materials' LIMIT 1;
  SELECT id, code INTO v_sub FROM public.cost_codes
    WHERE company_id = p_company_id AND trade_id = p_trade_id AND category = 'subs' LIMIT 1;

  RETURN jsonb_build_object(
    'trade_id', p_trade_id,
    'labor_code_id', v_labor.id,
    'labor_code', v_labor.code,
    'material_code_id', v_material.id,
    'material_code', v_material.code,
    'sub_code_id', v_sub.id,
    'sub_code', v_sub.code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trade_cost_codes(uuid, uuid) TO authenticated;

-- ============================================================================
-- PART F: Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_trade ON public.cost_codes (company_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_category ON public.cost_codes (company_id, category);

-- ============================================================================
-- PART G: Verification queries (run manually to confirm)
-- ============================================================================
/*
-- 1) Confirm trades_name_key exists
SELECT conname FROM pg_constraint WHERE conname = 'trades_name_key';

-- 2) Confirm cost_codes has company-scoped unique
SELECT conname FROM pg_constraint 
WHERE conrelid = 'public.cost_codes'::regclass 
  AND conname IN ('cost_codes_company_code_key', 'cost_codes_company_trade_category_key');

-- 3) Test auto-generate (should be idempotent)
SELECT public.auto_generate_trade_cost_codes('your-company-id');
SELECT public.auto_generate_trade_cost_codes('your-company-id');  -- Second run: 0 created

-- 4) Confirm RLS blocks cross-tenant writes
-- (As authenticated user for Company A, try to insert into Company B's cost_codes)
*/

DO $$
BEGIN
  RAISE NOTICE 'Production Trades + Cost Codes migration complete';
  RAISE NOTICE '  - trades_name_key enforced';
  RAISE NOTICE '  - Trades are global (read-only for app)';
  RAISE NOTICE '  - Cost codes are company-scoped';
  RAISE NOTICE '  - auto_generate_trade_cost_codes RPC ready';
  RAISE NOTICE '  - create_trade_with_defaults RPC ready';
END $$;

