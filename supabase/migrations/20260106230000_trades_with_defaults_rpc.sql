-- ============================================================================
-- MIGRATION: get_trades_with_default_codes RPC
-- Purpose: Return trades with their default cost codes in ONE query (no N+1)
-- ============================================================================

-- Drop and recreate to allow signature changes
DROP FUNCTION IF EXISTS public.get_trades_with_default_codes(uuid);

CREATE OR REPLACE FUNCTION public.get_trades_with_default_codes(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  code_prefix text,
  labor_code text,
  labor_code_id uuid,
  material_code text,
  material_code_id uuid,
  sub_code text,
  sub_code_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  -- Validate company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    -- Derive prefix from first default code or NULL
    COALESCE(
      SPLIT_PART(COALESCE(lc.code, mc.code, sc.code), '-', 1),
      NULL
    )::text AS code_prefix,
    lc.code AS labor_code,
    lc.id AS labor_code_id,
    mc.code AS material_code,
    mc.id AS material_code_id,
    sc.code AS sub_code,
    sc.id AS sub_code_id,
    -- Determine status
    CASE
      -- Complete only if ALL invariants are satisfied:
      -- - all three default ids exist
      -- - each resolves to a cost_codes row in the same company
      -- - each cost code is linked to this trade via trade_id
      -- - categories are correct
      -- - cost codes are active and not legacy
      WHEN
        lc.id IS NOT NULL
        AND mc.id IS NOT NULL
        AND sc.id IS NOT NULL
        AND lc.company_id = p_company_id AND mc.company_id = p_company_id AND sc.company_id = p_company_id
        AND lc.trade_id = t.id AND mc.trade_id = t.id AND sc.trade_id = t.id
        AND lc.category::text = 'labor' AND mc.category::text = 'material' AND sc.category::text = 'sub'
        AND lc.is_active = true AND mc.is_active = true AND sc.is_active = true
        AND COALESCE(lc.is_legacy, false) = false
        AND COALESCE(mc.is_legacy, false) = false
        AND COALESCE(sc.is_legacy, false) = false
      THEN 'complete'
      -- Incomplete if all pointers are NULL (no defaults yet)
      WHEN lc.id IS NULL AND mc.id IS NULL AND sc.id IS NULL THEN 'incomplete'
      -- Otherwise, something is mismatched/legacy/inconsistent
      ELSE 'invalid'
    END::text AS status
  FROM public.trades t
  LEFT JOIN public.cost_codes lc 
    ON lc.id = t.default_labor_cost_code_id 
    AND lc.company_id = p_company_id
  LEFT JOIN public.cost_codes mc 
    ON mc.id = t.default_material_cost_code_id 
    AND mc.company_id = p_company_id
  LEFT JOIN public.cost_codes sc 
    ON sc.id = t.default_sub_cost_code_id 
    AND sc.company_id = p_company_id
  WHERE t.company_id = p_company_id
  ORDER BY t.name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trades_with_default_codes(uuid) TO authenticated;

-- ============================================================================
-- get_cost_codes_with_trades RPC
-- Returns all cost codes with joined trade name in ONE query
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_cost_codes_with_trades(uuid);

CREATE OR REPLACE FUNCTION public.get_cost_codes_with_trades(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  category text,
  is_active boolean,
  trade_id uuid,
  trade_name text,
  is_legacy boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  -- Validate company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    cc.id,
    cc.code,
    cc.name,
    cc.category::text,
    cc.is_active,
    cc.trade_id,
    t.name AS trade_name,
    COALESCE(cc.is_legacy, (cc.trade_id IS NULL))::boolean AS is_legacy
  FROM public.cost_codes cc
  LEFT JOIN public.trades t ON t.id = cc.trade_id AND t.company_id = p_company_id
  WHERE cc.company_id = p_company_id
  ORDER BY cc.code;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(uuid) TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
COMMENT ON FUNCTION public.get_trades_with_default_codes(uuid) IS 
  'Returns trades with their default cost codes (labor/material/sub) in a single query. Status: complete|incomplete|invalid';

COMMENT ON FUNCTION public.get_cost_codes_with_trades(uuid) IS 
  'Returns all cost codes with joined trade name. is_legacy=true for codes without a trade_id (legacy/unassigned)';

