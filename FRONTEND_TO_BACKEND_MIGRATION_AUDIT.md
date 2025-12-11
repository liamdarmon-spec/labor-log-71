# Frontend → Backend Migration Audit
## Estimates, Budgets, and Proposals Performance Optimization

**Date:** 2024-12-10  
**Goal:** Identify heavy frontend processing that should be moved to Supabase functions/views/triggers

---

## 🔴 CRITICAL PRIORITY - Heavy Aggregations

### ⚠️ **DISCOVERY: Database Functions Already Exist!**

**Existing Functions:**
- ✅ `sync_estimate_to_budget(p_estimate_id)` - Already does server-side sync (migration `20251129075501`)
- ✅ `project_budget_ledger_view` - Pre-aggregated budget + actuals by cost code (migration `20251203063808`)
- ✅ `get_project_budget_ledger(p_project_id)` - RPC function for single project
- ✅ `project_budget_vs_actual_view` - Summary view (migration `20251203063228`)
- ✅ `get_project_budget_overview(p_project_id)` - RPC function for overview

**Problem:** Frontend is NOT using these! It's reimplementing the logic.

---

### 1. **Budget Totals Calculation** (`useSyncEstimateToBudget.ts` lines 317-336)

**Current Implementation:**
```typescript
// Fetch ALL budget lines
const { data: allLines } = await supabase
  .from('project_budget_lines')
  .select('line_type, budget_amount')
  .eq('project_budget_id', budgetId);

// Calculate totals in frontend
const totals = { labor: 0, subs: 0, materials: 0, other: 0 };
allLines?.forEach((line) => {
  const amount = line.budget_amount || 0;
  if (line.line_type === 'labor') totals.labor += amount;
  else if (line.line_type === 'subs') totals.subs += amount;
  // ... etc
});

// Update budget header
await supabase.from('project_budgets').update({ labor_budget: totals.labor, ... });
```

**Problem:**
- Fetches ALL budget lines (could be 1000s) just to sum them
- Does aggregation in JavaScript
- Updates budget header manually

**Solution:**
- ✅ **ALREADY EXISTS:** `sync_estimate_to_budget()` function calculates totals (lines 222-247)
- ⚠️ **NEEDED:** Trigger to auto-update totals when lines change (not just on sync)
- **Action:** Use the existing function instead of frontend logic

**Migration:**
```sql
-- Option 1: Trigger-based (recommended)
CREATE OR REPLACE FUNCTION recalculate_budget_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE project_budgets
  SET
    labor_budget = COALESCE((
      SELECT SUM(budget_amount) FROM project_budget_lines
      WHERE project_budget_id = COALESCE(NEW.project_budget_id, OLD.project_budget_id)
      AND line_type = 'labor'
    ), 0),
    subs_budget = COALESCE((
      SELECT SUM(budget_amount) FROM project_budget_lines
      WHERE project_budget_id = COALESCE(NEW.project_budget_id, OLD.project_budget_id)
      AND line_type = 'subs'
    ), 0),
    materials_budget = COALESCE((
      SELECT SUM(budget_amount) FROM project_budget_lines
      WHERE project_budget_id = COALESCE(NEW.project_budget_id, OLD.project_budget_id)
      AND line_type = 'materials'
    ), 0),
    other_budget = COALESCE((
      SELECT SUM(budget_amount) FROM project_budget_lines
      WHERE project_budget_id = COALESCE(NEW.project_budget_id, OLD.project_budget_id)
      AND line_type = 'other'
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_budget_id, OLD.project_budget_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_budget_totals
  AFTER INSERT OR UPDATE OR DELETE ON project_budget_lines
  FOR EACH ROW EXECUTE FUNCTION recalculate_budget_totals();
```

**Impact:** Eliminates fetching all lines + frontend aggregation on every sync

---

### 2. **Unified Budget Aggregation** (`useUnifiedProjectBudget.ts` lines 100-436)

**Current Implementation:**
- Fetches ALL budget lines, ALL time logs, ALL costs for a project
- Builds cost code map in memory (lines 222-357)
- Calculates variances, summaries in JavaScript (lines 359-428)
- Joins estimates in memory (lines 156-174)

