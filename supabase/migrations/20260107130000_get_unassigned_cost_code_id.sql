-- ============================================================================
-- db: get UNASSIGNED cost_code_id by company_id (tenant-safe)
-- Rationale:
-- - Manual Save Now should fetch UNASSIGNED once per save (no per-item RPCs).
-- - SECURITY DEFINER requires explicit tenant check.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unassigned_cost_code_id(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cost_code_id uuid;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  -- Explicit tenant check (SECURITY DEFINER bypasses RLS)
  IF NOT (p_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'not authorized for company %', p_company_id;
  END IF;

  SELECT cc.id
  INTO v_cost_code_id
  FROM public.cost_codes cc
  WHERE cc.company_id = p_company_id
    AND cc.code = 'UNASSIGNED'
  LIMIT 1;

  IF v_cost_code_id IS NULL THEN
    RAISE EXCEPTION 'UNASSIGNED cost code not found for company %', p_company_id;
  END IF;

  RETURN v_cost_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unassigned_cost_code_id(uuid) TO authenticated;

-- Best-effort schema cache refresh
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- noop
END $$;


