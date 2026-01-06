-- ============================================================================
-- db: canonical estimate autosave
-- ============================================================================
-- Goals:
-- - Deterministic draft write path via ONE RPC: public.upsert_estimate_draft(...)
-- - Tenant-safe: explicit membership + project/company verification
-- - Performance: debounced client autosave; this RPC is single round-trip upsert
-- - No duplicates: client provides stable estimate_id (uuid) and updates the same row
-- - Optional legacy support: public.replace_estimate_items(...) for estimate_items
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Columns / triggers
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_null_count int;
BEGIN
  -- Ensure company_id exists on estimates and is NOT NULL (tenant scope)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='estimates' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.estimates ADD COLUMN company_id uuid;
  END IF;

  -- Backfill estimates.company_id from projects when missing
  UPDATE public.estimates e
  SET company_id = pr.company_id
  FROM public.projects pr
  WHERE e.company_id IS NULL
    AND pr.id = e.project_id;

  SELECT COUNT(*) INTO v_null_count FROM public.estimates WHERE company_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce estimates.company_id NOT NULL: % rows still NULL', v_null_count;
  END IF;

  ALTER TABLE public.estimates ALTER COLUMN company_id SET NOT NULL;

  -- Draft payload storage (for JSON model)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='estimates' AND column_name='draft_payload'
  ) THEN
    ALTER TABLE public.estimates ADD COLUMN draft_payload jsonb;
  END IF;

  -- Monotonic draft version for optimistic locking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='estimates' AND column_name='draft_version'
  ) THEN
    ALTER TABLE public.estimates ADD COLUMN draft_version integer NOT NULL DEFAULT 0;
  END IF;

  -- created_by default (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='estimates' AND column_name='created_by'
  ) THEN
    BEGIN
      ALTER TABLE public.estimates ALTER COLUMN created_by SET DEFAULT public.authed_user_id();
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  -- estimate_items tenant scope if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='estimate_items'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='estimate_items' AND column_name='company_id'
    ) THEN
      ALTER TABLE public.estimate_items ADD COLUMN company_id uuid;
    END IF;

    -- Backfill estimate_items.company_id from estimates
    UPDATE public.estimate_items ei
    SET company_id = e.company_id
    FROM public.estimates e
    WHERE ei.company_id IS NULL
      AND e.id = ei.estimate_id;

    SELECT COUNT(*) INTO v_null_count FROM public.estimate_items WHERE company_id IS NULL;
    IF v_null_count > 0 THEN
      RAISE EXCEPTION 'Cannot enforce estimate_items.company_id NOT NULL: % rows still NULL', v_null_count;
    END IF;

    ALTER TABLE public.estimate_items ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- updated_at trigger for estimates (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at_estimates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_estimates ON public.estimates;
CREATE TRIGGER set_updated_at_estimates
BEFORE UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at_estimates();

-- updated_at trigger for estimate_items (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='estimate_items'
  ) THEN
    CREATE OR REPLACE FUNCTION public.tg_set_updated_at_estimate_items()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS set_updated_at_estimate_items ON public.estimate_items;
    CREATE TRIGGER set_updated_at_estimate_items
    BEFORE UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at_estimate_items();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Canonical RPC: upsert_estimate_draft
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer);

