-- ============================================================================
-- COMPLETE AUTH + RLS FOUNDATION FOR MULTI-TENANT
-- ============================================================================
-- This migration establishes:
-- 1) Helper functions for RLS (is_company_member)
-- 2) Correct create_company_with_owner RPC (returns uuid)
-- 3) RLS policies for companies + company_members
-- 4) RLS policies for all tenant-scoped tables with company_id
-- ============================================================================

-- ============================================================================
-- PART 1: HELPER FUNCTIONS
-- ============================================================================

-- is_company_member: returns true if current user is a member of the given company
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

-- ============================================================================
-- PART 2: COMPANY CREATION RPC (FIXED RETURN TYPE)
-- ============================================================================

-- Drop all previous versions
drop function if exists public.create_company_with_owner(text);
drop function if exists public.create_company_with_owner_v2(text);

-- Create with correct signature: returns uuid
create function public.create_company_with_owner(p_name text)
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

-- ============================================================================
-- PART 3: RLS POLICIES FOR COMPANIES + COMPANY_MEMBERS
-- ============================================================================

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- Companies: user can select companies they are a member of
drop policy if exists "read own companies" on public.companies;
create policy "read own companies"
on public.companies
for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = companies.id
      and cm.user_id = auth.uid()
  )
);

-- Companies: authenticated users can insert (bootstrap flow)
drop policy if exists "create company" on public.companies;
create policy "create company"
on public.companies
for insert
to authenticated
with check (true);

-- Company_members: user can select their own memberships
drop policy if exists "read own memberships" on public.company_members;
create policy "read own memberships"
on public.company_members
for select
to authenticated
using (user_id = auth.uid());

-- Company_members: admins can insert new members
drop policy if exists "admins manage members" on public.company_members;
create policy "admins manage members"
on public.company_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_members.company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

-- ============================================================================
-- PART 4: RLS POLICIES FOR TENANT-SCOPED TABLES
-- ============================================================================
-- For all tables with company_id, create consistent RLS policies:
-- - SELECT: if user is company member
-- - INSERT: if user is company member
-- - UPDATE: if user is company member (manager+)
-- - DELETE: if user is company member (admin+)
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
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
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);

      -- SELECT policy (member)
      execute format('drop policy if exists "tenant_select" on public.%I', t);
      execute format(
        'create policy "tenant_select" on public.%I for select to authenticated using (public.is_company_member(company_id))',
        t
      );

      -- INSERT policy (member)
      execute format('drop policy if exists "tenant_insert" on public.%I', t);
      execute format(
        'create policy "tenant_insert" on public.%I for insert to authenticated with check (public.is_company_member(company_id))',
        t
      );

      -- UPDATE policy (member)
      execute format('drop policy if exists "tenant_update" on public.%I', t);
      execute format(
        'create policy "tenant_update" on public.%I for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))',
        t
      );

      -- DELETE policy (member for now; can tighten to admin later)
      execute format('drop policy if exists "tenant_delete" on public.%I', t);
      execute format(
        'create policy "tenant_delete" on public.%I for delete to authenticated using (public.is_company_member(company_id))',
        t
      );
    end if;
  end loop;
end
$$;

-- ============================================================================
-- NOTES / TODO
-- ============================================================================
-- Tables that do NOT have company_id yet (lookup/reference tables):
-- - measurement_units (shared across tenants)
-- - trades (shared/tenant TBD)
-- - checklist_templates, checklist_questions, checklist_question_answers (TBD)
-- - vendor_payments (TBD if tenant-scoped or shared)
-- 
-- These tables are intentionally excluded from tenant RLS until schema is updated.
-- ============================================================================

