-- ============================================================================
-- db: cost codes RPC filters + pagination (stable contract)
-- ============================================================================
-- Goal:
-- - Keep stable RPC name: public.get_cost_codes_with_trades(p_company_id uuid, ...)
-- - Add optional filter/pagination params so UI can avoid loading huge lists
-- - Preserve tenant safety via is_company_member(p_company_id)
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.get_cost_codes_with_trades(uuid);
DROP FUNCTION IF EXISTS public.get_cost_codes_with_trades(uuid, boolean, integer, integer, text, uuid, text, text);

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
    AND (
      p_trade_id IS NULL
      OR cc.trade_id = p_trade_id
      OR (p_trade_id IS NULL AND false)
    )
    AND (
      p_category IS NULL
      OR cc.category::text = p_category
    )
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
  'Returns cost codes joined to trades. Supports pagination + filters. Legacy/unassigned codes hidden by default.';

COMMIT;


