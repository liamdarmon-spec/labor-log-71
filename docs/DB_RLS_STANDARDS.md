# Database RLS Standards

This document defines the Row Level Security (RLS) conventions for this codebase.

## 1. Initplan Rule (Critical)

When writing RLS policies, **always wrap `auth.uid()` and other `auth.*()` calls** in a subquery:

```sql
-- ❌ BAD: causes per-row evaluation (slow, triggers linter warning)
USING (user_id = auth.uid())

-- ✅ GOOD: initplan-safe (evaluated once per query)
USING (user_id = (SELECT auth.uid()))
```

This applies to:
- `auth.uid()`
- `auth.jwt()`
- `auth.role()`
- `current_setting('request.jwt.claims', true)`

## 2. Canonical Tenant Functions

Use these helpers in RLS policies:

| Function | Returns | Use Case |
|----------|---------|----------|
| `public.authed_user_id()` | `uuid` | Get current user ID (initplan-safe) |
| `public.authed_company_ids()` | `uuid[]` | Get array of companies user belongs to |
| `public.is_company_member(company_id)` | `boolean` | Check if user is in a specific company |
| `public.has_company_role(company_id, role)` | `boolean` | Check if user has at least the given role |

### Example Policy Using Helpers

```sql
-- Tenant-scoped table: use is_company_member
CREATE POLICY "tenant_select" ON public.my_table
FOR SELECT TO authenticated
USING (public.is_company_member(company_id));

-- Or using array check (equivalent, slightly different plan)
USING (company_id = ANY(public.authed_company_ids()))
```

## 3. Policy Naming Convention

Use consistent names across all tenant-scoped tables:

| Action | Policy Name | Purpose |
|--------|-------------|---------|
| SELECT | `tenant_select` | Read access for company members |
| INSERT | `tenant_insert` | Write access for company members |
| UPDATE | `tenant_update` | Modify access for company members |
| DELETE | `tenant_delete` | Delete access for company members |

### Special Tables

| Table | Naming Pattern | Notes |
|-------|----------------|-------|
| `companies` | `read own companies` | User can see companies they belong to |
| `company_members` | `read own memberships` | User can see their own memberships |
| Shared lookup tables | `<table>_select_all` | e.g., `measurement_units_select_all` |

## 4. Rules to Avoid Duplicate Policies

**One permissive policy per action per role.**

- ❌ Don't have both `company_select` and `tenant_select` on the same table
- ✅ Use only `tenant_select` (canonical name)

If you need role-specific logic, use `has_company_role()` inside a single policy:

```sql
-- Example: only managers+ can update
CREATE POLICY "tenant_update" ON public.my_table
FOR UPDATE TO authenticated
USING (public.has_company_role(company_id, 'manager'))
WITH CHECK (public.has_company_role(company_id, 'manager'));
```

## 5. Index Naming Convention

```
idx_<table>_<column>
idx_<table>_<col1>_<col2>
```

For `company_id` columns, always use: `idx_<table>_company_id`

Do not create multiple indexes on the same column(s).

## 6. Migration Checklist

When adding/modifying RLS:

1. [ ] Wrap all `auth.*()` calls in `(SELECT ...)`
2. [ ] Use canonical policy names (`tenant_*`)
3. [ ] Drop any duplicate policies before creating new ones
4. [ ] Test with `supabase db reset` to ensure idempotency
5. [ ] Run `supabase db lint` to check for warnings

## 7. Verification Queries

### Check for multiple permissive policies per action

```sql
SELECT
  c.relname AS table_name,
  pol.polcmd::text AS action,
  array_agg(pol.polname) AS policies,
  count(*) AS count
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND pol.polpermissive = true
GROUP BY c.relname, pol.polcmd
HAVING count(*) > 1
ORDER BY 1, 2;
```

### Check for auth.uid() without subquery wrapper

```sql
SELECT polname, polqual::text
FROM pg_policy
WHERE polqual::text LIKE '%auth.uid()%'
  AND polqual::text NOT LIKE '%(SELECT auth.uid())%';
```


