# Audit: Cost Code Wiring (Second Pass, Single SOT)

## Executive Summary

We enforce **ONE canonical Cost Code Source of Truth (SOT)**:

- **DB RPC**: `public.get_cost_code_catalog(p_company_id uuid)`
- **Frontend entrypoint**: `useCostCodeCatalog()` (react-query)
- **No other cost code reads** (no `from('cost_codes')`, no alternate RPCs)

Canonical filters guaranteed by RPC:

- `company_id = p_company_id`
- `trade_id IS NOT NULL`
- `is_active = true`
- `is_legacy = false`
- `category IN ('labor','material','sub')`

## Evidence Searches (commands)

Run these locally:

```bash
rg -n "from\\('cost_codes'|from\\(\"cost_codes\"\\)" src
rg -n "from\\('trades'|from\\(\"trades\"\\)" src
rg -n "cost_code_id" src
rg -n "cost_code_code" src
rg -n "trade_id" src
rg -n "default_labor_cost_code_id|default_material_cost_code_id|default_sub_cost_code_id" src
rg -n "estimate|estimate_items|proposal|proposals" src
rg -n "budget|actual|job cost|alloc|ledger" src
rg -n "vendor|sub|subcontract|ap|bill" src
rg -n "time_log|labor|workforce" src
rg -n "rpc\\(|get_cost_code_catalog|get_trades_with_default_codes|get_cost_codes_with_trades" src
```

### Required outcome

- `from('cost_codes')` **must return zero matches** across `src/`
- cost code reads must route through `useCostCodeCatalog()` / `fetchCostCodeCatalog()`

## Read-path inventory (post-refactor)

### Canonical read usage

| Module | File(s) | How it reads cost codes | Compliant |
|---|---|---|---|
| Admin | `src/components/admin/CostCodesTab.tsx`, `src/components/admin/TradesTab.tsx` | Uses catalog / canonical trade defaults | ✅ |
| Estimates | `src/pages/EstimateBuilderV2.tsx` | Uses `useCostCodeCatalog()` for export mapping | ✅ |
| Materials | `src/components/materials/AddMaterialReceiptDialog.tsx` | Uses catalog rows for dropdown | ✅ |
| Financial Search | `src/components/financials/FinancialSearchBar.tsx` | Uses `fetchCostCodeCatalog()` and in-memory filter | ✅ |
| Scope Blocks | `src/hooks/useScopeBlocks.ts` | Uses canonical `getUnassignedCostCodeId(companyId)` (which calls catalog RPC) | ✅ |

### Writes / references (must always store UUID `cost_code_id`)

We verified write sites use `cost_code_id` UUIDs (not code strings). Remaining checks are enforced by DB FKs where present.

Key modules referencing `cost_code_id` include:
- Estimates / scope items: `scope_block_cost_items.cost_code_id`
- Time logs: `daily_logs.cost_code_id`, `time_log_allocations.cost_code_id`
- Vendors/AP: `material_receipts.cost_code_id`, `costs.cost_code_id`, `cost_entries.cost_code_id`
- Job costing: `project_budget_lines.cost_code_id`

## Known follow-ups (outside this audit’s scope)

- Trades dropdown reads (`from('trades')`) still exist in several pages. These should be derived from the catalog’s `trades` list to avoid parallel catalogs and ensure tenant scoping.
- Some older code still refers to legacy category strings (`materials/subs`) for non-catalog tables. Cost code categories are now canonical in the catalog and should be mapped at the UI boundary only.