**Problem:**
- Massive data transfer (could be 10,000+ rows)
- Complex in-memory aggregation
- Multiple queries that could be one
- Category normalization happening in JS (lines 71-89)

**Solution:**
- ✅ **VIEW EXISTS:** `project_budget_ledger_view` already pre-aggregates by cost_code_id + category!
- ✅ **FUNCTION EXISTS:** `get_project_budget_ledger(p_project_id)` returns aggregated data!
- ⚠️ **ACTION NEEDED:** Replace `useUnifiedProjectBudget` to use the view instead

**Migration:**
```typescript
// REPLACE useUnifiedProjectBudget.ts with:
export function useUnifiedProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ["unified-project-budget", projectId],
    queryFn: async () => {
      // Use existing view instead of fetching raw data
      const { data: ledgerRows, error } = await supabase
        .rpc('get_project_budget_ledger', { p_project_id: projectId });
      
      if (error) throw error;
      
      // Transform view rows to match existing interface (minimal transformation)
      const costCodeLines = ledgerRows?.map(row => ({
        cost_code_id: row.cost_code_id,
        code: row.cost_code,
        description: row.cost_code_name,
        category: row.category,
        budget_amount: row.budget_amount,
        budget_hours: row.budget_hours,
        actual_amount: row.actual_amount,
        actual_hours: row.actual_hours,
        variance: row.variance,
        is_allowance: row.is_allowance,
        details: [], // Could fetch separately if needed
        source_estimate_id: null, // Could join if needed
        source_estimate_title: null,
        budget_line_details: [],
      })) || [];
      
      // Summary from project_budget_vs_actual_view
      const { data: overview } = await supabase
        .rpc('get_project_budget_overview', { p_project_id: projectId });
      
      const summary = overview?.[0] ? {
        total_budget: overview[0].total_budget,
        total_actual: overview[0].total_actual_costs,
        total_variance: overview[0].total_budget - overview[0].total_actual_costs,
        labor_budget: overview[0].labor_budget,
        labor_actual: overview[0].labor_actual,
        labor_variance: overview[0].labor_budget - overview[0].labor_actual,
        labor_unpaid: overview[0].labor_unpaid,
        subs_budget: overview[0].subs_budget,
        subs_actual: overview[0].subs_actual,
        subs_variance: overview[0].subs_budget - overview[0].subs_actual,
        materials_budget: overview[0].materials_budget,
        materials_actual: overview[0].materials_actual,
        materials_variance: overview[0].materials_budget - overview[0].materials_actual,
        other_budget: overview[0].other_budget,
        other_actual: overview[0].other_actual,
        other_variance: overview[0].other_budget - overview[0].other_actual,
      } : defaultSummary;
      
      return { costCodeLines, summary };
    },
  });
}
```

**Impact:** Reduces data transfer by 90%+, eliminates frontend aggregation, uses existing optimized views

---

### 3. **Estimate Sync Logic** (`useSyncEstimateToBudget.ts` lines 126-315) ⚠️ **CRITICAL**

**Current Implementation:**
- Fetches ALL scope blocks + cost items (lines 131-156)
- Transforms data in JavaScript (lines 163-217)
- Groups legacy estimate_items in memory (lines 236-253)
- Calculates averages, totals in JS (lines 266-272)

**Problem:**
- Complex transformation logic in frontend
- Multiple queries that could be one
- Category normalization in JS (lines 167-174, 239-246)

**Solution:**
- ✅ **FUNCTION EXISTS:** `sync_estimate_to_budget(p_estimate_id)` already does everything!
- ⚠️ **PROBLEM:** Frontend is NOT using it - reimplementing the logic
- **Action:** Replace entire frontend sync logic with RPC call to existing function

**Migration:**
```typescript
// REPLACE useSyncEstimateToBudget.ts mutationFn with:
mutationFn: async (options: SyncEstimateToBudgetOptions) => {
  const { projectId, estimateId, mode = 'merge' } = options;
  
  // If replace mode, archive existing budget first
  if (mode === 'replace') {
    const { error: archiveError } = await supabase
      .from('project_budgets')
      .update({ status: 'archived' })
      .eq('project_id', projectId)
      .eq('status', 'active');
    
    if (archiveError) throw archiveError;
  }
  
  // Call existing database function
  const { error: syncError } = await supabase.rpc('sync_estimate_to_budget', {
    p_estimate_id: estimateId
  });
  
  if (syncError) throw syncError;
  
  return { budgetId: 'calculated', estimateId, mode };
}
```

