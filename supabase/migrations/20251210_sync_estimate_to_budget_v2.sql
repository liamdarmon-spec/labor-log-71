--------------------------------------------------
-- FILE: supabase/migrations/20251210_sync_estimate_to_budget_v2.sql
--------------------------------------------------
-- New canonical estimate → budget sync function (v2)
-- WARNING: If your column names differ, update them before running.

create or replace function public.normalize_line_type(p_category text)
returns text
language plpgsql
as $$
declare
  v_cat text := lower(coalesce(p_category, ''));
begin
  if v_cat like '%lab%' then
    return 'labor';
  elsif v_cat like '%sub%' then
    return 'subs';
  elsif v_cat like '%mat%' then
    return 'materials';
  elsif v_cat like '%equip%' or v_cat like '%equipm%' then
    return 'equipment';
  else
    return 'other';
  end if;
end;
$$;

create or replace function public.sync_estimate_to_budget_v2(
  p_project_id uuid,
  p_estimate_id uuid,
  p_mode text default 'merge'
)
returns jsonb
language plpgsql
as $$
declare
  v_budget_id uuid;
  v_estimate public.estimates%rowtype;
  v_is_change_order boolean;
  v_uses_scope_blocks boolean;
begin
  -- 1. Validate estimate
  select *
  into v_estimate
  from public.estimates
  where id = p_estimate_id;

  if not found then
    raise exception 'Estimate not found';
  end if;

  if v_estimate.project_id <> p_project_id then
    raise exception 'Estimate does not belong to this project';
  end if;

  v_is_change_order := (v_estimate.status = 'change_order')
    or coalesce((v_estimate.settings ->> 'is_change_order')::boolean, false);

  -- 2. Replace mode: archive active budget + delete its lines
  if p_mode = 'replace' then
    update public.project_budgets
    set status = 'archived',
        updated_at = now()
    where project_id = p_project_id
      and status = 'active'
    returning id into v_budget_id;

    if v_budget_id is not null then
      delete from public.project_budget_lines
      where project_budget_id = v_budget_id;
    end if;

    -- reset so we create a clean active budget
    v_budget_id := null;
  end if;

  -- 3. Ensure there is an active budget
  if v_budget_id is null then
    select id
    into v_budget_id
    from public.project_budgets
    where project_id = p_project_id
      and status = 'active'
    order by created_at desc
    limit 1;
  end if;

  if v_budget_id is null then
    insert into public.project_budgets (project_id, status, created_at, updated_at)
    values (p_project_id, 'active', now(), now())
    returning id into v_budget_id;
  end if;

  -- 4. Merge mode: delete prior lines from this estimate on this budget
  if p_mode = 'merge' then
    delete from public.project_budget_lines
    where project_budget_id = v_budget_id
      and source_estimate_id = p_estimate_id;
  end if;

  -- 5. Detect if estimate uses scope_blocks (new system)
  select exists (
    select 1
    from public.scope_blocks sb
    where sb.entity_type = 'estimate'
      and sb.entity_id = p_estimate_id
      and sb.is_visible = true
  )
  into v_uses_scope_blocks;

  -- 6. Insert lines from scope_blocks (new path)
  if v_uses_scope_blocks then
    insert into public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      category,
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
      source_estimate_id,
      change_order_id
    )
    select
      p_project_id as project_id,
      v_budget_id as project_budget_id,
      null as group_id,
      sbci.cost_code_id,
      case
        when sb.block_type = 'change_order' or v_is_change_order then 'change_order'
        else 'base'
      end as scope_type,
      public.normalize_line_type(sbci.category) as line_type,
      public.normalize_line_type(sbci.category) as category,
      coalesce(sbci.description, '') as description_internal,
      coalesce(sbci.description, '') as description_client,
      coalesce(sbci.quantity, 1) as qty,
      sbci.unit,
      coalesce(sbci.unit_price, 0)::numeric as unit_cost,
      coalesce(sbci.line_total,
               coalesce(sbci.quantity, 1) * coalesce(sbci.unit_price, 0)
      )::numeric as budget_amount,
      null::numeric as budget_hours,
      sbci.markup_percent,
      null::numeric as tax_pct,
      null::numeric as allowance_cap,
      false as is_optional,
      false as is_allowance,
      true as client_visible,
      coalesce(sbci.sort_order, 0) as sort_order,
      sbci.notes as internal_notes,
      p_estimate_id as source_estimate_id,
      case
        when sb.block_type = 'change_order' or v_is_change_order then p_estimate_id
        else null
      end as change_order_id
    from public.scope_blocks sb
    join public.scope_block_cost_items sbci
      on sbci.scope_block_id = sb.id
    where sb.entity_type = 'estimate'
      and sb.entity_id = p_estimate_id
      and sb.is_visible = true;

  else
    -- 7. Legacy path: aggregate estimate_items
    insert into public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      category,
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
      source_estimate_id,
      change_order_id
    )
    select
      p_project_id as project_id,
      v_budget_id as project_budget_id,
      null as group_id,
      ei.cost_code_id,
      case when v_is_change_order then 'change_order' else 'base' end as scope_type,
      public.normalize_line_type(ei.category) as line_type,
      public.normalize_line_type(ei.category) as category,
      string_agg(coalesce(ei.description, ''), ' | ') as description_internal,
      string_agg(coalesce(ei.description, ''), ' | ') as description_client,
      sum(coalesce(ei.quantity, 1)) as qty,
      coalesce(max(ei.unit), 'ea') as unit,
      case
        when sum(coalesce(ei.quantity, 1)) > 0
          then sum(
                 coalesce(ei.line_total,
                   coalesce(ei.quantity, 1) * coalesce(ei.unit_price, 0)
                 )
               ) / sum(coalesce(ei.quantity, 1))
        else 0
      end::numeric as unit_cost,
      sum(
        coalesce(ei.line_total,
          coalesce(ei.quantity, 1) * coalesce(ei.unit_price, 0)
        )
      )::numeric as budget_amount,
      sum(coalesce(ei.planned_hours, 0))::numeric as budget_hours,
      null::numeric as markup_pct,
      null::numeric as tax_pct,
      null::numeric as allowance_cap,
      false as is_optional,
      bool_or(coalesce(ei.is_allowance, false)) as is_allowance,
      true as client_visible,
      0 as sort_order,
      null::text as internal_notes,
      p_estimate_id as source_estimate_id,
      case when v_is_change_order then p_estimate_id else null end as change_order_id
    from public.estimate_items ei
    where ei.estimate_id = p_estimate_id
    group by
      ei.cost_code_id,
      public.normalize_line_type(ei.category);
  end if;

  -- 8. Recalculate budget totals (labor/subs/materials/equipment/other)
  with sums as (
    select
      coalesce(sum(case when line_type = 'labor' then budget_amount else 0 end), 0) as labor_budget,
      coalesce(sum(case when line_type = 'subs' then budget_amount else 0 end), 0) as subs_budget,
      coalesce(sum(case when line_type = 'materials' then budget_amount else 0 end), 0) as materials_budget,
      coalesce(sum(case when line_type = 'equipment' then budget_amount else 0 end), 0) as equipment_budget,
      coalesce(sum(case when line_type not in ('labor', 'subs', 'materials', 'equipment')
                        then budget_amount else 0 end), 0) as other_budget
    from public.project_budget_lines
    where project_budget_id = v_budget_id
  )
  update public.project_budgets pb
  set labor_budget = s.labor_budget,
      subs_budget = s.subs_budget,
      materials_budget = s.materials_budget,
      -- For now, we roll equipment into "other_budget" until a dedicated column exists.
      other_budget = s.other_budget + s.equipment_budget,
      baseline_estimate_id = case
        when p_mode = 'replace' then p_estimate_id
        else pb.baseline_estimate_id
      end,
      updated_at = now()
  from sums s
  where pb.id = v_budget_id;

  return jsonb_build_object(
    'budget_id', v_budget_id,
    'estimate_id', p_estimate_id,
    'mode', p_mode
  );
end;
$$;

--------------------------------------------------
