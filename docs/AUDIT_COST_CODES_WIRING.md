# Cost Codes Wiring Audit (Canonical Trades → Cost Codes)

## Canonical Rules (target state)

All app-visible cost codes must satisfy:

- `company_id = active_company_id`
- `trade_id IS NOT NULL`
- `is_active = true`
- `is_legacy = false`
- `category IN ('labor','material','sub')`

Reads must be tenant-scoped and **must not** query `public.trades` / `public.cost_codes` directly outside `src/data/`.

## Findings (direct access call sites)

### Direct `from('cost_codes')`

| File | Line(s) | Purpose | Current Query | Canonical? | Required change |
|------|---------|---------|---------------|------------|-----------------|
| `src/lib/costCodes.ts` | 15–18 | Fetch UNASSIGNED cost code id fallback | `.from('cost_codes').select('id').eq('code','UNASSIGNED')` | ❌ not company-scoped | Replace with tenant-scoped canonical fallback via `src/data/catalog.ts` (trade-linked) |
| `src/hooks/useCostCodes.ts` | 23+, 55+ | General cost code list + select list | `.from('cost_codes')...` | ⚠️ partially (company-scoped now), but still direct | Replace with `fetchCostCodes(companyId, filters)` from `src/data/catalog.ts` |
| `src/hooks/useScopeBlocks.ts` | 193+ | Scope block editor cost code lookup | `.from('cost_codes')...` | ❌ direct table read | Replace with `fetchCostCodes` via canonical module |
| `src/hooks/useTrades.ts` | 60+ | Trade cost codes lookup | `.from('cost_codes')...` | ❌ direct table read | Replace with `fetchCostCodes` via canonical module |
| `src/pages/EstimateBuilderV2.tsx` | 242+ | Cost code map for export | `.from('cost_codes')...` | ⚠️ company-scoped now, still direct | Replace with canonical module |
| `src/components/materials/AddMaterialReceiptDialog.tsx` | 47–51 | Cost code dropdown in receipt dialog | `.from('cost_codes')...` | ❌ missing company scope | Replace with `fetchCostCodes` via canonical module |
| `src/components/financials/FinancialSearchBar.tsx` | 43–46 | Search cost codes | `.from('cost_codes')...limit(3)` | ❌ missing company scope + includes legacy | Replace with `fetchCostCodes(companyId,{search,limit})` via RPC |
| `src/components/project/ProjectSubsTab.tsx` | 184+ | Sub assignment / cost code picker | `.from('cost_codes')...` | ❌ missing company scope | Replace with canonical module |

### Direct `from('trades')`

| File | Line(s) | Purpose | Current Query | Canonical? | Required change |
|------|---------|---------|---------------|------------|-----------------|
| `src/hooks/useTrades.ts` | 23–25, 43–45 | Trades list + dropdown list | `.from('trades').select(...)` | ❌ missing company scope | Replace with `fetchTradesWithDefaults(companyId)` via RPC and map to `id,name` |
| `src/pages/DailyLog.tsx` | 137 | Trades dropdown/data for logs | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/pages/ViewLogs.tsx` | 146 | Trades filter/list | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/unified/SplitTimeLogDialog.tsx` | 83 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/dashboard/BulkEntryTab.tsx` | 147 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/workforce/DayCardDrawer.tsx` | 52 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/dashboard/SplitScheduleDialog.tsx` | 83 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/workforce/SchedulerTab.tsx` | 34 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/dashboard/ViewLogsTab.tsx` | 109 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/dashboard/SingleEntryTab.tsx` | 140 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/workforce/RosterTab.tsx` | 110 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/dashboard/CostCalculatorTab.tsx` | 64 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/workforce/AnalyticsTab.tsx` | 45 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/workforce/SubsTab.tsx` | 55 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/scheduling/AddToScheduleDialog.tsx` | 188 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/scheduling/EditScheduleDialog.tsx` | 134 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/admin/ArchivedLogsTab.tsx` | 70 | Trades dropdown/filter | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |
| `src/components/admin/TradesTab.tsx` | 174 | **Edit trade update** | `.from('trades').update(...)` | ✅ (write path) but must remain tenant scoped | Keep write, but ensure `.eq('company_id', activeCompanyId)` (already) and remove any other direct reads |
| `src/components/workforce/EditTimeEntryDialog.tsx` | 111 | Trades dropdown | `.from('trades')...` | ❌ direct table read | Replace with canonical module/hook |

### RPC usage (already canonical)

| File | Line(s) | RPC | Status |
|------|---------|-----|--------|
| `src/components/admin/TradesTab.tsx` | 126 | `get_trades_with_default_codes` | ✅ canonical read |
| `src/components/admin/CostCodesTab.tsx` | 71 | `get_cost_codes_with_trades` | ✅ canonical read |
| `src/components/admin/TradesTab.tsx` | 146 | `create_trade_with_default_cost_codes` | ✅ canonical write |
| `src/components/admin/TradesTab.tsx` | 197 | `ensure_trade_has_default_cost_codes` | ✅ canonical repair |

## Required Work (next)

1. Introduce **one** canonical data access module (`src/data/catalog.ts`) and route all reads/writes through it.
2. Replace all direct `from('trades')` and `from('cost_codes')` call sites in this doc.
3. Add guardrails to prevent reintroduction of direct table reads outside `src/data/`.


