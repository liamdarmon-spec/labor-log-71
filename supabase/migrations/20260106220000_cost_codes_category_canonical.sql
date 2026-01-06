-- ============================================================================
-- db: canonicalize cost code categories
-- ============================================================================
-- 
-- PROBLEM:
-- Current constraint allows: 'labor', 'subs', 'materials', 'other'
-- This is inconsistent and error-prone.
--
-- SOLUTION:
-- Standardize to exactly 3 canonical categories:
--   'labor'    - Labor costs
--   'material' - Material costs (singular, not 'materials')
--   'sub'      - Subcontractor costs (not 'subs' or 'subcontractor')
--
-- Migration steps:
-- 1) Normalize existing data (map variants to canonical)
-- 2) Drop old check constraint
-- 3) Create new check constraint with canonical values
-- 4) Update unique constraints if needed
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) DROP OLD CHECK CONSTRAINT FIRST
-- ============================================================================
-- Must drop before updating data so updates don't violate old constraint
ALTER TABLE public.cost_codes 
DROP CONSTRAINT IF EXISTS cost_codes_category_check;

-- ============================================================================
-- 2) NORMALIZE EXISTING DATA
-- ============================================================================
-- Map common variants to canonical values

-- Map 'materials' -> 'material'
UPDATE public.cost_codes 
SET category = 'material' 
WHERE category = 'materials';

-- Map 'subs' -> 'sub'
UPDATE public.cost_codes 
SET category = 'sub' 
WHERE category = 'subs';

-- Map 'subcontractor' -> 'sub'
UPDATE public.cost_codes 
SET category = 'sub' 
WHERE category = 'subcontractor';

-- Map 'vendor' -> 'sub' (vendors are treated as subs for cost tracking)
UPDATE public.cost_codes 
SET category = 'sub' 
WHERE category = 'vendor';

-- Map 'other' to 'material' (default fallback for existing data only)
-- In a fresh system this shouldn't happen
UPDATE public.cost_codes 
SET category = 'material' 
WHERE category = 'other';

-- ============================================================================
-- 3) CHECK FOR INVALID CATEGORIES
-- ============================================================================
-- Fail migration if any unexpected categories exist
DO $$
DECLARE
  v_invalid_count int;
  v_invalid_cats text;
BEGIN
  SELECT 
    COUNT(*),
    string_agg(DISTINCT category, ', ')
  INTO v_invalid_count, v_invalid_cats
  FROM public.cost_codes 
  WHERE category NOT IN ('labor', 'material', 'sub');
  
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % cost codes with invalid categories: %. Manual fix required.', 
      v_invalid_count, v_invalid_cats;
  END IF;
END $$;

-- ============================================================================
-- 4) CREATE NEW CHECK CONSTRAINT WITH CANONICAL VALUES
-- ============================================================================
ALTER TABLE public.cost_codes
ADD CONSTRAINT cost_codes_category_check 
CHECK (category IN ('labor', 'material', 'sub'));

-- ============================================================================
-- 5) UPDATE UNIQUE CONSTRAINT FOR (company_trade_id, category)
-- ============================================================================
-- Already exists: cost_codes_company_trade_id_category_key
-- Already exists: cost_codes_company_code_key

-- Ensure (company_id, company_trade_id, category) is unique when company_trade_id is not null
-- This was added in a previous migration, verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'cost_codes_company_trade_id_category_key'
  ) THEN
    CREATE UNIQUE INDEX cost_codes_company_trade_id_category_key 
    ON public.cost_codes (company_id, company_trade_id, category)
    WHERE company_trade_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 6) CREATE CANONICAL RPC: create_trade_with_default_cost_codes
