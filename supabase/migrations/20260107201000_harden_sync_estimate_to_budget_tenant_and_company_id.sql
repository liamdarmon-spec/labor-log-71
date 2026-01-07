-- ============================================================================
-- Harden sync_estimate_to_budget for tenant safety + canonical company_id
--
-- Launch safety fixes:
-- - SECURITY DEFINER functions must enforce tenant membership internally.
-- - Inserts must set company_id explicitly (avoid NULL rows that become RLS-invisible).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id uuid;
  v_budget_id uuid;
  v_scope_count bigint;
  v_company_id uuid;
  v_project_company_id uuid;
BEGIN
  -- 1) Load estimate + tenant boundary and validate access
  SELECT e.project_id, e.company_id
  INTO v_project_id, v_company_id
  FROM public.estimates e
  WHERE e.id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate % not found', p_estimate_id;
  END IF;

  -- Defensive: enforce membership (SECURITY DEFINER bypasses RLS)
  IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT p.company_id
  INTO v_project_company_id
  FROM public.projects p
  WHERE p.id = v_project_id;

  IF v_project_company_id IS NULL OR v_project_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company mismatch for estimate/project';
  END IF;

  -- 2) Ensure there is a project_budgets header (company_id must be set)
  SELECT id INTO v_budget_id
  FROM public.project_budgets
  WHERE project_id = v_project_id;

  IF v_budget_id IS NULL THEN
    INSERT INTO public.project_budgets (
      project_id,
      name,
      status,
      created_at,
      updated_at,
      company_id
    )
    VALUES (
      v_project_id,
      'Main Budget',
      'active',
      now(),
      now(),
      v_company_id
    )
    RETURNING id INTO v_budget_id;
  ELSE
    -- Backfill header company_id if missing (legacy)
    UPDATE public.project_budgets
    SET company_id = COALESCE(company_id, v_company_id),
        updated_at = now()
    WHERE id = v_budget_id;
  END IF;

  -- 3) Detect if this estimate uses scope blocks
  SELECT COUNT(*) INTO v_scope_count
  FROM public.scope_blocks sb
  JOIN public.scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
  WHERE sb.entity_type = 'estimate'
    AND sb.entity_id = p_estimate_id;

  -- 4) Remove existing budget lines from this estimate (scoped to this tenant)
  DELETE FROM public.project_budget_lines
  WHERE project_budget_id = v_budget_id
    AND source_estimate_id = p_estimate_id;

  -- 5) Insert budget lines (company_id explicit)
  IF v_scope_count > 0 THEN
    -- NEW SYSTEM: scope_blocks + scope_block_cost_items
    INSERT INTO public.project_budget_lines (
      project_id, project_budget_id, group_id, cost_code_id,
      scope_type, line_type, category,
      description_internal, description_client,
      qty, unit, unit_cost, budget_amount,
      budget_hours, markup_pct, tax_pct, allowance_cap,
      is_optional, is_allowance, client_visible, sort_order,
      internal_notes, change_order_id, source_estimate_id,
      created_at, updated_at,
      company_id
    )
    SELECT
      v_project_id, v_budget_id, NULL,
      sbci.cost_code_id,
      'base',
      CASE
        WHEN lower(sbci.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(sbci.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(sbci.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      CASE
        WHEN lower(sbci.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(sbci.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(sbci.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      sbci.description, sbci.description,
      COALESCE(sbci.quantity, 1), COALESCE(sbci.unit, 'ea'),
      COALESCE(sbci.unit_price, 0),
      COALESCE(
        sbci.line_total,
        COALESCE(sbci.quantity,1) * COALESCE(sbci.unit_price,0)
      ),
      NULL,
      sbci.markup_percent,
      NULL, NULL,
      FALSE, FALSE, TRUE,
      COALESCE(sbci.sort_order, 0),
      sbci.notes,
      NULL,
      p_estimate_id,
      now(), now(),
      v_company_id
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
    WHERE sb.entity_type = 'estimate'
      AND sb.entity_id = p_estimate_id
      AND (sb.is_visible IS DISTINCT FROM FALSE);
  ELSE
    -- LEGACY SYSTEM: estimate_items
    INSERT INTO public.project_budget_lines (
      project_id, project_budget_id, group_id, cost_code_id,
      scope_type, line_type, category,
      description_internal, description_client,
      qty, unit, unit_cost, budget_amount,
      budget_hours, markup_pct, tax_pct, allowance_cap,
      is_optional, is_allowance, client_visible, sort_order,
      internal_notes, change_order_id, source_estimate_id,
      created_at, updated_at,
      company_id
    )
    SELECT
      v_project_id, v_budget_id, NULL,
      ei.cost_code_id,
      'base',
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      string_agg(ei.description, ' | '),
      string_agg(ei.description, ' | '),
      SUM(COALESCE(ei.quantity, 1)),
      MAX(COALESCE(ei.unit, 'ea')),
      CASE WHEN SUM(COALESCE(ei.quantity,1)) > 0
           THEN SUM(
             COALESCE(ei.line_total,
               COALESCE(ei.quantity,1) * COALESCE(ei.unit_price,0)
             )
           ) / SUM(COALESCE(ei.quantity,1))
           ELSE 0 END,
      SUM(
        COALESCE(ei.line_total,
          COALESCE(ei.quantity,1) * COALESCE(ei.unit_price,0)
        )
      ),
      SUM(COALESCE(ei.planned_hours, 0)),
      NULL, NULL, NULL,
      FALSE,
      BOOL_OR(COALESCE(ei.is_allowance, FALSE)),
      TRUE, 0,
      NULL, NULL,
      p_estimate_id,
      now(), now(),
      v_company_id
    FROM public.estimate_items ei
    WHERE ei.estimate_id = p_estimate_id
    GROUP BY
      ei.cost_code_id,
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END;
  END IF;

  -- 6) Roll up totals (scoped to the header we just ensured)
  UPDATE public.project_budgets pb
  SET
    labor_budget = COALESCE(sub.labor_total,0),
    subs_budget = COALESCE(sub.subs_total,0),
    materials_budget = COALESCE(sub.materials_total,0),
    other_budget = COALESCE(sub.other_total,0),
    baseline_estimate_id = p_estimate_id,
    company_id = COALESCE(pb.company_id, v_company_id),
    updated_at = now()
  FROM (
    SELECT
      project_budget_id,
      SUM(CASE WHEN category = 'labor' THEN budget_amount ELSE 0 END) AS labor_total,
      SUM(CASE WHEN category = 'subs' THEN budget_amount ELSE 0 END) AS subs_total,
      SUM(CASE WHEN category = 'materials' THEN budget_amount ELSE 0 END) AS materials_total,
      SUM(CASE WHEN category NOT IN ('labor','subs','materials')
               THEN budget_amount ELSE 0 END) AS other_total
    FROM public.project_budget_lines
    WHERE project_budget_id = v_budget_id
    GROUP BY project_budget_id
  ) sub
  WHERE pb.id = v_budget_id;

  -- 7) Mark this estimate as the single active budget source
  UPDATE public.estimates
  SET is_budget_source = FALSE
  WHERE project_id = v_project_id
    AND id <> p_estimate_id;

  UPDATE public.estimates
  SET
    is_budget_source = TRUE,
    status = 'accepted',
    approved_at = COALESCE(approved_at, now()),
    updated_at = now()
  WHERE id = p_estimate_id;
END;
$$;


