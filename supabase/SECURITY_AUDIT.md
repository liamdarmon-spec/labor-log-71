# Security Audit Scripts

This folder contains scripts to audit the Supabase/Postgres database for multi-tenant security issues.

## What We Check

### 1. RLS Enabled (`check_rls.sql`)

**What**: Lists all tables in `public` schema that do NOT have Row Level Security enabled.

**Why**: Without RLS, any authenticated user can access all rows in a table, regardless of tenant. This is the most critical security gap.

**Fix**: `ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;`

---

### 2. Open Policies (`check_policies.sql`)

**What**: Lists RLS policies that may be too permissive:
- `USING (true)` - allows all rows
- `WITH CHECK (true)` - allows inserting any row
- `"Anyone can..."` policy names (legacy pattern)
- Policies without company_id or auth.uid() checks

**Why**: Even with RLS enabled, open policies effectively disable security. A policy like `USING (true)` allows any authenticated user to see all rows.

**Fix**: Replace with tenant-scoped policies:
```sql
CREATE POLICY "Members can view X" ON public.X
FOR SELECT USING (public.is_company_member(company_id));
```

---

### 3. Missing company_id (`check_company_id.sql`)

**What**: Lists tables that likely contain tenant data but don't have a `company_id` column.

**Heuristics used**:
- Has `project_id`, `customer_id`, `created_by`, `worker_id`
- Is in known list of tenant tables

**Why**: Without `company_id`, you can't write effective RLS policies. You'd need complex joins to determine tenant ownership.

**Fix**: Add `company_id uuid REFERENCES companies(id)` column and backfill from parent relationships.

---

### 4. SECURITY DEFINER Functions (`check_functions.sql`)

**What**: Lists functions with `SECURITY DEFINER` and checks for:
- Missing `SET search_path` (SQL injection risk)
- No tenant filtering when accessing tables
- Direct table access without company_id checks

**Why**: `SECURITY DEFINER` functions run with the owner's privileges (usually postgres), bypassing RLS. If they don't enforce tenant checks, they become privilege escalation vectors.

**Fix**: 
```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS ...
SECURITY DEFINER
SET search_path = 'public'  -- Required!
AS $$
BEGIN
  PERFORM public.assert_company_member(p_company_id);  -- Add tenant check
  ...
END;
$$;
```

---

## How to Run Locally

### Prerequisites

1. Local Supabase running:
   ```bash
   supabase start
   ```

2. Make script executable:
   ```bash
   chmod +x scripts/security/run_security_checks.sh
   ```

### Run All Checks

```bash
./scripts/security/run_security_checks.sh
```

Exit codes:
- `0` = No critical issues
- `1` = Critical issues found (tables without RLS, open policies)

### Run Individual Checks

```bash
# Connect to local Supabase
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Run a single check
\i scripts/security/check_rls.sql
\i scripts/security/check_policies.sql
\i scripts/security/check_company_id.sql
\i scripts/security/check_functions.sql
```

### Run Against Remote Database

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" ./scripts/security/run_security_checks.sh
```

---

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/security.yml
- name: Start Supabase
  run: supabase start

- name: Run Security Audit
  run: ./scripts/security/run_security_checks.sh
```

---

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 CRITICAL | Tables without RLS, open policies | Must fix before deploy |
| 🟡 WARNING | Missing company_id, functions without search_path | Should fix soon |
| ✅ OK | No issues detected | No action needed |

---

## Common Patterns to Fix

### Pattern 1: "Anyone can view X" Policy

```sql
-- Before (INSECURE)
CREATE POLICY "Anyone can view projects" ON projects
FOR SELECT USING (true);

-- After (SECURE)
CREATE POLICY "Members can view company projects" ON projects
FOR SELECT USING (public.is_company_member(company_id));
```

### Pattern 2: Missing Tenant Check in Function

```sql
-- Before (INSECURE)
CREATE FUNCTION get_all_invoices()
RETURNS SETOF invoices
SECURITY DEFINER
AS $$ SELECT * FROM invoices; $$;

-- After (SECURE)
CREATE FUNCTION get_company_invoices(p_company_id uuid)
RETURNS SETOF invoices
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM assert_company_member(p_company_id);
  RETURN QUERY SELECT * FROM invoices WHERE company_id = p_company_id;
END;
$$;
```

---

## Questions?

See `supabase/README_RLS.md` for the full RLS policy model and testing instructions.