CREATE OR REPLACE FUNCTION public.upsert_estimate_draft(
  p_company_id uuid,
  p_estimate_id uuid,
  p_project_id uuid,
  p_payload jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS TABLE (
  estimate_id uuid,
  draft_version integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_existing public.estimates;
  v_project_company uuid;
  v_title text;
  v_status text;
  v_settings jsonb;
BEGIN
  IF p_company_id IS NULL THEN RAISE EXCEPTION 'p_company_id is required'; END IF;
  IF p_estimate_id IS NULL THEN RAISE EXCEPTION 'p_estimate_id is required'; END IF;
  IF p_project_id IS NULL THEN RAISE EXCEPTION 'p_project_id is required'; END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  -- Verify project belongs to company (prevents cross-tenant write)
  SELECT company_id INTO v_project_company
  FROM public.projects
  WHERE id = p_project_id;

  IF v_project_company IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;
  IF v_project_company <> p_company_id THEN
    RAISE EXCEPTION 'project % does not belong to company %', p_project_id, p_company_id USING ERRCODE='42501';
  END IF;

  v_title := NULLIF(trim(COALESCE(p_payload->>'title', '')), '');
  v_settings := CASE WHEN jsonb_typeof(p_payload->'settings') = 'object' THEN p_payload->'settings' ELSE NULL END;
  v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'draft');

  SELECT * INTO v_existing
  FROM public.estimates
  WHERE id = p_estimate_id;

  IF FOUND THEN
    IF v_existing.company_id <> p_company_id THEN
      RAISE EXCEPTION 'estimate % does not belong to company %', p_estimate_id, p_company_id USING ERRCODE='42501';
    END IF;
    IF v_existing.project_id <> p_project_id THEN
      RAISE EXCEPTION 'estimate % project mismatch', p_estimate_id;
    END IF;
    IF v_existing.status <> 'draft' THEN
      RAISE EXCEPTION 'estimate % is not draft', p_estimate_id;
    END IF;

    IF p_expected_version IS NOT NULL AND v_existing.draft_version <> p_expected_version THEN
      RAISE EXCEPTION 'estimate_version_conflict'
        USING ERRCODE='40001',
              DETAIL = format('expected %s, actual %s', p_expected_version, v_existing.draft_version);
    END IF;

    UPDATE public.estimates
    SET
      draft_payload = p_payload,
      draft_version = v_existing.draft_version + 1,
      title = COALESCE(v_title, title),
      settings = COALESCE(v_settings, settings)
    WHERE id = p_estimate_id
    RETURNING id, draft_version, updated_at
    INTO estimate_id, draft_version, updated_at;

    RETURN;
  END IF;

  INSERT INTO public.estimates (
    id,
    company_id,
    project_id,
    title,
    status,
    subtotal_amount,
    tax_amount,
    total_amount,
    is_budget_source,
    settings,
    draft_payload,
    draft_version,
    created_by
  )
  VALUES (
    p_estimate_id,
    p_company_id,
    p_project_id,
    COALESCE(v_title, 'Draft Estimate'),
    'draft',
    COALESCE((p_payload->>'subtotal_amount')::numeric, 0),
    COALESCE((p_payload->>'tax_amount')::numeric, 0),
    COALESCE((p_payload->>'total_amount')::numeric, 0),
    COALESCE((p_payload->>'is_budget_source')::boolean, false),
    COALESCE(v_settings, '{}'::jsonb),
    p_payload,
    1,
    public.authed_user_id()
  )
  RETURNING id, draft_version, updated_at
  INTO estimate_id, draft_version, updated_at;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) TO authenticated;

COMMENT ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) IS
  'Canonical draft upsert for estimate autosave. Deterministic id, tenant checks, draft_version optimistic locking.';

-- ----------------------------------------------------------------------------
-- 3) Optional RPC: replace_estimate_items (legacy table)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.replace_estimate_items(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.replace_estimate_items(
  p_company_id uuid,
  p_estimate_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_est public.estimates;
  v_item jsonb;
  v_cost_code_id uuid;
  v_cc_ok boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='estimate_items'
  ) THEN
    RAISE EXCEPTION 'estimate_items table does not exist in this schema';
  END IF;

  IF p_company_id IS NULL OR p_estimate_id IS NULL THEN
    RAISE EXCEPTION 'p_company_id and p_estimate_id are required';
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_est FROM public.estimates WHERE id = p_estimate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'estimate not found: %', p_estimate_id;
  END IF;
  IF v_est.company_id <> p_company_id THEN
    RAISE EXCEPTION 'estimate % does not belong to company %', p_estimate_id, p_company_id USING ERRCODE='42501';
  END IF;
  IF v_est.status <> 'draft' THEN
    RAISE EXCEPTION 'estimate % is not draft', p_estimate_id;
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a jsonb array';
  END IF;

  DELETE FROM public.estimate_items WHERE estimate_id = p_estimate_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_cost_code_id := NULLIF(v_item->>'cost_code_id', '')::uuid;

    -- Validate cost_code_id is canonical (tenant scoped, active, trade-linked, non-legacy when supported)
    SELECT EXISTS (
      SELECT 1
      FROM public.cost_codes cc
      WHERE cc.id = v_cost_code_id
        AND cc.company_id = p_company_id
        AND cc.is_active = true
        AND cc.trade_id IS NOT NULL
        AND (NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='cost_codes' AND column_name='is_legacy'
        ) OR cc.is_legacy = false)
    ) INTO v_cc_ok;

    IF v_cost_code_id IS NULL OR NOT v_cc_ok THEN
      RAISE EXCEPTION 'Invalid cost_code_id for estimate item: %', COALESCE(v_item->>'cost_code_id', 'NULL');
    END IF;

    INSERT INTO public.estimate_items (
      company_id,
      estimate_id,
      description,
      category,
      cost_code_id,
      quantity,
      unit,
      unit_price,
      line_total,
      trade_id,
      area_name,
      group_label,
      scope_group,
      is_allowance,
      planned_hours
    )
    VALUES (
      p_company_id,
      p_estimate_id,
      COALESCE(v_item->>'description',''),
      NULLIF(v_item->>'category',''),
      v_cost_code_id,
      COALESCE((v_item->>'quantity')::numeric, 0),
      NULLIF(v_item->>'unit',''),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'line_total')::numeric, 0),
      NULLIF(v_item->>'trade_id','')::uuid,
      NULLIF(v_item->>'area_name',''),
      NULLIF(v_item->>'group_label',''),
      NULLIF(v_item->>'scope_group',''),
      COALESCE((v_item->>'is_allowance')::boolean, false),
      NULLIF(v_item->>'planned_hours','')::numeric
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_estimate_items(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_estimate_items(uuid, uuid, jsonb) TO authenticated;

COMMIT;


