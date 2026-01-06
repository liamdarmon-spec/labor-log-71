-- ============================================================================
-- db: canonical cost code catalog rpc
-- ============================================================================
-- Option A (preferred): single canonical RPC for ALL cost code reads.
--
-- Contract:
--   public.get_cost_code_catalog(p_company_id uuid)
--
-- Guarantees:
-- - Tenant-scoped: company_id = p_company_id
-- - Canonical-only:
--     is_active = true
--     is_legacy = false
--     trade_id IS NOT NULL
--     category IN ('labor','material','sub')
-- - Includes trade fields needed by UI without additional queries
-- - SECURITY DEFINER with explicit membership check, and row_security=on
-- - Deterministic ordering
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.get_cost_code_catalog(uuid);

CREATE OR REPLACE FUNCTION public.get_cost_code_catalog(p_company_id uuid)
RETURNS TABLE (
  cost_code_id uuid,
  company_id uuid,
  code text,
  name text,
  category text,
  trade_id uuid,
  trade_name text,
  trade_prefix text,
  is_active boolean,
  is_legacy boolean,
  created_at timestamptz
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
    cc.id AS cost_code_id,
    cc.company_id,
    cc.code,
    cc.name,
    cc.category::text AS category,
    cc.trade_id,
    t.name AS trade_name,
    -- Prefer code prefix (before '-') as the stable trade prefix
    NULLIF(SPLIT_PART(cc.code, '-', 1), '')::text AS trade_prefix,
    cc.is_active,
    COALESCE(cc.is_legacy, false) AS is_legacy,
    cc.created_at
  FROM public.cost_codes cc
  JOIN public.trades t
    ON t.id = cc.trade_id
   AND t.company_id = p_company_id
  WHERE cc.company_id = p_company_id
    AND cc.is_active = true
    AND COALESCE(cc.is_legacy, false) = false
    AND cc.trade_id IS NOT NULL
    AND cc.category::text IN ('labor','material','sub')
  ORDER BY
    t.name,
    cc.category::text,
    cc.code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cost_code_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cost_code_catalog(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_code_catalog(uuid) TO service_role;

COMMENT ON FUNCTION public.get_cost_code_catalog(uuid) IS
  'Canonical cost code catalog (tenant-scoped, trade-linked, non-legacy, active only). Single source of truth for UI.';

COMMIT;


