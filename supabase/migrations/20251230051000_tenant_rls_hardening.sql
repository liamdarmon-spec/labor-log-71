-- ============================================================================
-- TENANT RLS HARDENING (production-ready)
-- ============================================================================
-- Goals:
-- - Ensure helper + RPC exist (idempotent)
-- - Ensure RLS enabled on companies, company_members, and all company_id tables
-- - Ensure consistent tenant_* policies on company_id tables
-- - Prefer "no direct insert" into companies/company_members (use RPC)
-- ============================================================================

-- 1) Helper function: is_company_member(uuid) -> boolean
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;

-- 2) RPC: create_company_with_owner(text) -> uuid
-- Drop only the RPC(s) (safe: should not be referenced by RLS policies)
drop function if exists public.create_company_with_owner_v2(text);
drop function if exists public.create_company_with_owner(text);

create or replace function public.create_company_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name)
  values (p_name)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'owner');

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_owner(text) from public;
grant execute on function public.create_company_with_owner(text) to authenticated;

-- 3) Companies + memberships: RLS enabled; minimum policies for app flow
alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- Prefer "no direct insert" into these tables; use RPC instead.
-- Drop any permissive insert policies we previously added.
drop policy if exists "create company" on public.companies;
drop policy if exists "company_companies_insert" on public.companies;
drop policy if exists "admins manage members" on public.company_members;
drop policy if exists "company_company_members_insert" on public.company_members;

-- Companies: user can select companies they are a member of
drop policy if exists "read own companies" on public.companies;
drop policy if exists "company_companies_select" on public.companies;
create policy "read own companies"
on public.companies
for select
to authenticated
using (public.is_company_member(id));

-- Company_members: user can select their own memberships
drop policy if exists "read own memberships" on public.company_members;
drop policy if exists "company_company_members_select" on public.company_members;
create policy "read own memberships"
on public.company_members
for select
to authenticated
using (user_id = auth.uid());

-- 4) Tenant-scoped tables: ensure RLS + tenant_* policies for any table with company_id
do $$
declare
  t text;
  has_company_id boolean;
begin
  foreach t in array array[
    -- Tier-1 + Phase-2 company_id tables
    'projects',
    'project_todos',
    'cost_codes',
    'costs',
    'invoices',
    'invoice_items',
    'customer_payments',
    'documents',
    'document_tags',
    'material_receipts',
    'material_vendors',
    'estimates',
    'estimate_items',
    'time_logs',
    'work_schedules',
    'workers',
    'day_cards',
    'day_card_jobs',
    'labor_pay_runs',
    'labor_pay_run_items',
    'proposal_templates',
    'proposal_images',
    'proposals',
    'proposal_events',
    'budget_revisions',
    'project_budget_lines',
    'project_budget_groups',
    'scope_blocks',
    'scope_block_cost_items',
    'activity_log',
    'entity_change_log',
    'archived_daily_logs',
    'bid_packages',
    'bid_invitations',
    'cost_entries',
    'daily_logs',
    'project_budgets',
    'scheduled_shifts',
    'schedule_of_values',
    'sub_contracts',
    'sub_invoices',
    'sub_scheduled_shifts',
    'time_log_allocations',
    'subs',
    'proposal_sections',
    'proposal_settings',
    'invitations'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'company_id'
    ) into has_company_id;

    if not has_company_id then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "tenant_select" on public.%I', t);
    execute format('drop policy if exists "tenant_insert" on public.%I', t);
    execute format('drop policy if exists "tenant_update" on public.%I', t);
    execute format('drop policy if exists "tenant_delete" on public.%I', t);

    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated using (public.is_company_member(company_id))',
      t
    );

    execute format(
      'create policy "tenant_insert" on public.%I for insert to authenticated with check (public.is_company_member(company_id))',
      t
    );

    execute format(
      'create policy "tenant_update" on public.%I for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))',
      t
    );

    execute format(
      'create policy "tenant_delete" on public.%I for delete to authenticated using (public.is_company_member(company_id))',
      t
    );
  end loop;
end
$$;


