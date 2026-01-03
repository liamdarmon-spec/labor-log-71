-- ============================================================================
-- Tenant backfill + company_id triggers + guardrails
-- ============================================================================
-- Goal:
-- - Backfill missing company_id on legacy rows (project child tables + key relations)
-- - Add triggers to auto-set company_id for new rows
-- - Add guardrails so company_id cannot silently remain NULL going forward
-- - Idempotent and safe to re-run
--
-- IMPORTANT:
-- - Do NOT drop is_company_member(uuid) (RLS depends on it)
-- - Use CREATE OR REPLACE only for shared functions
-- ============================================================================

-- ============================================================
-- 0) Helper: Set company_id from project_id (generic)
-- ============================================================
create or replace function public.tg_set_company_id_from_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.project_id is not null then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;

    -- Fill if missing, or enforce match when project changes
    if new.company_id is null
       or (tg_op = 'UPDATE' and new.project_id is distinct from old.project_id and new.company_id is distinct from v_company_id)
    then
      new.company_id := v_company_id;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 1) Helper: invoice_items -> invoices.company_id (invoice_id)
-- ============================================================
create or replace function public.tg_set_company_id_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.invoice_id is not null then
    select i.company_id
      into v_company_id
    from public.invoices i
    where i.id = new.invoice_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from invoice_id=%)', new.invoice_id;
    end if;

    if new.company_id is null then
      new.company_id := v_company_id;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 2) Helper: document_tags -> documents.company_id (document_id)
-- ============================================================
create or replace function public.tg_set_company_id_from_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.document_id is not null then
    select d.company_id
      into v_company_id
    from public.documents d
    where d.id = new.document_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from document_id=%)', new.document_id;
    end if;

    if new.company_id is null then
      new.company_id := v_company_id;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 3) Helper: time_log_allocations -> time_logs.company_id (time_log_id)
-- ============================================================
create or replace function public.tg_set_company_id_from_time_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.time_log_id is not null then
    select tl.company_id
      into v_company_id
    from public.time_logs tl
    where tl.id = new.time_log_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from time_log_id=%)', new.time_log_id;
    end if;

    if new.company_id is null then
      new.company_id := v_company_id;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 4) One-time backfill
-- ============================================================

-- 4.1) projects: infer only if reliable (created_by -> company_members)
do $$
declare
  has_created_by boolean;
  has_company_members boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='projects' and column_name='created_by'
  ) into has_created_by;

  select to_regclass('public.company_members') is not null into has_company_members;

  if has_created_by and has_company_members then
    -- Best-effort: pick the first membership for created_by
    execute $sql$
      update public.projects p
      set company_id = cm.company_id
      from (
        select distinct on (user_id) user_id, company_id
        from public.company_members
        order by user_id, company_id
      ) cm
      where p.company_id is null
        and p.created_by is not null
        and cm.user_id = p.created_by
        and cm.company_id is not null
    $sql$;
  else
    -- No reliable inference path; do not guess.
    -- If any projects.company_id are NULL, they must be fixed by business logic (ownership).
    null;
  end if;
end;
$$;

-- 4.2) Backfill all tables that have BOTH (project_id, company_id) from projects
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
      and t.table_type   = 'BASE TABLE' -- avoid views/materialized views
      and c.column_name in ('company_id', 'project_id')
    group by t.table_name
    having count(distinct c.column_name) = 2
       and t.table_name <> 'projects'
  loop
    execute format(
      'update public.%I t
       set company_id = p.company_id
       from public.projects p
       where t.company_id is null
         and t.project_id is not null
         and p.id = t.project_id
         and p.company_id is not null;',
      r.table_name
    );
  end loop;
end;
$$;

-- 4.3) Relationship tables
-- invoice_items -> invoices
do $$
begin
  if to_regclass('public.invoice_items') is not null and to_regclass('public.invoices') is not null then
    update public.invoice_items ii
    set company_id = i.company_id
    from public.invoices i
    where ii.company_id is null
      and ii.invoice_id is not null
      and i.id = ii.invoice_id
      and i.company_id is not null;
  end if;
end;
$$;

-- document_tags -> documents
do $$
begin
  if to_regclass('public.document_tags') is not null and to_regclass('public.documents') is not null then
    update public.document_tags dt
    set company_id = d.company_id
    from public.documents d
    where dt.company_id is null
      and dt.document_id is not null
      and d.id = dt.document_id
      and d.company_id is not null;
  end if;
end;
$$;

