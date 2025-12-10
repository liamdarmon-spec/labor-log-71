# Estimator → Budget Flow Documentation

## Core Architecture

### One Active Budget Per Project

- Each project has **exactly one active budget** at any time
- Active budget is identified by `project_budgets.status = 'active'`
- Old budgets are archived (`status = 'archived'`) when replaced, not deleted
- All cost tracking, variance calculations, and financial reporting use the active budget

### Many Estimates → One Budget

- Multiple estimates can be synced into the same active budget
- Each estimate sync adds budget lines to the active budget
- Cost codes aggregate naturally: `SUM(budget_amount) GROUP BY cost_code_id`
- No "budget per estimate" - all estimates contribute to one unified budget

### Budget Line Provenance

Every budget line tracks its origin:

- `source_estimate_id` - Which estimate created this line
- `scope_type` - 'base' (from estimate), 'change_order', 'allowance', 'option'
- `change_order_id` - If this line came from a change order estimate
- `description_internal` / `description_client` - Line descriptions
- `area_label` / `group_label` - Scope grouping (e.g., "Kitchen", "ADU")

**Note**: Additional provenance fields (`estimate_line_id`, `sync_batch_id`) are recommended but not yet in schema. See migration suggestions below.

## Sync Modes

### 1. Merge into Existing Budget (Default)

**Behavior:**
- Adds estimate lines to the current active budget
- If estimate was previously synced, removes old lines from that estimate first (re-sync)
- Cost codes aggregate: multiple estimates can contribute to same cost code
- No data loss: other estimates' lines remain untouched

**Use Case:**
- Adding scope from a new estimate
- Re-syncing an estimate after edits
- Multiple estimates for different areas (Kitchen, ADU, etc.)

### 2. Replace Existing Budget

**Behavior:**
- Archives current active budget (`status = 'archived'`)
- Deletes all lines from archived budget
- Creates new active budget from selected estimate
- Only that estimate's lines exist in the new budget

**Use Case:**
- Starting fresh with a revised estimate
- Complete scope change
- Rare operation - merge is usually preferred

## Cost Code Aggregation

Budget totals are calculated by aggregating all active budget lines:

```sql
SELECT 
  cost_code_id,
  SUM(budget_amount) AS total_budget,
  SUM(actual_cost) AS total_actual
FROM project_budget_lines
WHERE project_id = $projectId
  AND project_budget_id = $activeBudgetId
GROUP BY cost_code_id
```

- Multiple lines with same `cost_code_id` sum naturally
- No deduplication needed
- Aggregation happens at query time, not insert time

## Change Orders

Change orders are estimates with `scope_type = 'change_order'` or flagged as change orders.

When synced via Merge mode:
- Lines are tagged with `scope_type = 'change_order'`
- `change_order_id` references the estimate
- Lines flow into same budget totals
- UI can filter/group by change order status

## Re-sync Behavior

When the same estimate is synced again:
1. All existing budget lines with `source_estimate_id = estimateId` are deleted
2. Fresh lines are inserted from current estimate state
3. This allows updating budget when estimate changes

## Database Schema

### Key Tables

- `project_budgets` - Budget headers (one per project, status = 'active' for current)
- `project_budget_lines` - Individual budget line items
- `estimates` - Estimate definitions
- `scope_blocks` + `scope_block_cost_items` - Estimate line items (new system)
- `estimate_items` - Estimate line items (legacy system)

### Recommended Schema Additions

```sql
-- Suggested migration (to be executed manually in Supabase):
ALTER TABLE project_budget_lines
  ADD COLUMN IF NOT EXISTS estimate_line_id uuid,
  ADD COLUMN IF NOT EXISTS sync_batch_id uuid,
  ADD COLUMN IF NOT EXISTS area_label text,
  ADD COLUMN IF NOT EXISTS group_label text;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_lines_project_budget 
  ON project_budget_lines(project_id, project_budget_id);
  
CREATE INDEX IF NOT EXISTS idx_budget_lines_cost_code 
  ON project_budget_lines(project_id, cost_code_id);
```

## Implementation Files

- `src/hooks/useSyncEstimateToBudget.ts` - Main sync logic (merge/replace)
- `src/hooks/useActiveBudget.ts` - Get/ensure active budget
- `src/hooks/useUnifiedProjectBudget.ts` - Budget aggregation queries
- `src/components/estimates/SyncEstimateDialog.tsx` - UI for sync mode selection
- `src/components/project/ProjectBudgetTabV2.tsx` - Cost code ledger view

## Performance Notes

- All queries filter by `project_id` and `project_budget_id` (active budget)
- Cost code aggregation uses `GROUP BY` at query time
- Budget lines table indexed on `(project_id, cost_code_id)` for fast lookups
- Supports ~5,000+ new lines per day across projects

## Scope Blocks: area_label Column

The `scope_blocks` table has an `area_label` column (added in migration `20251209232700_add_scope_blocks_area_label.sql`) that provides a stable human-readable label for the area/scope a block represents (e.g., "Kitchen", "ADU", "Main Floor").

- **Purpose**: Used for budget sync provenance and UI display
- **Source**: Can be set directly on the block, or inherited from `scope_block_cost_items.area_label`
- **Fallback**: If not set, falls back to `scope_blocks.title`
- **Usage**: When syncing estimates to budgets, area labels are extracted from cost items first, then from the block level, providing clear provenance for budget lines
