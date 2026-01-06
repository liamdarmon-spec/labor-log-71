-- ============================================================================
-- db: fix get_cost_codes_with_trades wrapper ambiguity
-- ============================================================================
-- After adding an overload wrapper for legacy argument order, Postgres can report:
--   function ... is not unique (42725)
-- when the wrapper delegates using named arguments (because both overloads share
-- overlapping parameter names).
--
-- Fix: delegate to canonical implementation using POSITIONAL args, which
-- unambiguously selects the canonical signature:
--   (uuid, boolean, int, int, text, uuid, text, text)
-- ============================================================================

BEGIN;

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
  -- Delegate to canonical implementation (same business logic) using positional args
  RETURN QUERY
  SELECT *
  FROM public.get_cost_codes_with_trades(
    p_company_id,
    p_include_legacy,
    p_limit,
    p_offset,
    p_search,
    p_trade_id,
    p_category,
    p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_codes_with_trades(text, uuid, boolean, integer, integer, text, text, uuid) TO service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


