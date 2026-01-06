-- ============================================================================
-- db: fix Trades admin RPC signature for PostgREST schema cache
-- ============================================================================
-- Symptom:
--   "Could not find the function public.get_trades_with_default_codes(p_company_id)
--    in the schema cache"
--
-- Root causes (common):
-- - Function exists but parameter name does not match PostgREST JSON key
-- - Function exists but EXECUTE not granted to authenticated
-- - PostgREST schema cache needs reload after migration
--
-- Fix strategy:
-- - Ensure EXACT function exists: public.get_trades_with_default_codes(p_company_id uuid)
-- - Keep canonical behavior, but make the contract stable for frontend calls
-- - SECURITY DEFINER + explicit membership check, but FORCE RLS with row_security=on
-- - Set search_path explicitly
-- - Grant execute to authenticated
-- - Notify PostgREST to reload schema
-- ============================================================================

BEGIN;

-- Ensure RPC exists with expected parameter name.
-- Note: CREATE OR REPLACE will update argument name used by PostgREST schema cache.
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
  -- Explicit membership check (do not rely on implicit RLS errors)
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

-- Encourage PostgREST to reload schema cache (Supabase listens on this channel).
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  -- Safe no-op if notification is not allowed in this environment.
  NULL;
END $$;

COMMIT;


