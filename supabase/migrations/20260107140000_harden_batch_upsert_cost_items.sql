-- ============================================================================
-- Harden batch_upsert_cost_items for safe autosave at scale
-- - SECURITY DEFINER (no reliance on RLS visibility)
-- - Explicit tenant checks via authed_company_ids()
-- - Per-item results with {id, success, error?, updated_at?, server_updated_at?}
-- - UPDATE ONLY (no inserts)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.batch_upsert_cost_items(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_id uuid;
  v_expected_updated_at timestamptz;
  v_actual_updated_at timestamptz;
  v_company_id uuid;
  v_scope_block_id uuid;
  v_new_scope_block_id uuid;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id := (v_item->>'id')::uuid;
    v_expected_updated_at := NULLIF(v_item->>'expected_updated_at', '')::timestamptz;

    -- Load current row metadata; if missing, return NOT_FOUND
    SELECT i.updated_at, i.scope_block_id
    INTO v_actual_updated_at, v_scope_block_id
    FROM public.scope_block_cost_items i
    WHERE i.id = v_id;

    IF v_scope_block_id IS NULL THEN
      v_result := jsonb_build_object('id', v_id, 'success', false, 'error', 'NOT_FOUND');
      v_results := v_results || v_result;
      CONTINUE;
    END IF;

    -- Resolve company_id through parent scope block (canonical tenant boundary)
    SELECT sb.company_id INTO v_company_id
    FROM public.scope_blocks sb
    WHERE sb.id = v_scope_block_id;

    IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
      v_result := jsonb_build_object('id', v_id, 'success', false, 'error', 'FORBIDDEN');
      v_results := v_results || v_result;
      CONTINUE;
    END IF;

    -- Optimistic locking conflict check
    IF v_expected_updated_at IS NOT NULL AND v_actual_updated_at IS NOT NULL AND v_actual_updated_at > v_expected_updated_at THEN
      v_result := jsonb_build_object(
        'id', v_id,
        'success', false,
        'error', 'CONFLICT',
        'server_updated_at', v_actual_updated_at
      );
      v_results := v_results || v_result;
      CONTINUE;
    END IF;

    -- If moving rows across scope blocks, enforce the target block is also in-tenant
    v_new_scope_block_id := NULLIF(v_item->>'scope_block_id', '')::uuid;
    IF v_new_scope_block_id IS NOT NULL AND v_new_scope_block_id <> v_scope_block_id THEN
      SELECT sb.company_id INTO v_company_id
      FROM public.scope_blocks sb
      WHERE sb.id = v_new_scope_block_id;

      IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
        v_result := jsonb_build_object('id', v_id, 'success', false, 'error', 'FORBIDDEN');
        v_results := v_results || v_result;
        CONTINUE;
      END IF;
    END IF;

    -- Perform update
    UPDATE public.scope_block_cost_items
    SET
      category = COALESCE((v_item->>'category'), category),
      cost_code_id = CASE
        WHEN v_item ? 'cost_code_id' THEN (v_item->>'cost_code_id')::uuid
        ELSE cost_code_id
      END,
      description = COALESCE((v_item->>'description'), description),
      quantity = COALESCE(NULLIF(v_item->>'quantity', '')::numeric, quantity),
      unit = COALESCE((v_item->>'unit'), unit),
      unit_price = COALESCE(NULLIF(v_item->>'unit_price', '')::numeric, unit_price),
      markup_percent = COALESCE(NULLIF(v_item->>'markup_percent', '')::numeric, markup_percent),
      area_label = CASE
        WHEN v_item ? 'area_label' THEN (v_item->>'area_label')
        ELSE area_label
      END,
      group_label = CASE
        WHEN v_item ? 'group_label' THEN (v_item->>'group_label')
        ELSE group_label
      END,
      sort_order = COALESCE(NULLIF(v_item->>'sort_order', '')::int, sort_order),
      scope_block_id = COALESCE(v_new_scope_block_id, scope_block_id)
    WHERE id = v_id
    RETURNING jsonb_build_object(
      'id', id,
      'success', true,
      'updated_at', updated_at
    ) INTO v_result;

    IF v_result IS NULL THEN
      v_result := jsonb_build_object('id', v_id, 'success', false, 'error', 'NOT_FOUND');
    END IF;

    v_results := v_results || v_result;
  END LOOP;

  RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_upsert_cost_items(jsonb) TO authenticated;

-- Best-effort schema cache refresh
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- noop
END $$;


