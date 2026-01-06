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
  v_codes text[];
  v_code text;
  v_created int := 0;
  v_code_name text;
  v_full_code text;
BEGIN
  -- Get the trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;
  
  -- Determine which codes to create
  IF p_mode = 'LMS' OR p_mode IS NULL THEN
    v_codes := ARRAY['L', 'M', 'S'];
  ELSIF p_mode = 'LMSE' THEN
    v_codes := ARRAY['L', 'M', 'S', 'E'];
  ELSIF p_mode = 'LMSEO' THEN
    v_codes := ARRAY['L', 'M', 'S', 'E', 'O'];
  ELSE
    v_codes := ARRAY['L', 'M', 'S'];
  END IF;
  
  -- Create cost codes
  FOREACH v_code IN ARRAY v_codes
  LOOP
    -- Determine name based on code
    CASE v_code
      WHEN 'L' THEN v_code_name := v_trade.name || ' (Labor)';
      WHEN 'M' THEN v_code_name := v_trade.name || ' (Material)';
      WHEN 'S' THEN v_code_name := v_trade.name || ' (Subcontractor)';
      WHEN 'E' THEN v_code_name := v_trade.name || ' (Equipment)';
      WHEN 'O' THEN v_code_name := v_trade.name || ' (Other)';
      ELSE v_code_name := v_trade.name || ' (' || v_code || ')';
    END CASE;
    
    v_full_code := v_trade.code_prefix || '-' || v_code;
    
    -- Insert with ON CONFLICT DO NOTHING for idempotency
    INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
    VALUES (
      v_trade.company_id,
      v_trade.id,
      v_full_code,
      v_code_name,
      CASE v_code
        WHEN 'L' THEN 'labor'
        WHEN 'M' THEN 'material'
        WHEN 'S' THEN 'subcontractor'
        WHEN 'E' THEN 'equipment'
        ELSE 'other'
      END,
      true
    )
    ON CONFLICT (company_id, code) DO NOTHING;
    
    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'trade_name', v_trade.name,
    'codes_created', v_created
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

