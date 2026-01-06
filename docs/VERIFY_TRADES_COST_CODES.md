# Verify Trades + Cost Codes (Canonical Source of Truth)

## Mental Model (Big 3)

- **Canonical**: `public.cost_codes` is the single source of truth used across the app (budgets, time logs, AP, etc).
- **Trades**: `public.trades` stores trade metadata and **default pointers** only.
- **Security**: all reads/writes are tenant-scoped by `company_id` and protected by RLS.
- **Performance**: UI pages use single queries (RPCs), no per-row fetches.

---

## SQL Checks (Supabase SQL Editor)

Replace `:company_id` with the target company UUID.

### 1) Legacy / Unassigned cost codes count

```sql
SELECT
  COUNT(*) AS legacy_count
FROM public.cost_codes
WHERE company_id = :company_id
  AND (trade_id IS NULL OR COALESCE(is_legacy, false) = true);
```

### 2) Company mismatch between cost_codes and trades (should be 0)

```sql
SELECT
  cc.id,
  cc.company_id AS cost_code_company_id,
  t.company_id AS trade_company_id,
  cc.code,
  t.name AS trade_name
FROM public.cost_codes cc
JOIN public.trades t ON t.id = cc.trade_id
WHERE cc.company_id <> t.company_id;
```

### 3) Trade-linked cost codes with missing or wrong category set (should be 0)

```sql
SELECT
  t.id,
  t.name,
  COUNT(*) AS code_count
FROM public.trades t
JOIN public.cost_codes cc ON cc.trade_id = t.id
WHERE t.company_id = :company_id
  AND cc.is_active = true
GROUP BY t.id, t.name
HAVING COUNT(*) <> 3;
```

```sql
SELECT
  t.id,
  t.name,
  ARRAY_AGG(cc.category::text ORDER BY cc.category::text) AS categories
FROM public.trades t
JOIN public.cost_codes cc ON cc.trade_id = t.id
WHERE t.company_id = :company_id
  AND cc.is_active = true
GROUP BY t.id, t.name
HAVING ARRAY_AGG(cc.category::text ORDER BY cc.category::text) <> ARRAY['labor','material','sub'];
```

### 4) Trades missing default pointers (should be 0 for “Complete” trades)

```sql
SELECT
  id,
  name,
  default_labor_cost_code_id,
  default_material_cost_code_id,
  default_sub_cost_code_id
FROM public.trades
WHERE company_id = :company_id
  AND (
    default_labor_cost_code_id IS NULL
    OR default_material_cost_code_id IS NULL
    OR default_sub_cost_code_id IS NULL
  )
ORDER BY name;
```

### 5) Trades whose defaults do not resolve to correct cost codes (should be 0)

```sql
WITH t AS (
  SELECT *
  FROM public.trades
  WHERE company_id = :company_id
)
SELECT
  t.id,
  t.name,
  'labor' AS expected_category,
  cc.id AS cost_code_id,
  cc.code,
  cc.category::text AS actual_category,
  cc.trade_id AS actual_trade_id,
  cc.company_id AS actual_company_id,
  cc.is_active,
  COALESCE(cc.is_legacy, false) AS is_legacy
FROM t
LEFT JOIN public.cost_codes cc ON cc.id = t.default_labor_cost_code_id
WHERE cc.id IS NULL
   OR cc.category::text <> 'labor'
   OR cc.trade_id <> t.id
   OR cc.company_id <> t.company_id
   OR cc.is_active <> true
   OR COALESCE(cc.is_legacy, false) <> false
UNION ALL
SELECT
  t.id,
  t.name,
  'material',
  cc.id,
  cc.code,
  cc.category::text,
  cc.trade_id,
  cc.company_id,
  cc.is_active,
  COALESCE(cc.is_legacy, false)
FROM t
LEFT JOIN public.cost_codes cc ON cc.id = t.default_material_cost_code_id
WHERE cc.id IS NULL
   OR cc.category::text <> 'material'
   OR cc.trade_id <> t.id
   OR cc.company_id <> t.company_id
   OR cc.is_active <> true
   OR COALESCE(cc.is_legacy, false) <> false
UNION ALL
SELECT
  t.id,
  t.name,
  'sub',
  cc.id,
  cc.code,
  cc.category::text,
  cc.trade_id,
  cc.company_id,
  cc.is_active,
  COALESCE(cc.is_legacy, false)
FROM t
LEFT JOIN public.cost_codes cc ON cc.id = t.default_sub_cost_code_id
WHERE cc.id IS NULL
   OR cc.category::text <> 'sub'
   OR cc.trade_id <> t.id
   OR cc.company_id <> t.company_id
   OR cc.is_active <> true
   OR COALESCE(cc.is_legacy, false) <> false;
```

### 6) Find app tables referencing legacy cost codes (investigation)

This lists foreign keys that reference `public.cost_codes(id)`:

```sql
SELECT
  con.conname,
  conrelid::regclass AS referencing_table,
  a.attname AS referencing_column
FROM pg_constraint con
JOIN pg_attribute a
  ON a.attrelid = con.conrelid
 AND a.attnum = ANY (con.conkey)
WHERE con.contype = 'f'
  AND con.confrelid = 'public.cost_codes'::regclass
ORDER BY 2::text, 3;
```

Then for each referencing table/column, you can run:

```sql
-- Replace :table and :column based on results above
SELECT COUNT(*) AS legacy_refs
FROM :table t
JOIN public.cost_codes cc ON cc.id = t.:column
WHERE cc.company_id = :company_id
  AND (cc.trade_id IS NULL OR COALESCE(cc.is_legacy, false) = true);
```

---

## UI Checks

### 1) Trades page (Admin → Trades)

- Create trade with auto-generate → Status **Complete**
- Labor/Material/Sub show codes (✓ CODE)
- If any trade shows **Mismatch**, use the row action **Ensure Defaults**

### 2) Cost Codes page (Admin → Cost Codes)

- Default view shows only **Active (trade-linked)** codes
- Trade column shows a trade name for all rows in default view (no “—”)
- Toggle “Show legacy” reveals legacy/unassigned rows (Trade badge: “Legacy”)

---

## Commands

```bash
supabase db push --linked
supabase db lint --linked
```


