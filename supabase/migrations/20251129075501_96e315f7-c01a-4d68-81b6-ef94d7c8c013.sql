CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_budget_id uuid;
  v_scope_count bigint;
BEGIN
  -- 1) Get the project for this estimate
  SELECT project_id INTO v_project_id
  FROM public.estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate % not found', p_estimate_id;
  END IF;

  -- 2) Ensure there is a project_budgets header
  SELECT id INTO v_budget_id
  FROM public.project_budgets
  WHERE project_id = v_project_id;

  IF v_budget_id IS NULL THEN
    INSERT INTO public.project_budgets (
      project_id,
      name,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_project_id,
      'Main Budget',
      'active',
      now(),
      now()
    )
    RETURNING id INTO v_budget_id;
  END IF;

  -- 3) Detect if this estimate uses scope blocks (new system)
  SELECT COUNT(*) INTO v_scope_count
  FROM public.scope_blocks sb
  JOIN public.scope_block_cost_items sbci
    ON sb.id = sbci.scope_block_id
  WHERE sb.entity_type = 'estimate'
    AND sb.entity_id = p_estimate_id;

  -- 4) Remove any existing budget lines tied to this estimate for this budget
  DELETE FROM public.project_budget_lines
  WHERE project_budget_id = v_budget_id
    AND source_estimate_id = p_estimate_id;

  -- 5) Insert budget lines from the appropriate source
  IF v_scope_count > 0 THEN
    ----------------------------------------------------------------
    -- NEW SYSTEM: scope_blocks + scope_block_cost_items
    ----------------------------------------------------------------
    INSERT INTO public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      description_internal,
      description_client,
      qty,
      unit,
      unit_cost,
      budget_amount,
      budget_hours,
      markup_pct,
      tax_pct,
      allowance_cap,
      is_optional,
      is_allowance,
      client_visible,
      sort_order,
      internal_notes,
      change_order_id,
      source_estimate_id,
      created_at,
      updated_at
    )
    SELECT
      v_project_id,
      v_budget_id,
      NULL::uuid AS group_id,
      sbci.cost_code_id,
      'base'::text AS scope_type,
      CASE
        WHEN lower(sbci.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(sbci.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(sbci.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END AS line_type,
      sbci.description AS description_internal,
      sbci.description AS description_client,
      COALESCE(sbci.quantity, 1) AS qty,
      COALESCE(sbci.unit, 'ea') AS unit,
      COALESCE(sbci.unit_price, 0) AS unit_cost,
      COALESCE(
        sbci.line_total,
        COALESCE(sbci.quantity, 1) * COALESCE(sbci.unit_price, 0)
      ) AS budget_amount,
      NULL::numeric AS budget_hours,
      sbci.markup_percent,
      NULL::numeric AS tax_pct,
      NULL::numeric AS allowance_cap,
      FALSE AS is_optional,
      FALSE AS is_allowance,
      TRUE AS client_visible,
      COALESCE(sbci.sort_order, 0) AS sort_order,
      sbci.notes AS internal_notes,
      NULL::uuid AS change_order_id,
      p_estimate_id AS source_estimate_id,
      now() AS created_at,
      now() AS updated_at
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci
      ON sb.id = sbci.scope_block_id
    WHERE sb.entity_type = 'estimate'
      AND sb.entity_id = p_estimate_id
      AND (sb.is_visible IS DISTINCT FROM FALSE);
  ELSE
    ----------------------------------------------------------------
    -- LEGACY SYSTEM: estimate_items
    -- Aggregate by (cost_code_id + normalized category)
    ----------------------------------------------------------------
    INSERT INTO public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      description_internal,
      description_client,
      qty,
      unit,
      unit_cost,
      budget_amount,
      budget_hours,
      markup_pct,
      tax_pct,
      allowance_cap,
      is_optional,
      is_allowance,
      client_visible,
      sort_order,
      internal_notes,
      change_order_id,
      source_estimate_id,
      created_at,
      updated_at
    )
    SELECT
      v_project_id,
      v_budget_id,
      NULL::uuid AS group_id,
      ei.cost_code_id,
      'base'::text AS scope_type,
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END AS line_type,
      string_agg(ei.description, ' | ') AS description_internal,
      string_agg(ei.description, ' | ') AS description_client,
      SUM(COALESCE(ei.quantity, 1)) AS qty,
      MAX(COALESCE(ei.unit, 'ea')) AS unit,
      CASE
        WHEN SUM(COALESCE(ei.quantity, 1)) > 0
        THEN
          SUM(
            COALESCE(
              ei.line_total,
              COALESCE(ei.quantity, 1) * COALESCE(ei.unit_price, 0)
            )
          ) / SUM(COALESCE(ei.quantity, 1))
        ELSE 0
      END AS unit_cost,
      SUM(
        COALESCE(
          ei.line_total,
          COALESCE(ei.quantity, 1) * COALESCE(ei.unit_price, 0)
        )
      ) AS budget_amount,
      SUM(COALESCE(ei.planned_hours, 0)) AS budget_hours,
      NULL::numeric AS markup_pct,
      NULL::numeric AS tax_pct,
      NULL::numeric AS allowance_cap,
      FALSE AS is_optional,
      BOOL_OR(COALESCE(ei.is_allowance, FALSE)) AS is_allowance,
      TRUE AS client_visible,
      0 AS sort_order,
      NULL::text AS internal_notes,
      NULL::uuid AS change_order_id,
      p_estimate_id AS source_estimate_id,
      now() AS created_at,
      now() AS updated_at
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

  ------------------------------------------------------------------
  -- 6) Roll up totals into project_budgets
  ------------------------------------------------------------------
  UPDATE public.project_budgets pb
  SET
    labor_budget = COALESCE(sub.labor_total, 0),
    subs_budget = COALESCE(sub.subs_total, 0),
    materials_budget = COALESCE(sub.materials_total, 0),
    other_budget = COALESCE(sub.other_total, 0),
    baseline_estimate_id = p_estimate_id,
    updated_at = now()
  FROM (
    SELECT
      project_budget_id,
      SUM(CASE WHEN line_type = 'labor' THEN budget_amount ELSE 0 END) AS labor_total,
      SUM(CASE WHEN line_type = 'subs' THEN budget_amount ELSE 0 END) AS subs_total,
      SUM(CASE WHEN line_type = 'materials' THEN budget_amount ELSE 0 END) AS materials_total,
      SUM(
        CASE
          WHEN line_type NOT IN ('labor', 'subs', 'materials')
          THEN budget_amount
          ELSE 0
        END
      ) AS other_total
    FROM public.project_budget_lines
    WHERE project_budget_id = v_budget_id
    GROUP BY project_budget_id
  ) sub
  WHERE pb.id = v_budget_id;

  ------------------------------------------------------------------
  -- 7) Mark this estimate as the single budget source for the project
  ------------------------------------------------------------------
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