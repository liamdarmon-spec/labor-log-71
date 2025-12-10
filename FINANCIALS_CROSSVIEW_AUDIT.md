# Financials Cross-View Audit

## Overview

This document compares the data sources and logic used by:
1. **Project-level Cost Code Ledger** (Project → Budget tab)
2. **Global Financials → Costs** (Financials → Costs tab)

## Data Source Comparison

### Project-Level Cost Code Ledger

**Component:** `src/components/project/ProjectBudgetTabV2.tsx`
**Hook:** `useUnifiedProjectBudget(projectId)` from `src/hooks/useUnifiedProjectBudget.ts`

**Data Sources:**
- **Budget Lines:** `project_budgets` (status = 'active') → `project_budget_lines` (filtered by `project_budget_id`)
- **Labor Actuals:** `time_logs` (filtered by `project_id`)
- **Non-Labor Costs:** `costs` (filtered by `project_id`)

**Category Normalization:**
- Uses `normalizeCategoryFromLine()` which:
  1. Checks cost code suffix first: `-L` → labor, `-S` → subs, `-M` → materials
  2. Falls back to `line.category` field
- Uses `normalizeCategory()` for costs table: checks category string prefix

**Aggregation:**
- Groups by composite key: `(cost_code_id, category)`
- Sums budget amounts from active budget lines only
- Sums actual amounts from `time_logs` (labor) + `costs` (non-labor)
- Calculates variance = budget - actual

**Filters:**
- `project_id` = specific project
- `project_budget_id` = active budget only
- No date filters (shows all time)

---

### Global Financials → Costs

**Component:** `src/pages/financials/CostsAPTab.tsx` → `src/components/financials/CostsTab.tsx`
**Hooks:** `useCosts(filters)` and `useCostsSummary(filters)` from `src/hooks/useCosts.ts`

**Data Sources:**
- **All Costs:** `costs` table (NO project filter by default - shows ALL projects)
- **Labor Tab:** Shows message "Go to Payments" (does NOT query `time_logs`)
- **Subs Tab:** `sub_invoices` table (different source)
- **Materials Tab:** `material_receipts` table (different source)

**Category Normalization:**
- Simple string matching: `category === 'labor'`, `category === 'subs'`, etc.
- Does NOT check cost code suffixes (`-L`, `-S`, `-M`)
- Does NOT use `normalizeCategoryFromLine()` logic

**Aggregation:**
- Groups by `category` field directly
- Sums `amount` from `costs` table
- Does NOT include labor from `time_logs`
- Does NOT filter by active budget

**Filters:**
- `startDate` / `endDate` (optional)
- `companyId` (optional)
- `category` (optional)
- `status` (paid/unpaid)
- **NO project filter** (shows all projects)

---

## Root Cause

The two views disagree because:

1. **Different Data Sources:**
   - Project ledger: `project_budget_lines` + `time_logs` + `costs` (for one project)
   - Financials Costs: `costs` table only (across all projects)

2. **Different Category Logic:**
   - Project ledger: Checks cost code suffix (`-L`, `-S`, `-M`) first, then category field
   - Financials Costs: Uses category field directly (no cost code suffix checking)

3. **Missing Labor Data:**
   - Project ledger: Includes labor from `time_logs`
   - Financials Costs: Labor tab just shows "Go to Payments" message

4. **No Active Budget Filter:**
   - Project ledger: Only shows lines from active budget (`status = 'active'`)
   - Financials Costs: Shows all costs regardless of budget status

5. **Scope Difference:**
   - Project ledger: Single project view
   - Financials Costs: All projects view (no project selector)

---

## Solution Design

**Goal:** Make Financials → Costs consistent with project-level ledger when viewing a specific project.

**Implementation Strategy:**

1. **Add Project Selector** to `CostsAPTab`:
   - Default: "All Projects" (current behavior)
   - When project selected: Use `useUnifiedProjectBudget(projectId)` for canonical data

2. **When Project Selected:**
   - Use `useUnifiedProjectBudget(projectId)` hook (same as project ledger)
   - Display cost code ledger with same structure via `CostCodeLedgerTab` component
   - Use same category normalization logic (cost code suffix checking)
   - Include labor from `time_logs`
   - Filter by active budget only

3. **When "All Projects" Selected:**
   - Keep current behavior (show all costs across projects using `CostsTab`)

**Implementation:** Add project selector, when selected reuse `CostCodeLedgerTab` component which internally uses `useUnifiedProjectBudget`.

---

## Implementation Details

**File Modified:** `src/pages/financials/CostsAPTab.tsx`

**Changes:**
1. Added project selector dropdown (defaults to "All Projects")
2. Conditional rendering:
   - When project selected: Show `CostCodeLedgerTab` component (uses canonical `useUnifiedProjectBudget`)
   - When "All Projects": Show legacy `CostsTab` component (all projects view)
3. Project selector fetches projects list for dropdown

**Benefits:**
- ✅ Same data model as Project → Budget tab when project is selected
- ✅ Same category normalization logic
- ✅ Includes labor from `time_logs`
- ✅ Filters by active budget only
- ✅ Backward compatible (All Projects view unchanged)

---

## Verification Steps

1. **Pick a project with non-zero budget/actual data** (e.g., project with CAB-L cost code)
   - Go to Project → Budget tab
   - Note the Labor/Subs/Materials totals from the Cost Code Ledger
   - Note specific cost codes and their budget vs actual values

2. **Go to Financials → Costs**
   - Should default to "All Projects" view (legacy behavior)

3. **Select the same project from the project selector**
   - Should see "Cost Code Ledger" card appear
   - Description should say "same view as Project → Budget tab"

4. **Verify totals match:**
   - **Labor tab:** Should show same labor totals (includes `time_logs` data)
   - **Subs tab:** Should show same subs totals (uses same category normalization)
   - **Materials tab:** Should show same materials totals
   - **All tab:** Should show all cost codes with same budget vs actual

5. **Verify category normalization:**
   - Cost codes ending in `-L` should be categorized as "labor"
   - Cost codes ending in `-S` should be categorized as "subs"
   - Cost codes ending in `-M` should be categorized as "materials"
   - This should match the Project → Budget tab behavior

6. **Switch back to "All Projects"**
   - Should show legacy costs view (all costs across all projects)
   - Should still work as before

**Edge Cases to Test:**
- Projects without active budgets (should show empty/zero in cost code ledger)
- Projects with archived budgets (should not include archived budget lines)
- Cost codes with suffixes (`-L`, `-S`, `-M`) vs category field mismatch (suffix should win)
- Labor costs from `time_logs` (should be included when project selected)
- Projects with no budget lines but have costs (should show actuals only)

---

## Summary

**Problem:** Financials → Costs showed different numbers than Project → Budget tab because:
- Used different data sources (`costs` table vs `project_budget_lines` + `time_logs`)
- Used different category normalization (no cost code suffix checking)
- Didn't filter by active budget
- Didn't include labor from `time_logs`

**Solution:** Added project selector to Financials → Costs:
- When project selected: Uses `CostCodeLedgerTab` component (same as Project → Budget tab)
- When "All Projects": Keeps legacy `CostsTab` behavior (all projects view)
- Ensures consistency when viewing a specific project

**Files Modified:**
- `src/pages/financials/CostsAPTab.tsx` - Added project selector and conditional rendering
