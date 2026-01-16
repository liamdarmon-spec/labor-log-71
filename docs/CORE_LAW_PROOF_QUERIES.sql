-- =============================================================================
-- Core Law Proof Pack (copy/paste into Supabase SQL editor)
-- =============================================================================
-- Goals:
-- - Prove outcomes immutability (UPDATE/DELETE blocked)
-- - Prove registry validation (invalid outcome_type rejected)
-- - Prove tenant safety guardrails (no cross-tenant inference)
-- - Prove derived state is computed (not stored)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Healthcheck (schema-cache boringness)
-- ---------------------------------------------------------------------------
select public.core_law_healthcheck();

-- ---------------------------------------------------------------------------
-- 1) Show canonical Core Law objects exist
-- ---------------------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema='public' and table_name in ('outcomes','state_rules','outcome_type_registry');

select table_name
from information_schema.views
where table_schema='public' and table_name in ('subject_states');

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and proname in ('record_outcome','list_outcomes','get_subject_state','get_available_outcome_types','list_subject_states','core_law_healthcheck')
order by proname;

-- ---------------------------------------------------------------------------
-- 2) Registry: available outcomes for project/proposal
-- ---------------------------------------------------------------------------
select * from public.get_available_outcome_types('project');
select * from public.get_available_outcome_types('proposal');

-- ---------------------------------------------------------------------------
-- 3) Prove record_outcome rejects invalid outcome types
-- ---------------------------------------------------------------------------
-- Expected: ERROR: Invalid outcome_type ...
select public.record_outcome(
  p_subject_type := 'project',
  p_subject_id := gen_random_uuid(),
  p_outcome_type := 'made_up_outcome_type'
);

-- ---------------------------------------------------------------------------
-- 4) Prove non-repeatable outcomes cannot duplicate
-- ---------------------------------------------------------------------------
-- Choose a real project_id you have access to:
-- replace '<project_id>' with a UUID from public.projects
-- Step A: record a non-repeatable outcome (e.g. work_completed)
select public.record_outcome('project', '<project_id>'::uuid, 'work_completed');

-- Step B: record it again (Expected: ERROR: not repeatable and already exists)
select public.record_outcome('project', '<project_id>'::uuid, 'work_completed');

-- ---------------------------------------------------------------------------
-- 5) Prove outcomes immutability
-- ---------------------------------------------------------------------------
-- Pick an outcome row you can see:
select id, company_id, subject_type, subject_id, outcome_type, occurred_at, created_at
from public.outcomes
where company_id = any(public.authed_company_ids())
order by created_at desc
limit 5;

-- Attempt UPDATE (Expected: ERROR from trigger or RLS)
update public.outcomes
set outcome_type = outcome_type
where id = (select id from public.outcomes where company_id = any(public.authed_company_ids()) order by created_at desc limit 1);

-- Attempt DELETE (Expected: ERROR from trigger or RLS)
delete from public.outcomes
where id = (select id from public.outcomes where company_id = any(public.authed_company_ids()) order by created_at desc limit 1);

-- ---------------------------------------------------------------------------
-- 6) Prove derived state is computed (view) and consistent
-- ---------------------------------------------------------------------------
-- For a project with outcomes:
select * from public.get_subject_state('project', '<project_id>'::uuid);
select * from public.list_outcomes('project', '<project_id>'::uuid, 50);

-- Batch fetch (used by Tasks page to avoid N+1):
select *
from public.list_subject_states(
  jsonb_build_array(
    jsonb_build_object('subject_type','project','subject_id','<project_id>'::uuid)
  )
);


