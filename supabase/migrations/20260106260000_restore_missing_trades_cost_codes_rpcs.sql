-- ============================================================================
-- db: restore missing Trades/Cost Codes RPCs (PostgREST schema cache compatibility)
-- ============================================================================
-- Fixes production errors:
-- - Could not find function public.get_trades_with_default_codes(p_company_id) in schema cache
-- - Could not find function public.get_cost_codes_with_trades(p_category, p_company_id, ...)
--
-- Strategy:
-- 1) Ensure canonical implementations exist with stable names:
--    - public.get_trades_with_default_codes(p_company_id uuid)
--    - public.get_cost_codes_with_trades(p_company_id uuid, p_include_legacy boolean, p_limit int, ...)
-- 2) Add a backwards-compatible wrapper overload for get_cost_codes_with_trades
--    that matches the legacy argument ORDER used by some clients:
--    (p_category, p_company_id, p_include_legacy, p_limit, p_offset, p_search, p_status, p_trade_id)
-- 3) Notify PostgREST to reload schema.
--
-- IMPORTANT:
-- - No new business logic is introduced. Wrappers delegate to canonical implementation.
-- - Tenant safety enforced via public.is_company_member().
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Canonical: Trades with defaults (stable signature + membership check)
-- ----------------------------------------------------------------------------
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
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
STABLE
AS $$
BEGIN
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    COALESCE(SPLIT_PART(COALESCE(lc.code, mc.code, sc.code), '-', 1), NULL)::text AS code_prefix,
    lc.code AS labor_code,
    lc.id AS labor_code_id,
    mc.code AS material_code,
    mc.id AS material_code_id,
    sc.code AS sub_code,
    sc.id AS sub_code_id,
    CASE
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
      WHEN lc.id IS NULL AND mc.id IS NULL AND sc.id IS NULL THEN 'incomplete'
      ELSE 'invalid'
    END::text AS status
  FROM public.trades t
  LEFT JOIN public.cost_codes lc ON lc.id = t.default_labor_cost_code_id AND lc.company_id = p_company_id
  LEFT JOIN public.cost_codes mc ON mc.id = t.default_material_cost_code_id AND mc.company_id = p_company_id
  LEFT JOIN public.cost_codes sc ON sc.id = t.default_sub_cost_code_id AND sc.company_id = p_company_id
  WHERE t.company_id = p_company_id
  ORDER BY t.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_trades_with_default_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trades_with_default_codes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trades_with_default_codes(uuid) TO service_role;

COMMENT ON FUNCTION public.get_trades_with_default_codes(uuid) IS
  'Trades list with default cost code strings and status. Stable RPC for Admin Trades page.';

-- ----------------------------------------------------------------------------
-- Canonical: Cost codes with trades (filter + pagination signature)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cost_codes_with_trades(
  p_company_id uuid,
  p_include_legacy boolean DEFAULT false,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_trade_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_status text DEFAULT 'active'
)
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
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    p_limit := 200;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
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
  LEFT JOIN public.trades t
    ON t.id = cc.trade_id
   AND t.company_id = p_company_id
  WHERE cc.company_id = p_company_id
    AND (
      p_include_legacy = true
      OR (cc.trade_id IS NOT NULL AND COALESCE(cc.is_legacy, false) = false)
    )
    AND (
      p_status = 'all'
      OR (p_status = 'active' AND cc.is_active = true)
      OR (p_status = 'archived' AND cc.is_active = false)
    )
    AND (p_trade_id IS NULL OR cc.trade_id = p_trade_id)
    AND (p_category IS NULL OR cc.category::text = p_category)
    AND (
      p_search IS NULL
      OR cc.code ILIKE '%' || p_search || '%'
      OR cc.name ILIKE '%' || p_search || '%'
      OR t.name ILIKE '%' || p_search || '%'
    )
  ORDER BY cc.code
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cost_codes_with_trades(uuid, boolean, integer, integer, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(uuid, boolean, integer, integer, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(uuid, boolean, integer, integer, text, uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.get_cost_codes_with_trades(uuid, boolean, integer, integer, text, uuid, text, text) IS
  'Canonical cost codes list joined to trades. Supports filters/pagination. Legacy hidden by default.';

-- ----------------------------------------------------------------------------
-- Wrapper overload: legacy argument ORDER compatibility
-- This EXACT signature matches clients that call with keys:
-- (p_category, p_company_id, p_include_legacy, p_limit, p_offset, p_search, p_status, p_trade_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cost_codes_with_trades(
  p_category text,
  p_company_id uuid,
  p_include_legacy boolean,
  p_limit integer,
  p_offset integer,
  p_search text,
  p_status text,
  p_trade_id uuid
)
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
  -- Delegate to canonical implementation (same business logic)
  RETURN QUERY
  SELECT *
  FROM public.get_cost_codes_with_trades(
    p_company_id := p_company_id,
    p_include_legacy := p_include_legacy,
    p_limit := p_limit,
    p_offset := p_offset,
    p_search := p_search,
    p_trade_id := p_trade_id,
    p_category := p_category,
    p_status := p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) TO service_role;

COMMENT ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) IS
  'Compatibility wrapper for legacy client argument order. Delegates to canonical get_cost_codes_with_trades(p_company_id,...).';

-- ----------------------------------------------------------------------------
-- PostgREST schema reload
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