**Impact:** Eliminates 200+ lines of frontend transformation logic, uses optimized database function

---

## 🟡 HIGH PRIORITY - Multiple Queries & Grouping

### 4. **Proposal Area Grouping** (`useProposalData.ts` lines 193-209)

**Current Implementation:**
```typescript
// Fetch all items
const allItems = blocks.flatMap(...);

// Group by area in frontend
const areaMap = new Map<string, ScopeLineItem[]>();
allItems.forEach((item) => {
  const areaKey = item.area_label || 'General';
  areaMap.get(areaKey)!.push(item);
});

// Calculate subtotals
const scopeByArea = Array.from(areaMap.entries()).map(
  ([area_label, items]) => ({
    area_label,
    subtotal: items.reduce((sum, item) => sum + (item.line_total || 0), 0),
    items,
  })
);
```

**Problem:**
- Groups and sums in JavaScript
- Could be done in SQL with GROUP BY

**Solution:**
- **Create view:** `proposal_items_by_area_view`
- **Or use SQL aggregation:** GROUP BY area_label in query

**Migration:**
```sql
-- View for proposal area grouping
CREATE OR REPLACE VIEW proposal_items_by_area_view AS
SELECT
  p.id AS proposal_id,
  COALESCE(sbci.area_label, 'General') AS area_label,
  jsonb_agg(
    jsonb_build_object(
      'id', sbci.id,
      'description', sbci.description,
      'quantity', sbci.quantity,
      'unit', sbci.unit,
      'unit_price', sbci.unit_price,
      'line_total', sbci.line_total,
      'category', sbci.category
    ) ORDER BY sbci.sort_order
  ) AS items,
  SUM(sbci.line_total) AS subtotal
FROM proposals p
JOIN scope_blocks sb ON sb.entity_type = 'estimate' AND sb.entity_id = p.primary_estimate_id
JOIN scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
WHERE sb.is_visible = true
GROUP BY p.id, COALESCE(sbci.area_label, 'General');
```

**Impact:** Reduces data processing, cleaner code

---

### 5. **Estimate Totals Calculation** (Multiple locations)

**Locations:**
- `EstimateSummaryCards.tsx` lines 31-43
- `ProjectEstimateEditor.tsx` lines 169-183
- `estimateExport.ts` lines 159-167

**Current Implementation:**
```typescript
const allItems = scopeBlocks.flatMap((b) => b.scope_block_cost_items);
const subtotal = allItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
const categoryTotals = {};
for (const item of allItems) {
  categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.line_total;
}
```

**Problem:**
- Calculates totals every render
- Fetches all items just to sum them

**Solution:**
- **Add columns to estimates table:** `subtotal_amount`, `tax_amount`, `total_amount` (already exist!)
- **Create trigger:** Update estimate totals when scope_block_cost_items change
- **Use stored totals:** Don't recalculate, use `estimate.subtotal_amount`

**Migration:**
```sql
-- Trigger to update estimate totals
CREATE OR REPLACE FUNCTION update_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_estimate_id uuid;
  v_subtotal numeric;
  v_tax_amount numeric;
  v_total numeric;
BEGIN
  -- Get estimate_id from scope_block
  SELECT entity_id INTO v_estimate_id
  FROM scope_blocks
  WHERE id = COALESCE(NEW.scope_block_id, OLD.scope_block_id)
  AND entity_type = 'estimate';
  
  IF v_estimate_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate subtotal
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM scope_block_cost_items sbci
  JOIN scope_blocks sb ON sbci.scope_block_id = sb.id
  WHERE sb.entity_type = 'estimate'
    AND sb.entity_id = v_estimate_id
    AND sb.is_visible = true;
  
  -- Get tax amount from estimate
  SELECT COALESCE(tax_amount, 0) INTO v_tax_amount
  FROM estimates WHERE id = v_estimate_id;
  
  v_total := v_subtotal + v_tax_amount;
  
  -- Update estimate
  UPDATE estimates
  SET
    subtotal_amount = v_subtotal,
    total_amount = v_total,
    updated_at = now()
  WHERE id = v_estimate_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_estimate_totals
  AFTER INSERT OR UPDATE OR DELETE ON scope_block_cost_items
  FOR EACH ROW EXECUTE FUNCTION update_estimate_totals();
```

