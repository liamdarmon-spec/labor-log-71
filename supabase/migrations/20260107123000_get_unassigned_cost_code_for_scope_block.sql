-- get UNASSIGNED cost_code_id for a scope_block_id (already applied on remote).
-- Restored locally to match remote migration history.

CREATE OR REPLACE FUNCTION public.get_unassigned_cost_code_for_scope_block(p_scope_block_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_cost_code_id uuid;
BEGIN
  IF p_scope_block_id IS NULL THEN
    RAISE EXCEPTION 'scope_block_id is required';
  END IF;

  SELECT sb.company_id
  INTO v_company_id
  FROM public.scope_blocks sb
  WHERE sb.id = p_scope_block_id;

  IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'not authorized for scope block %', p_scope_block_id;
  END IF;

  SELECT cc.id
  INTO v_cost_code_id
  FROM public.cost_codes cc
  WHERE cc.company_id = v_company_id
    AND cc.code = 'UNASSIGNED'
  LIMIT 1;

  IF v_cost_code_id IS NULL THEN
    RAISE EXCEPTION 'UNASSIGNED cost code not found for company %', v_company_id;
  END IF;

  RETURN v_cost_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unassigned_cost_code_for_scope_block(uuid) TO authenticated;

-- Best-effort schema cache refresh
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- noop
END $$;


