-- ============================================================================
-- Trade Pack RPC Functions
-- ============================================================================
-- - normalize_trade_prefix: Deterministic prefix derivation
-- - generate_company_trade_defaults: Create L/M/S cost codes for a trade
-- - import_trade_pack: Import pack items into company_trades
-- ============================================================================

-- ============================================================================
-- 1) normalize_trade_prefix - Deterministic prefix from name
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_trade_prefix(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text;
  v_prefix text;
BEGIN
  -- Normalize: uppercase, remove non-alphanumeric, take first 4 chars
  v_clean := upper(regexp_replace(p_name, '[^A-Za-z0-9]', '', 'g'));
  
  IF length(v_clean) = 0 THEN
    RETURN 'XXX';
  END IF;
  
  -- Take first 3-4 characters
  v_prefix := left(v_clean, 4);
  
  RETURN v_prefix;
END;
$$;

-- ============================================================================
-- 2) generate_company_trade_defaults - Create L/M/S cost codes
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
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Ensure tenant member
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create / find Labor
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-L',
    v_trade.name || ' (Labor)',
    'labor',
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  SELECT id INTO v_labor_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'labor'
  ORDER BY code
  LIMIT 1;

  -- Create / find Materials
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-M',
    v_trade.name || ' (Materials)',
    'materials',
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  SELECT id INTO v_materials_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'materials'
  ORDER BY code
  LIMIT 1;

  -- Create / find Subs
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-S',
    v_trade.name || ' (Subs)',
    'subs',
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  SELECT id INTO v_subs_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'subs'
  ORDER BY code
  LIMIT 1;

  -- Backfill default refs on company_trades if columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_trades' AND column_name = 'default_labor_cost_code_id'
  ) THEN
    UPDATE public.company_trades
    SET
      default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
      default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_materials_id),
      default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_subs_id)
    WHERE id = v_trade.id;
  END IF;

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
-- 3) import_trade_pack - Import pack items into company_trades
-- ============================================================================
CREATE OR REPLACE FUNCTION public.import_trade_pack(
  p_trade_pack_id uuid,
  p_company_id uuid,
  p_generate_defaults boolean DEFAULT true,
  p_mode text DEFAULT 'LMS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item record;
  v_prefix text;
  v_new_trade_id uuid;
  v_trades_created int := 0;
  v_codes_created int := 0;
  v_result jsonb;
  v_collision_suffix int;
BEGIN
  -- Verify company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this company');
  END IF;
  
  -- Verify pack exists and is accessible
  IF NOT EXISTS (
    SELECT 1 FROM public.trade_packs 
    WHERE id = p_trade_pack_id 
      AND (is_system = true OR created_by_company_id = p_company_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade pack not found or not accessible');
  END IF;
  
  -- Import each pack item
  FOR v_item IN 
    SELECT * FROM public.trade_pack_items 
    WHERE trade_pack_id = p_trade_pack_id
    ORDER BY sort_order
  LOOP
    -- Determine prefix
    v_prefix := COALESCE(v_item.code_prefix, public.normalize_trade_prefix(v_item.name));
    
    -- Handle prefix collisions
    v_collision_suffix := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.company_trades 
      WHERE company_id = p_company_id AND code_prefix = v_prefix
    ) LOOP
      v_prefix := COALESCE(v_item.code_prefix, public.normalize_trade_prefix(v_item.name)) || v_collision_suffix::text;
      v_collision_suffix := v_collision_suffix + 1;
      
      IF v_collision_suffix > 99 THEN
        CONTINUE; -- Skip this item if too many collisions
      END IF;
    END LOOP;
    
    -- Skip if name already exists for this company
    IF EXISTS (
      SELECT 1 FROM public.company_trades 
      WHERE company_id = p_company_id AND name = v_item.name
    ) THEN
      CONTINUE;
    END IF;
    
    -- Insert company trade
    INSERT INTO public.company_trades (company_id, name, description, code_prefix, source_pack_item_id)
    VALUES (p_company_id, v_item.name, v_item.description, v_prefix, v_item.id)
    RETURNING id INTO v_new_trade_id;
    
    v_trades_created := v_trades_created + 1;
    
    -- Generate default cost codes if requested
    IF p_generate_defaults THEN
      v_result := public.generate_company_trade_defaults(v_new_trade_id, p_mode);
      v_codes_created := v_codes_created + COALESCE((v_result->>'codes_created')::int, 0);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'trades_created', v_trades_created,
    'codes_created', v_codes_created
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_trade_pack(uuid, uuid, boolean, text) TO authenticated;

-- ============================================================================
-- 4) create_company_trade - Add a single trade with optional defaults
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_company_trade(
  p_company_id uuid,
  p_name text,
  p_description text DEFAULT null,
  p_code_prefix text DEFAULT null,
  p_generate_defaults boolean DEFAULT true,
  p_mode text DEFAULT 'LMS'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix text;
  v_new_trade_id uuid;
  v_result jsonb;
  v_collision_suffix int;
BEGIN
  -- Verify company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this company');
  END IF;
  
  -- Check name uniqueness
  IF EXISTS (
    SELECT 1 FROM public.company_trades 
    WHERE company_id = p_company_id AND name = p_name
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A trade with this name already exists');
  END IF;
  
  -- Determine prefix
  v_prefix := COALESCE(NULLIF(p_code_prefix, ''), public.normalize_trade_prefix(p_name));
  
  -- Handle prefix collisions
  v_collision_suffix := 1;
  WHILE EXISTS (
    SELECT 1 FROM public.company_trades 
    WHERE company_id = p_company_id AND code_prefix = v_prefix
  ) LOOP
    v_prefix := COALESCE(NULLIF(p_code_prefix, ''), public.normalize_trade_prefix(p_name)) || v_collision_suffix::text;
    v_collision_suffix := v_collision_suffix + 1;
    
    IF v_collision_suffix > 99 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unable to generate unique prefix');
    END IF;
  END LOOP;
  
  -- Insert the trade
  INSERT INTO public.company_trades (company_id, name, description, code_prefix)
  VALUES (p_company_id, p_name, p_description, v_prefix)
  RETURNING id INTO v_new_trade_id;
  
  -- Generate default cost codes if requested
  IF p_generate_defaults THEN
    v_result := public.generate_company_trade_defaults(v_new_trade_id, p_mode);
  ELSE
    v_result := jsonb_build_object('codes_created', 0);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'trade_name', p_name,
    'code_prefix', v_prefix,
    'codes_created', COALESCE((v_result->>'codes_created')::int, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_trade(uuid, text, text, text, boolean, text) TO authenticated;

-- ============================================================================
-- 5) get_company_trades_with_codes - Efficient fetch for UI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_company_trades_with_codes(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ct.id,
      'name', ct.name,
      'description', ct.description,
      'code_prefix', ct.code_prefix,
      'is_active', ct.is_active,
      'default_labor_cost_code_id', ct.default_labor_cost_code_id,
      'default_material_cost_code_id', ct.default_material_cost_code_id,
      'default_sub_cost_code_id', ct.default_sub_cost_code_id,
      'defaults_complete', (ct.default_labor_cost_code_id IS NOT NULL AND ct.default_material_cost_code_id IS NOT NULL AND ct.default_sub_cost_code_id IS NOT NULL),
      'cost_codes', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'code', cc.code,
            'name', cc.name,
            'category', cc.category,
            'is_active', cc.is_active
          ) ORDER BY cc.code
        )
        FROM public.cost_codes cc
        WHERE cc.company_trade_id = ct.id
      ), '[]'::jsonb)
    ) ORDER BY ct.name
  )
  INTO v_result
  FROM public.company_trades ct
  WHERE ct.company_id = p_company_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_trades_with_codes(uuid) TO authenticated;