**Impact:** Eliminates frontend calculation, ensures consistency

---

### 6. **Project Overview Stats** (`useProjectOverviewStats.ts` lines 44-62)

**Current Implementation:**
- Fetches ALL time_logs, ALL costs
- Filters and sums in JavaScript

**Solution:**
- **Use existing views:** `project_labor_summary_view`, `project_cost_summary_view`
- **Already optimized!** Just need to use them consistently

**Impact:** Already using views, but verify all call sites use them

---

## 🟢 MEDIUM PRIORITY - Data Transformation

### 7. **Budget Line Grouping** (`useProjectBudgetStructure.ts` lines 130-137)

**Current Implementation:**
```typescript
const linesByGroup: Record<string, ProjectBudgetLine[]> = {};
safeLines.forEach((line) => {
  const key = line.group_id || 'ungrouped';
  if (!linesByGroup[key]) linesByGroup[key] = [];
  linesByGroup[key].push(line);
});
```

**Problem:**
- Simple grouping, but could be done in SQL
- Not a huge performance issue, but cleaner in DB

**Solution:**
- **Use SQL ORDER BY:** Already ordering by group_id
- **Or create view:** `project_budget_lines_by_group_view`

**Impact:** Low priority, but cleaner code

---

### 8. **Estimate Item Aggregation (Legacy)** (`useSyncEstimateToBudget.ts` lines 236-306)

**Current Implementation:**
- Groups estimate_items by cost_code_id + category
- Calculates totals, averages in JavaScript

**Solution:**
- **Move to SQL:** Use GROUP BY in the sync function
- **Already partially done:** Migration `20251129075501` has SQL version

**Impact:** Legacy system, will be phased out

---

## 📊 SUMMARY - Migration Priority

### Phase 1 (Immediate - High Impact) ⚠️ **CRITICAL - Functions Already Exist!**
1. ✅ **Budget totals trigger** - Add trigger to auto-update totals (function already calculates on sync)
2. ✅ **Estimate totals trigger** - Add trigger to auto-update estimate totals
3. 🔴 **USE sync_estimate_to_budget() function** - Replace entire frontend sync logic (lines 41-368) with RPC call
4. 🔴 **USE project_budget_ledger_view** - Replace useUnifiedProjectBudget aggregation (lines 100-436) with view query

### Phase 2 (High Value)
4. ✅ **project_budget_ledger_view** - Pre-aggregate budget + actuals
5. ✅ **get_project_budget_summary() function** - Single query for summary

### Phase 3 (Cleanup)
6. ✅ **proposal_items_by_area_view** - SQL grouping
7. ✅ **Verify all stats use views** - Consistency check

---

## 🔧 IMPLEMENTATION NOTES

### Existing Database Functions
- ✅ `sync_estimate_to_budget(p_estimate_id)` exists (migration `20251129075501`)
- ✅ Views exist: `project_labor_summary_view`, `project_cost_summary_view`
- ⚠️ Need to enhance/verify these are being used

### Migration Strategy
1. **Create triggers first** - They'll auto-update totals
2. **Update frontend to use stored totals** - Remove calculation logic
3. **Create views for complex aggregations** - Replace frontend grouping
4. **Migrate sync logic** - Use database function instead of frontend

### Testing Checklist
- [ ] Budget totals update correctly when lines change
- [ ] Estimate totals update correctly when items change
- [ ] Sync function works with merge/replace modes
- [ ] Views return correct aggregated data
- [ ] Frontend still displays correctly (using DB data)

---

## 📈 EXPECTED PERFORMANCE GAINS

