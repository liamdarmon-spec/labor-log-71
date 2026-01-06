# Verify Cost Code Wiring (Single Canonical SOT)

## Canonical SOT

- DB RPC: `public.get_cost_code_catalog(p_company_id uuid)`
- Frontend hook: `useCostCodeCatalog()` (tenant-scoped, cached, retry=false)

## SQL Checks (Supabase SQL Editor)

Replace `:company_id` with your company UUID.

### 1) No active codes missing trade link

```sql
SELECT COUNT(*) AS active_without_trade
FROM public.cost_codes
WHERE company_id = :company_id
  AND is_active
  AND trade_id IS NULL;
```

### 2) No invalid categories

```sql
SELECT category::text, COUNT(*) AS ct
FROM public.cost_codes
WHERE company_id = :company_id
GROUP BY 1
HAVING category::text NOT IN ('labor','material','sub');
```

### 3) Trades must have 0 or 3 canonical codes (active, non-legacy)

```sql
SELECT
  t.id,
  t.name,
  COUNT(cc.*) AS code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc
  ON cc.trade_id = t.id
 AND cc.company_id = t.company_id
 AND cc.is_active
 AND NOT COALESCE(cc.is_legacy, false)
WHERE t.company_id = :company_id
GROUP BY 1,2
HAVING COUNT(cc.*) NOT IN (0,3)
ORDER BY code_count DESC;
```

### 4) Downstream orphan detection (examples)

#### Estimates / scope items

```sql
SELECT COUNT(*) AS orphan_scope_items
FROM public.scope_block_cost_items s
LEFT JOIN public.cost_codes cc ON cc.id = s.cost_code_id
WHERE s.company_id = :company_id
  AND s.cost_code_id IS NOT NULL
  AND cc.id IS NULL;
```

#### Time logs

```sql
SELECT COUNT(*) AS orphan_daily_logs
FROM public.daily_logs d
LEFT JOIN public.cost_codes cc ON cc.id = d.cost_code_id
WHERE d.company_id = :company_id
  AND d.cost_code_id IS NOT NULL
  AND cc.id IS NULL;
```

#### Project budgets

```sql
SELECT COUNT(*) AS orphan_budget_lines
FROM public.project_budget_lines l
LEFT JOIN public.cost_codes cc ON cc.id = l.cost_code_id
WHERE l.cost_code_id IS NOT NULL
  AND cc.id IS NULL;
```

## UI Checks

- **Trades (Admin → Trades)**: loads without RPC schema cache error
- **Create Trade (auto-gen ON)**: creates exactly 3 codes and defaults show as Complete
- **Cost Codes (Admin → Cost Codes)**: shows trade name for every row (no “—”)
- **Estimate Builder**: dropdowns render canonical code/name and persist after refresh
- **Materials / Subs / Job Costing / Labor**: any cost code chooser shows only canonical codes

## Commands

```bash
supabase db push --linked
supabase db lint --linked
npm run check:sot
```

## Guardrail

`npm run check:sot` must fail if any direct cost code table read is introduced outside the canonical module.