-- ============================================================================
-- Atomic creation of a company_trade with its 3 default cost codes
DROP FUNCTION IF EXISTS public.create_trade_with_default_cost_codes(uuid, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.create_trade_with_default_cost_codes(
  p_company_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_code_prefix text DEFAULT NULL,
  p_auto_generate boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_trade_id uuid;
  v_prefix text;
  v_letters text;
  v_prefix_len int;
  v_suffix int;
  v_labor_code text;
  v_material_code text;
  v_sub_code text;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
BEGIN
  -- =========================================
  -- SECURITY: Verify caller is company member
  -- =========================================
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of company %', p_company_id;
  END IF;

  -- =========================================
  -- VALIDATION: Name required
  -- =========================================
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Trade name is required';
  END IF;

  -- =========================================
  -- CHECK: Name uniqueness within company
  -- =========================================
  IF EXISTS (
    SELECT 1 FROM public.company_trades 
    WHERE company_id = p_company_id AND LOWER(name) = LOWER(TRIM(p_name))
  ) THEN
    RAISE EXCEPTION 'A trade with name "%" already exists', TRIM(p_name);
  END IF;

  -- =========================================
  -- DETERMINE PREFIX
  -- =========================================
  IF p_code_prefix IS NOT NULL AND TRIM(p_code_prefix) != '' THEN
    -- Use provided prefix: uppercase, letters only
    v_prefix := UPPER(REGEXP_REPLACE(TRIM(p_code_prefix), '[^A-Za-z]', '', 'g'));
  ELSE
    -- Derive from name: uppercase letters only
    v_letters := UPPER(REGEXP_REPLACE(TRIM(p_name), '[^A-Za-z]', '', 'g'));
    v_prefix := LEFT(v_letters, 3);
  END IF;

  -- Validate prefix has at least 2 letters
  IF LENGTH(v_prefix) < 2 THEN
    RAISE EXCEPTION 'Code prefix must have at least 2 letters. Derived from name: "%"', p_name;
  END IF;

  -- =========================================
  -- COLLISION HANDLING FOR PREFIX
  -- =========================================
  IF p_auto_generate THEN
    -- Try prefix lengths 3, 4, 5... then numeric suffix
    v_letters := UPPER(REGEXP_REPLACE(TRIM(p_name), '[^A-Za-z]', '', 'g'));
    v_prefix_len := GREATEST(3, LENGTH(v_prefix));
    v_suffix := 0;
    
    LOOP
      v_prefix := LEFT(v_letters, v_prefix_len);
      IF v_suffix > 0 THEN
        v_prefix := v_prefix || v_suffix::text;
      END IF;
      
      -- Check if this prefix would create unique codes
      v_labor_code := v_prefix || '-L';
      v_material_code := v_prefix || '-M';
      v_sub_code := v_prefix || '-S';
      
      IF NOT EXISTS (
        SELECT 1 FROM public.cost_codes 
        WHERE company_id = p_company_id 
          AND code IN (v_labor_code, v_material_code, v_sub_code)
      ) THEN
        -- Also check prefix uniqueness for company_trades
        IF NOT EXISTS (
          SELECT 1 FROM public.company_trades 
          WHERE company_id = p_company_id AND code_prefix = v_prefix
        ) THEN
          EXIT; -- Found unique prefix
        END IF;
      END IF;
      
      -- Try longer prefix
      IF v_prefix_len < LENGTH(v_letters) THEN
        v_prefix_len := v_prefix_len + 1;
      ELSE
        -- All letters used, try numeric suffix
        v_suffix := v_suffix + 1;
        IF v_suffix > 99 THEN
          RAISE EXCEPTION 'Unable to generate unique code prefix for trade "%"', p_name;
        END IF;
      END IF;
    END LOOP;
  ELSE
    -- Not auto-generating, just validate prefix is unique
    IF EXISTS (
      SELECT 1 FROM public.company_trades 
      WHERE company_id = p_company_id AND code_prefix = v_prefix
    ) THEN
      RAISE EXCEPTION 'Code prefix "%" already exists in this company', v_prefix;
    END IF;
  END IF;

  -- =========================================
  -- INSERT TRADE
  -- =========================================
  INSERT INTO public.company_trades (
    company_id,
    name,
    description,
    code_prefix,
    is_active
  ) VALUES (
    p_company_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    v_prefix,
    true
  )
  RETURNING id INTO v_new_trade_id;

  -- =========================================
  -- CREATE COST CODES (if auto-generate)
  -- =========================================
  IF p_auto_generate THEN
    v_labor_code := v_prefix || '-L';
    v_material_code := v_prefix || '-M';
    v_sub_code := v_prefix || '-S';
    
    -- Insert Labor code
    INSERT INTO public.cost_codes (
      company_id,
      company_trade_id,
      code,
      name,
      category,
      is_active
    ) VALUES (
      p_company_id,
      v_new_trade_id,
      v_labor_code,
      TRIM(p_name) || ' (Labor)',
      'labor',
      true
    )
    RETURNING id INTO v_labor_id;
    
    -- Insert Material code
    INSERT INTO public.cost_codes (
      company_id,
      company_trade_id,
      code,
      name,
      category,
      is_active
    ) VALUES (
      p_company_id,
      v_new_trade_id,
      v_material_code,
      TRIM(p_name) || ' (Material)',
      'material',
      true
    )
    RETURNING id INTO v_material_id;
    
    -- Insert Sub code
    INSERT INTO public.cost_codes (
      company_id,
      company_trade_id,
      code,
      name,
      category,
      is_active
    ) VALUES (
      p_company_id,
      v_new_trade_id,
      v_sub_code,
      TRIM(p_name) || ' (Subcontractor)',
      'sub',
      true
    )
    RETURNING id INTO v_sub_id;
    
    -- Update trade with default code references
    UPDATE public.company_trades
    SET
      default_labor_cost_code_id = v_labor_id,
      default_material_cost_code_id = v_material_id,
      default_sub_cost_code_id = v_sub_id
    WHERE id = v_new_trade_id;
  END IF;

  -- =========================================
  -- RETURN RESULT
  -- =========================================
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'trade_name', TRIM(p_name),
    'code_prefix', v_prefix,
    'auto_generated', p_auto_generate,
    'labor_code_id', v_labor_id,
    'material_code_id', v_material_id,
    'sub_code_id', v_sub_id,
    'labor_code', v_labor_code,
    'material_code', v_material_code,
    'sub_code', v_sub_code
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Duplicate entry: %', SQLERRM;
  WHEN check_violation THEN
    RAISE EXCEPTION 'Invalid data: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trade_with_default_cost_codes(uuid, text, text, text, boolean) TO authenticated;

-- ============================================================================
-- 7) CREATE BACKFILL RPC: ensure_trade_has_default_cost_codes
-- ============================================================================
DROP FUNCTION IF EXISTS public.ensure_trade_has_default_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.ensure_trade_has_default_cost_codes(p_company_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade public.company_trades;
  v_code_count int;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
  v_labor_code text;
  v_material_code text;
  v_sub_code text;
BEGIN
  -- Get trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade not found: %', p_company_trade_id;
  END IF;

  -- Security check
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of this company';
  END IF;

  -- Count existing cost codes
  SELECT COUNT(*) INTO v_code_count 
  FROM public.cost_codes 
  WHERE company_trade_id = p_company_trade_id;

  -- If already has exactly 3, verify they're correct
  IF v_code_count = 3 THEN
    -- Verify all three categories exist
    IF EXISTS (
      SELECT 1 FROM (
        SELECT category FROM public.cost_codes WHERE company_trade_id = p_company_trade_id
      ) cc
      GROUP BY 1
      HAVING COUNT(*) != 1
    ) OR NOT EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE company_trade_id = p_company_trade_id AND category = 'labor'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE company_trade_id = p_company_trade_id AND category = 'material'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE company_trade_id = p_company_trade_id AND category = 'sub'
    ) THEN
      RAISE EXCEPTION 'Trade has 3 cost codes but wrong categories. Manual fix required.';
    END IF;
    
    -- Update default references if missing
    SELECT id INTO v_labor_id FROM public.cost_codes 
    WHERE company_trade_id = p_company_trade_id AND category = 'labor';
    SELECT id INTO v_material_id FROM public.cost_codes 
    WHERE company_trade_id = p_company_trade_id AND category = 'material';
    SELECT id INTO v_sub_id FROM public.cost_codes 
    WHERE company_trade_id = p_company_trade_id AND category = 'sub';
    
    UPDATE public.company_trades
    SET
      default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
      default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_material_id),
      default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_sub_id)
    WHERE id = p_company_trade_id;
    
    RETURN jsonb_build_object('success', true, 'action', 'verified', 'codes_created', 0);
  END IF;

  -- If not 0 or 3, raise exception
  IF v_code_count != 0 THEN
    RAISE EXCEPTION 'Trade has % cost codes (expected 0 or 3). Manual fix required.', v_code_count;
  END IF;

  -- Generate codes
  v_labor_code := v_trade.code_prefix || '-L';
  v_material_code := v_trade.code_prefix || '-M';
  v_sub_code := v_trade.code_prefix || '-S';

  -- Insert Labor code
  INSERT INTO public.cost_codes (
    company_id, company_trade_id, code, name, category, is_active
  ) VALUES (
    v_trade.company_id, p_company_trade_id, v_labor_code,
    v_trade.name || ' (Labor)', 'labor', true
  )
  ON CONFLICT (company_id, code) DO NOTHING
  RETURNING id INTO v_labor_id;

  -- Insert Material code
  INSERT INTO public.cost_codes (
    company_id, company_trade_id, code, name, category, is_active
  ) VALUES (
    v_trade.company_id, p_company_trade_id, v_material_code,
    v_trade.name || ' (Material)', 'material', true
  )
  ON CONFLICT (company_id, code) DO NOTHING
  RETURNING id INTO v_material_id;

  -- Insert Sub code
  INSERT INTO public.cost_codes (
    company_id, company_trade_id, code, name, category, is_active
  ) VALUES (
    v_trade.company_id, p_company_trade_id, v_sub_code,
    v_trade.name || ' (Subcontractor)', 'sub', true
  )
  ON CONFLICT (company_id, code) DO NOTHING
  RETURNING id INTO v_sub_id;

  -- Update trade with default code references
  UPDATE public.company_trades
  SET
    default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
    default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_material_id),
    default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_sub_id)
  WHERE id = p_company_trade_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'codes_created', 3,
    'labor_id', v_labor_id,
    'material_id', v_material_id,
    'sub_id', v_sub_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_trade_has_default_cost_codes(uuid) TO authenticated;

