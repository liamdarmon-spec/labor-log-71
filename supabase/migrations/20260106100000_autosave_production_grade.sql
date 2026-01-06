-- ============================================================================
-- Production-Grade Autosave Infrastructure
-- Handles 1000's of concurrent users with:
-- - Server-side line_total calculation (trigger)
-- - Optimistic locking via updated_at
-- - Batch upsert RPC for efficiency
-- ============================================================================

-- 1) Ensure updated_at column exists and auto-updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'scope_block_cost_items'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.scope_block_cost_items
      ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- 2) Create trigger to auto-update updated_at on any change
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_scope_block_cost_items ON public.scope_block_cost_items;
CREATE TRIGGER set_updated_at_scope_block_cost_items
  BEFORE UPDATE ON public.scope_block_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) Create trigger to auto-calculate line_total on insert/update
CREATE OR REPLACE FUNCTION public.tg_calculate_line_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.quantity, 0) 
                  * COALESCE(NEW.unit_price, 0) 
                  * (1 + COALESCE(NEW.markup_percent, 0) / 100.0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_line_total ON public.scope_block_cost_items;
CREATE TRIGGER calculate_line_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price, markup_percent ON public.scope_block_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_calculate_line_total();

-- 4) Create batch upsert RPC for efficient saves
-- This handles multiple rows in a single transaction
CREATE OR REPLACE FUNCTION public.batch_upsert_cost_items(
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_id uuid;
  v_expected_updated_at timestamptz;
  v_actual_updated_at timestamptz;
BEGIN
  -- Process each item in the batch
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id := (v_item->>'id')::uuid;
    v_expected_updated_at := (v_item->>'expected_updated_at')::timestamptz;
    
    -- Check for optimistic locking conflict
    IF v_expected_updated_at IS NOT NULL THEN
      SELECT updated_at INTO v_actual_updated_at
      FROM public.scope_block_cost_items
      WHERE id = v_id;
      
      IF v_actual_updated_at IS NOT NULL AND v_actual_updated_at > v_expected_updated_at THEN
        -- Conflict detected - return error for this item
        v_result := jsonb_build_object(
          'id', v_id,
          'success', false,
          'error', 'CONFLICT',
          'server_updated_at', v_actual_updated_at
        );
        v_results := v_results || v_result;
        CONTINUE;
      END IF;
    END IF;
    
    -- Perform the update
    UPDATE public.scope_block_cost_items
    SET
      category = COALESCE((v_item->>'category'), category),
      cost_code_id = CASE 
        WHEN v_item ? 'cost_code_id' THEN (v_item->>'cost_code_id')::uuid
        ELSE cost_code_id
      END,
      description = COALESCE((v_item->>'description'), description),
      quantity = COALESCE((v_item->>'quantity')::numeric, quantity),
      unit = COALESCE((v_item->>'unit'), unit),
      unit_price = COALESCE((v_item->>'unit_price')::numeric, unit_price),
      markup_percent = COALESCE((v_item->>'markup_percent')::numeric, markup_percent),
      area_label = CASE 
        WHEN v_item ? 'area_label' THEN (v_item->>'area_label')
        ELSE area_label
      END,
      group_label = CASE 
        WHEN v_item ? 'group_label' THEN (v_item->>'group_label')
        ELSE group_label
      END,
      sort_order = COALESCE((v_item->>'sort_order')::int, sort_order),
      scope_block_id = COALESCE((v_item->>'scope_block_id')::uuid, scope_block_id)
    WHERE id = v_id
    RETURNING jsonb_build_object(
      'id', id,
      'success', true,
      'updated_at', updated_at,
      'line_total', line_total
    ) INTO v_result;
    
    IF v_result IS NULL THEN
      v_result := jsonb_build_object(
        'id', v_id,
        'success', false,
        'error', 'NOT_FOUND'
      );
    END IF;
    
    v_results := v_results || v_result;
  END LOOP;
  
  RETURN v_results;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.batch_upsert_cost_items(jsonb) TO authenticated;

-- 5) Add index for optimistic locking queries
CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_updated_at 
  ON public.scope_block_cost_items (id, updated_at);

-- 6) Add index for scope_block lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_scope_block_sort
  ON public.scope_block_cost_items (scope_block_id, sort_order);

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT proname FROM pg_proc WHERE proname = 'batch_upsert_cost_items';
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.scope_block_cost_items'::regclass;

