-- ============================================================================
-- db: fix RPC overload ambiguity for get_cost_codes_with_trades
-- ============================================================================
-- Symptom (UI / PostgREST):
--   "Could not choose the best candidate function between ..."
--
-- Root cause:
--   Multiple overloaded functions share the same name. One bad overload has:
--     p_status INTEGER (wrong)
--   Canonical must have:
--     p_status TEXT
--
-- Goal:
--   Leave exactly ONE callable signature for PostgREST:
--     public.get_cost_codes_with_trades(
--       p_company_id uuid,
--       p_include_legacy boolean DEFAULT false,
--       p_limit integer DEFAULT 50,
--       p_offset integer DEFAULT 0,
--       p_search text DEFAULT null,
--       p_trade_id uuid DEFAULT null,
--       p_category text DEFAULT null,
--       p_status text DEFAULT 'active'
--     )
--
-- Reference query (manual): list overloads
--   SELECT
--     n.nspname AS schema,
--     p.proname AS name,
--     pg_get_function_identity_arguments(p.oid) AS args,
--     p.prorettype::regtype AS returns
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'get_cost_codes_with_trades'
--   ORDER BY args;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Drop ONLY the incorrect overload (p_status integer)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_cost_codes_with_trades(
  text,   -- p_category
  uuid,   -- p_company_id
  boolean,
  integer,
  integer,
  text,
  integer, -- p_status (WRONG)
  uuid
);

-- ----------------------------------------------------------------------------
-- Enforce single canonical signature: drop any other non-canonical overloads
-- (PostgREST must never have to choose between candidates.)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_cost_codes_with_trades(
  text,   -- p_category
  uuid,   -- p_company_id
  boolean,
  integer,
  integer,
  text,
  text,   -- p_status (text) but legacy arg order
  uuid
);

-- ----------------------------------------------------------------------------
-- Ensure canonical function exists with exact signature/order
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cost_codes_with_trades(
  p_company_id uuid,
  p_include_legacy boolean DEFAULT false,
  p_limit integer DEFAULT 50,
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
    p_limit := 50;
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
  'Single canonical RPC for cost code listing. Overloads are forbidden because PostgREST may choose ambiguous candidates.';

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


