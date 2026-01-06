### Trades → Cost Codes Verification Checklist

### Apply migrations

Run:

- `supabase db reset`
- `supabase db push --linked`

### SQL checks (run in Supabase SQL Editor)

- **No invalid categories**:

```sql
SELECT category, COUNT(*)
FROM public.cost_codes
GROUP BY 1
ORDER BY 2 DESC;
```

Expected categories: `labor`, `material`, `sub` only.

- **Category enum exists**:

```sql
SELECT t.typname
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'cost_code_category';
```

- **Constraints exist**:

```sql
SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid::regclass::text IN ('public.cost_codes','public.trades')
ORDER BY table_name, conname;
```

Expected:
- `cost_codes_company_id_code_key` on `(company_id, code)`
- `cost_codes_trade_id_category_key` on `(trade_id, category)`

- **Broken trades count = 0**:

```sql
SELECT t.id, t.name, t.company_id, COUNT(cc.*) AS cost_code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY t.id, t.name, t.company_id
HAVING COUNT(cc.*) NOT IN (0,3)
ORDER BY cost_code_count DESC;
```

Expected: 0 rows.

### RPC tests (run in Supabase SQL Editor as an authenticated user)

You’ll need a real company UUID you’re a member of.

- **Create trade with auto-gen (should create exactly 3 codes and set defaults)**:

```sql
SELECT (public.create_trade_with_default_cost_codes(
  '<company_id>'::uuid,
  'Plumbing',
  'Test trade',
  NULL,
  true
)).id;
```

- **Create the same name twice (prefix collision should resolve deterministically)**:

```sql
SELECT (public.create_trade_with_default_cost_codes(
  '<company_id>'::uuid,
  'Plumbing',
  'Second plumbing trade',
  NULL,
  true
)).id;
```

Expected: second call succeeds with a different generated code prefix due to deterministic uniqueness logic.

- **Tenant isolation (must fail with ERRCODE 42501)**:

```sql
SELECT public.create_trade_with_default_cost_codes(
  '<other_company_id>'::uuid,
  'Illegal Trade',
  NULL,
  NULL,
  true
);
```

Expected: error `not a member of company ...` with SQLSTATE `42501`.

### UI verification

- **Trades page**:
  - Create Trade modal checkbox “Auto-generate Labor, Material, and Subcontractor cost codes”.
  - Submit calls **only** `create_trade_with_default_cost_codes` once.
  - Error toast shows exact Postgres message (includes constraint name when relevant).

- **Cost Codes page**:
  - Read-only list with filters/search.
  - No auto-generate button.
  - No create/edit/archive actions.

### Lint

Run:

- `supabase db lint --linked`