-- ============================================================================
-- 8) UPDATE generate_company_trade_defaults TO USE CANONICAL CATEGORIES
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
  v_material_id uuid;
  v_sub_id uuid;
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

  -- Create Labor cost code (category = 'labor')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-L',
    v_trade.name || ' (Labor)',
    'labor',  -- CANONICAL
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_labor_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'labor'
  LIMIT 1;

  -- Create Material cost code (category = 'material')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-M',
    v_trade.name || ' (Material)',
    'material',  -- CANONICAL (not 'materials')
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_material_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'material'
  LIMIT 1;

  -- Create Sub cost code (category = 'sub')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-S',
    v_trade.name || ' (Subcontractor)',
    'sub',  -- CANONICAL (not 'subs')
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_sub_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'sub'
  LIMIT 1;

  -- Update company_trades with default refs
  UPDATE public.company_trades
  SET
    default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
    default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_material_id),
    default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_sub_id)
  WHERE id = v_trade.id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'trade_name', v_trade.name,
    'codes_created', v_created,
    'labor_id', v_labor_id,
    'material_id', v_material_id,
    'sub_id', v_sub_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_company_trade_defaults(uuid, text) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
-- 
-- -- 1) Verify constraint
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'cost_codes_category_check';
-- Expected: CHECK (category IN ('labor', 'material', 'sub'))
-- 
-- -- 2) Verify no invalid categories
-- SELECT category, COUNT(*) FROM public.cost_codes WHERE category NOT IN ('labor', 'material', 'sub') GROUP BY 1;
-- Expected: 0 rows
-- 
-- -- 3) Test insert with invalid category (should fail)
-- INSERT INTO public.cost_codes (company_id, code, name, category) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'TEST', 'Test', 'materials');
-- Expected: ERROR: new row violates check constraint "cost_codes_category_check"