-- time_log_allocations -> time_logs
do $$
begin
  -- NOTE: In this repo, time_log_allocations is keyed by day_card_id/project_id and may NOT have time_log_id.
  -- Only run this backfill when the schema actually has a time_log_id column.
  if to_regclass('public.time_log_allocations') is not null
     and to_regclass('public.time_logs') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'time_log_allocations'
         and column_name = 'time_log_id'
     )
  then
    update public.time_log_allocations tla
    set company_id = tl.company_id
    from public.time_logs tl
    where tla.company_id is null
      and tla.time_log_id is not null
      and tl.id = tla.time_log_id
      and tl.company_id is not null;
  end if;
end;
$$;

-- ============================================================
-- 5) Triggers: auto-set company_id going forward
-- ============================================================

-- 5.1) Attach trigger to ALL *BASE TABLES* in public that have BOTH company_id and project_id
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
      and t.table_type   = 'BASE TABLE'        -- ✅ avoids views
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

-- 5.2) Explicit: invoice_items, document_tags, time_log_allocations
do $$
begin
  if to_regclass('public.invoice_items') is not null then
    execute 'drop trigger if exists set_company_id_from_invoice on public.invoice_items;';
    execute 'create trigger set_company_id_from_invoice
             before insert or update of invoice_id, company_id
             on public.invoice_items
             for each row
             execute function public.tg_set_company_id_from_invoice();';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.document_tags') is not null then
    execute 'drop trigger if exists set_company_id_from_document on public.document_tags;';
    execute 'create trigger set_company_id_from_document
             before insert or update of document_id, company_id
             on public.document_tags
             for each row
             execute function public.tg_set_company_id_from_document();';
  end if;
end;
$$;

do $$
begin
  -- Only attach this trigger variant when the schema actually has time_log_id.
  -- Otherwise, time_log_allocations will be covered by the generic (project_id -> projects.company_id) trigger.
  if to_regclass('public.time_log_allocations') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'time_log_allocations'
         and column_name = 'time_log_id'
     )
  then
    execute 'drop trigger if exists set_company_id_from_time_log on public.time_log_allocations;';
    execute 'create trigger set_company_id_from_time_log
             before insert or update of time_log_id, company_id
             on public.time_log_allocations
             for each row
             execute function public.tg_set_company_id_from_time_log();';
  end if;
end;
$$;

-- ============================================================
-- 6) Guardrails: enforce company_id not null (CHECK NOT VALID + VALIDATE)
-- ============================================================
-- We prefer CHECK constraints because they are safe to add even if legacy NULLs existed
-- (we backfilled first), and they are named/idempotent.
do $$
declare
  r record;
  v_conname text;
  nulls bigint;
begin
  for r in
    select t.table_name
    from information_schema.tables t
    join information_schema.columns c
      on c.table_schema = t.table_schema
     and c.table_name   = t.table_name
    where t.table_schema = 'public'
      and t.table_type   = 'BASE TABLE' -- avoid views/materialized views
      and c.column_name  = 'company_id'
      and t.table_name  <> 'companies'
  loop
    -- Only apply to tenant-ish tables that actually have company_id; skip obvious lookups if needed later.
    v_conname := r.table_name || '_company_id_not_null';

    -- Ensure no remaining NULLs before validating
    execute format('select count(*) from public.%I where company_id is null;', r.table_name) into nulls;

    -- Add constraint if missing
    if not exists (
      select 1
      from pg_constraint pc
      join pg_class t on t.oid = pc.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname=r.table_name and pc.conname=v_conname
    ) then
      execute format(
        'alter table public.%I add constraint %I check (company_id is not null) not valid;',
        r.table_name,
        v_conname
      );
    end if;

    -- Validate only if there are no nulls left
    if nulls = 0 then
      begin
        execute format('alter table public.%I validate constraint %I;', r.table_name, v_conname);
      exception when others then
        -- If validate fails due to concurrent changes or table differences, leave it NOT VALID.
        null;
      end;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- 7) Sanity checks: remaining NULL company_id counts (major tables)
-- ============================================================
select 'projects' as table_name, count(*) as null_company_id
from public.projects
where company_id is null
union all
select 'project_todos', count(*) from public.project_todos where company_id is null
union all
select 'costs', count(*) from public.costs where company_id is null
union all
select 'cost_entries', count(*) from public.cost_entries where company_id is null
union all
select 'invoices', count(*) from public.invoices where company_id is null
union all
select 'invoice_items', count(*) from public.invoice_items where company_id is null
union all
select 'documents', count(*) from public.documents where company_id is null
union all
select 'document_tags', count(*) from public.document_tags where company_id is null
union all
select 'time_logs', count(*) from public.time_logs where company_id is null
union all
select 'time_log_allocations', count(*) from public.time_log_allocations where company_id is null;