| Operation | Current | After Migration | Improvement |
|-----------|---------|-----------------|-------------|
| Budget sync | Fetch 1000+ lines, sum in JS | Trigger auto-updates | 90% faster |
| Budget view load | Fetch all lines + logs + costs | Single view query | 80% less data |
| Estimate totals | Calculate on every render | Use stored value | Instant |
| Proposal grouping | Group in JS | SQL GROUP BY | 50% faster |

---

## 🚨 CRITICAL FILES TO UPDATE

1. `src/hooks/useSyncEstimateToBudget.ts` - Remove totals calculation (lines 317-336)
2. `src/hooks/useUnifiedProjectBudget.ts` - Use view instead of aggregation (lines 100-436)
3. `src/components/estimates/EstimateSummaryCards.tsx` - Use `estimate.subtotal_amount` (lines 31-43)
4. `src/hooks/useProposalData.ts` - Use SQL grouping (lines 193-209)

---

## ✅ NEXT STEPS

### Immediate Actions Required:

1. **Add Budget Totals Trigger** (NEW)
   - Create trigger to auto-update `project_budgets.labor_budget`, etc. when lines change
   - Currently only updates during sync, not when lines are edited directly

2. **Add Estimate Totals Trigger** (NEW)
   - Create trigger to auto-update `estimates.subtotal_amount`, `total_amount` when items change
   - Currently calculated in frontend on every render

3. **Replace Frontend Sync Logic** (CRITICAL)
   - Replace `useSyncEstimateToBudget.ts` lines 41-368 with RPC call
   - Use existing `sync_estimate_to_budget()` function
   - Add merge/replace mode support to function if needed

4. **Replace Budget Aggregation** (CRITICAL)
   - Replace `useUnifiedProjectBudget.ts` lines 100-436 with view query
   - Use `get_project_budget_ledger()` RPC function
   - Use `get_project_budget_overview()` for summary

5. **Update Estimate Totals Usage**
   - Replace all `reduce()` calculations with `estimate.subtotal_amount`
   - Files: `EstimateSummaryCards.tsx`, `ProjectEstimateEditor.tsx`, `estimateExport.ts`

6. **Test Thoroughly**
   - Verify sync works with merge/replace modes
   - Verify totals update correctly
   - Verify views return correct data
   - Monitor performance improvements

---

## 📋 SPECIFIC CODE CHANGES NEEDED

### File: `src/hooks/useSyncEstimateToBudget.ts`
**Replace lines 41-368 with:**
```typescript
mutationFn: async (options: SyncEstimateToBudgetOptions) => {
  const { projectId, estimateId, mode = 'merge' } = options;
  
  // Handle replace mode (archive existing budget)
  if (mode === 'replace') {
    const { error } = await supabase
      .from('project_budgets')
      .update({ status: 'archived' })
      .eq('project_id', projectId)
      .eq('status', 'active');
    if (error) throw error;
  }
  
  // Call existing database function
  const { error } = await supabase.rpc('sync_estimate_to_budget', {
    p_estimate_id: estimateId
  });
  
  if (error) throw error;
  
  return { budgetId: 'calculated', estimateId, mode };
}
```

### File: `src/hooks/useUnifiedProjectBudget.ts`
**Replace lines 100-436 with:**
```typescript
queryFn: async () => {
  // Use existing ledger view
  const { data: ledgerRows, error: ledgerError } = await supabase
    .rpc('get_project_budget_ledger', { p_project_id: projectId });
  
  if (ledgerError) throw ledgerError;
  
  // Use existing overview view for summary
  const { data: overviewRows, error: overviewError } = await supabase
    .rpc('get_project_budget_overview', { p_project_id: projectId });
  
  if (overviewError) throw overviewError;
  
  const overview = overviewRows?.[0];
  
  // Transform to match existing interface
  return {
    costCodeLines: ledgerRows?.map(row => ({
      cost_code_id: row.cost_code_id,
      code: row.cost_code,
      description: row.cost_code_name,
      category: row.category,
      budget_amount: row.budget_amount,
      budget_hours: row.budget_hours,
      actual_amount: row.actual_amount,
      actual_hours: row.actual_hours,
      variance: row.variance,
      is_allowance: row.is_allowance,
      details: [], // Fetch separately if detail view needed
      source_estimate_id: null,
      source_estimate_title: null,
      budget_line_details: [],
    })) || [],
    summary: overview ? {
      total_budget: overview.total_budget,
      total_actual: overview.total_actual_costs,
      total_variance: overview.total_budget - overview.total_actual_costs,
      labor_budget: overview.labor_budget,
      labor_actual: overview.labor_actual,
      labor_variance: overview.labor_budget - overview.labor_actual,
      labor_unpaid: overview.labor_unpaid,
      subs_budget: overview.subs_budget,
      subs_actual: overview.subs_actual,
      subs_variance: overview.subs_budget - overview.subs_actual,
      materials_budget: overview.materials_budget,
      materials_actual: overview.materials_actual,
      materials_variance: overview.materials_budget - overview.materials_actual,
      other_budget: overview.other_budget,
      other_actual: overview.other_actual,
      other_variance: overview.other_budget - overview.other_actual,
    } : defaultSummary,
  };
}
```

