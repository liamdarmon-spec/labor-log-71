-- ============================================================================
-- Tenant company_id autofill from project_id (trigger-based)
-- ============================================================================
-- Goal:
-- - For any table that has BOTH (project_id, company_id), ensure company_id is
--   automatically inferred from public.projects.company_id when missing.
-- - Hard-fail if company_id cannot be resolved from project_id.
--
-- Notes:
-- - Does NOT cover tables without project_id (invoice_id-only, etc.)
-- - Uses CREATE OR REPLACE only (do NOT drop RLS-dependent functions)
-- ============================================================================

-- 1) Trigger function: infer NEW.company_id from projects.company_id
create or replace function public.tg_set_company_id_from_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  -- If project_id is present and company_id is missing, infer it
  if new.project_id is not null and new.company_id is null then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    new.company_id := v_company_id;

    if new.company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;
  end if;

  -- If project_id changes on UPDATE, ensure company_id matches the project
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;

    -- If company_id is missing OR mismatched after a project change, enforce it
    if new.company_id is null or new.company_id is distinct from v_company_id then
      new.company_id := v_company_id;
    end if;
  end if;

  -- If UPDATE explicitly sets company_id to NULL while project_id exists, re-infer or fail
  if tg_op = 'UPDATE' and new.project_id is not null and new.company_id is null then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    new.company_id := v_company_id;

    if new.company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;
  end if;

  return new;
end;
$$;

-- 2) Attach trigger to ALL public tables that have BOTH company_id and project_id
do $$
declare
  r record;
begin
  for r in
    select t.table_name
    from information_schema.tables t
    join information_schema.columns c
      on c.table_schema = t.table_schema
     and c.table_name   = t.table_name
    where t.table_schema = 'public'
      and t.table_type   = 'BASE TABLE'        -- ✅ prevents views like material_actuals_by_project
      and c.column_name in ('company_id', 'project_id')
      and t.table_name <> 'projects'
    group by t.table_name
    having count(distinct c.column_name) = 2
  loop
    execute format('drop trigger if exists set_company_id_from_project on public.%I;', r.table_name);
    execute format(
      'create trigger set_company_id_from_project
       before insert or update of project_id, company_id
       on public.%I
       for each row
       execute function public.tg_set_company_id_from_project();',
      r.table_name
    );
  end loop;
end;
$$;

-- 3) Verification query (commented out; for manual inspection)
-- select
--   n.nspname as schema,
--   c.relname as table,
--   t.tgname as trigger
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and t.tgname = 'set_company_id_from_project'
--   and not t.tgisinternal
-- order by 1, 2;

-- Local reminder:
-- - Run: yes | npm run db:reset
-- - Then deploy migrations to remote (Supabase) as usual.


