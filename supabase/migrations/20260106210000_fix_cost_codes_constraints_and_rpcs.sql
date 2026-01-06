-- ============================================================================
-- Fix Cost Codes Constraints and RPCs for Trade Packs System
-- ============================================================================
-- 
-- PROBLEM:
-- - Unique constraint `cost_codes_company_trade_category_key` is on (company_id, trade_id, category)
-- - But the RPCs use `company_trade_id` column for trade packs
-- - This causes ON CONFLICT to fail silently or not match
--
-- FIX:
-- 1. Add proper unique constraint on (company_id, company_trade_id, category)
-- 2. Keep old constraint for backward compat but allow it to be null-safe
-- 3. Fix RPCs to use correct ON CONFLICT targets
-- 
-- CANONICAL CATEGORIES:
-- Check constraint allows: 'labor', 'subs', 'materials', 'other'
-- We generate: 'labor', 'materials', 'subs' (3 codes per trade)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Add unique constraint for company_trade_id based generation
-- ============================================================================
DO $$
BEGIN
  -- Add unique constraint for company_trade_id + category (new trade packs system)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cost_codes_company_trade_id_category_key'
  ) THEN
    ALTER TABLE public.cost_codes 
    ADD CONSTRAINT cost_codes_company_trade_id_category_key 
    UNIQUE (company_id, company_trade_id, category);
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Duplicates exist for (company_id, company_trade_id, category). Cleaning up...';
  -- Delete duplicates keeping the first one
  DELETE FROM public.cost_codes a
  USING public.cost_codes b
  WHERE a.company_id = b.company_id 
    AND a.company_trade_id = b.company_trade_id 
    AND a.category = b.category
    AND a.id > b.id
    AND a.company_trade_id IS NOT NULL;
  -- Try again
  ALTER TABLE public.cost_codes 
  ADD CONSTRAINT cost_codes_company_trade_id_category_key 
  UNIQUE (company_id, company_trade_id, category);
END $$;

-- ============================================================================
-- 2) Fix generate_company_trade_defaults to use correct ON CONFLICT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_company_trade_defaults(
  p_company_trade_id uuid,
  p_mode text DEFAULT 'LMS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade public.company_trades;
  v_created int := 0;
  v_labor_id uuid;
  v_materials_id uuid;
  v_subs_id uuid;
BEGIN
  -- Get the trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Ensure tenant member
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- =========================================
  -- Create Labor cost code
  -- Category: 'labor' (matches check constraint)
  -- =========================================
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-L',
    v_trade.name || ' (Labor)',
    'labor',  -- CANONICAL: matches cost_codes_category_check
    true
  )
  ON CONFLICT (company_id, company_trade_id, category) 
  WHERE company_trade_id IS NOT NULL
  DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  SELECT id INTO v_labor_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id 
    AND company_trade_id = v_trade.id 
    AND category = 'labor'
  LIMIT 1;

  -- =========================================
  -- Create Materials cost code
  -- Category: 'materials' (matches check constraint)
  -- =========================================
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-M',
    v_trade.name || ' (Materials)',
    'materials',  -- CANONICAL: matches cost_codes_category_check
    true
  )
  ON CONFLICT (company_id, company_trade_id, category) 
  WHERE company_trade_id IS NOT NULL
  DO NOTHING;
  
  v_created := v_created + (SELECT COUNT(*) FROM (SELECT 1) x WHERE FOUND);
  
  SELECT id INTO v_materials_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id 
    AND company_trade_id = v_trade.id 
    AND category = 'materials'
  LIMIT 1;

  -- =========================================
  -- Create Subs cost code  
  -- Category: 'subs' (matches check constraint)
  -- =========================================
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-S',
    v_trade.name || ' (Subcontractor)',
    'subs',  -- CANONICAL: matches cost_codes_category_check
    true
  )
  ON CONFLICT (company_id, company_trade_id, category) 
  WHERE company_trade_id IS NOT NULL
  DO NOTHING;
  
  SELECT id INTO v_subs_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id 
    AND company_trade_id = v_trade.id 
    AND category = 'subs'
  LIMIT 1;

  -- =========================================
  -- Update company_trade with default refs
  -- =========================================
  UPDATE public.company_trades
  SET
    default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
    default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_materials_id),
    default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_subs_id)
  WHERE id = v_trade.id;

  -- Count actual codes created
  SELECT COUNT(*) INTO v_created
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'trade_name', v_trade.name,
    'codes_created', v_created,
    'labor_id', v_labor_id,
    'materials_id', v_materials_id,
    'subs_id', v_subs_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_company_trade_defaults(uuid, text) TO authenticated;

-- ============================================================================
-- 3) Add list_company_trades RPC for Cost Codes tab
-- ============================================================================
DROP FUNCTION IF EXISTS public.list_company_trades(uuid);