### File: `src/components/estimates/EstimateSummaryCards.tsx`
**Replace lines 31-43 with:**
```typescript
// Use stored totals from estimate instead of calculating
const { subtotal, total, itemCount, categoryTotals } = useMemo(() => {
  // Get from estimate if available, otherwise calculate
  if (estimate?.subtotal_amount !== null && estimate?.subtotal_amount !== undefined) {
    return {
      subtotal: estimate.subtotal_amount,
      total: estimate.total_amount || estimate.subtotal_amount,
      itemCount: scopeBlocks.reduce((sum, b) => sum + b.scope_block_cost_items.length, 0),
      categoryTotals: {}, // Could fetch separately if needed
    };
  }
  // Fallback calculation (shouldn't happen if trigger works)
  const allItems = scopeBlocks.flatMap((b) => b.scope_block_cost_items);
  return {
    subtotal: allItems.reduce((sum, item) => sum + (item.line_total || 0), 0),
    total: allItems.reduce((sum, item) => sum + (item.line_total || 0), 0) + (taxAmount || 0),
    itemCount: allItems.length,
    categoryTotals: {},
  };
}, [scopeBlocks, taxAmount, estimate]);
```

---

## 🎯 MIGRATION PRIORITY SUMMARY

| Priority | Task | Impact | Effort | Status |
|----------|------|--------|--------|--------|
| 🔴 **P0** | Use `sync_estimate_to_budget()` RPC | Eliminates 200+ lines | Low | ⚠️ Not done |
| 🔴 **P0** | Use `project_budget_ledger_view` | Eliminates aggregation | Low | ⚠️ Not done |
| 🟡 **P1** | Add budget totals trigger | Auto-updates on edits | Medium | ❌ Missing |
| 🟡 **P1** | Add estimate totals trigger | Auto-updates on edits | Medium | ❌ Missing |
| 🟢 **P2** | Use stored estimate totals | Eliminates calculation | Low | ⚠️ Partial |
| 🟢 **P2** | SQL grouping for proposals | Cleaner code | Low | ❌ Missing |

---

## 📊 EXPECTED PERFORMANCE GAINS

| Operation | Current | After Migration | Improvement |
|-----------|---------|-----------------|-------------|
| Budget sync | 200+ lines JS logic | Single RPC call | 95% faster |
| Budget view load | Fetch 10,000+ rows, aggregate in JS | Single view query | 90% less data |
| Estimate totals | Calculate on every render | Use stored value | Instant |
| Proposal grouping | Group in JS | SQL GROUP BY | 50% faster |

---

## 🚨 CRITICAL FILES TO UPDATE

1. ✅ `src/hooks/useSyncEstimateToBudget.ts` - **REPLACE with RPC call** (lines 41-368)
2. ✅ `src/hooks/useUnifiedProjectBudget.ts` - **REPLACE with view query** (lines 100-436)
3. ✅ `src/components/estimates/EstimateSummaryCards.tsx` - **Use estimate.subtotal_amount** (lines 31-43)
4. ✅ `src/components/estimates/ProjectEstimateEditor.tsx` - **Use estimate.subtotal_amount** (lines 169-183)
5. ✅ `src/lib/estimateExport.ts` - **Use estimate.subtotal_amount** (lines 159-167)