CREATE OR REPLACE FUNCTION public.list_company_trades(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  code_prefix text,
  is_active boolean,
  default_labor_cost_code_id uuid,
  default_material_cost_code_id uuid,
  default_sub_cost_code_id uuid,
  defaults_complete boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.description,
    ct.code_prefix,
    ct.is_active,
    ct.default_labor_cost_code_id,
    ct.default_material_cost_code_id,
    ct.default_sub_cost_code_id,
    (ct.default_labor_cost_code_id IS NOT NULL 
      AND ct.default_material_cost_code_id IS NOT NULL 
      AND ct.default_sub_cost_code_id IS NOT NULL) AS defaults_complete
  FROM public.company_trades ct
  WHERE ct.company_id = p_company_id
  ORDER BY ct.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_company_trades(uuid) TO authenticated;

-- ============================================================================
-- 4) Add create_cost_code_safe RPC for Cost Codes tab
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_cost_code_safe(
  p_company_id uuid,
  p_code text,
  p_name text,
  p_category text,
  p_company_trade_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id uuid;
  v_final_code text;
  v_suffix int;
BEGIN
  -- Verify membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Validate category (must match check constraint)
  IF p_category NOT IN ('labor', 'subs', 'materials', 'other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid category. Must be: labor, subs, materials, or other');
  END IF;

  -- Collision-safe code generation
  v_final_code := UPPER(TRIM(p_code));
  v_suffix := 1;
  
  WHILE EXISTS (
    SELECT 1 FROM public.cost_codes 
    WHERE company_id = p_company_id AND code = v_final_code
  ) LOOP
    v_suffix := v_suffix + 1;
    v_final_code := UPPER(TRIM(p_code)) || '-' || v_suffix;
    
    IF v_suffix > 99 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unable to generate unique code');
    END IF;
  END LOOP;

  -- Insert
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (p_company_id, p_company_trade_id, v_final_code, p_name, p_category, p_is_active)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'code', v_final_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cost_code_safe(uuid, text, text, text, uuid, boolean) TO authenticated;

-- ============================================================================
-- 5) Add set_company_trade_default_cost_code RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_company_trade_default_cost_code(
  p_company_trade_id uuid,
  p_default_kind text,  -- 'labor', 'materials', or 'subs'
  p_cost_code_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade public.company_trades;
  v_cost_code public.cost_codes;
BEGIN
  -- Get trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Verify membership
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get cost code
  SELECT * INTO v_cost_code FROM public.cost_codes WHERE id = p_cost_code_id;
  IF v_cost_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cost code not found');
  END IF;

  -- Verify same company
  IF v_cost_code.company_id != v_trade.company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cost code belongs to different company');
  END IF;

  -- Update the appropriate default
  CASE p_default_kind
    WHEN 'labor' THEN
      UPDATE public.company_trades SET default_labor_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    WHEN 'materials' THEN
      UPDATE public.company_trades SET default_material_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    WHEN 'subs' THEN
      UPDATE public.company_trades SET default_sub_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid default_kind. Must be: labor, materials, or subs');
  END CASE;

  -- Also update the cost_code's company_trade_id if not set
  IF v_cost_code.company_trade_id IS NULL OR v_cost_code.company_trade_id != p_company_trade_id THEN
    UPDATE public.cost_codes SET company_trade_id = p_company_trade_id WHERE id = p_cost_code_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_trade_default_cost_code(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- 6) Add indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_trade_id 
ON public.cost_codes (company_id, company_trade_id);

CREATE INDEX IF NOT EXISTS idx_cost_codes_category 
ON public.cost_codes (company_id, category);

-- ============================================================================
-- 7) Ensure company_trades has default columns
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_trades' AND column_name = 'default_labor_cost_code_id'
  ) THEN
    ALTER TABLE public.company_trades ADD COLUMN default_labor_cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;
    ALTER TABLE public.company_trades ADD COLUMN default_material_cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;
    ALTER TABLE public.company_trades ADD COLUMN default_sub_cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification queries (run in SQL editor)
-- ============================================================================
-- 
-- -- 1) Check constraint definition
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'cost_codes_category_check';
-- 
-- -- 2) Check unique constraints
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint 
-- WHERE conrelid = 'public.cost_codes'::regclass AND contype = 'u';
-- 
-- -- 3) Verify no invalid categories exist
-- SELECT DISTINCT category FROM public.cost_codes WHERE category NOT IN ('labor', 'subs', 'materials', 'other');
-- 
-- -- 4) Check for duplicate (company_id, company_trade_id, category)
-- SELECT company_id, company_trade_id, category, COUNT(*) 
-- FROM public.cost_codes 
-- WHERE company_trade_id IS NOT NULL
-- GROUP BY company_id, company_trade_id, category 
-- HAVING COUNT(*) > 1;

