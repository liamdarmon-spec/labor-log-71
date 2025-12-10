# Test Checklist: Financials → Costs Flow

## ✅ Build Status
- **TypeScript compilation:** ✅ PASSED (no errors)
- **Linting:** ✅ PASSED (no errors)
- **All imports resolved:** ✅ PASSED

## Manual Testing Steps

### Test 1: Default "All Projects" View
1. Navigate to **Financials → Costs**
2. **Expected:** 
   - Project selector shows "All Projects" (default)
   - Shows legacy costs view with tabs: All Costs, Labor, Subcontractors, Materials, Equipment, Other
   - Labor tab shows "Go to Payments" message
   - All Costs tab shows costs table with filters

### Test 2: Project-Specific View
1. Navigate to **Financials → Costs**
2. Select a project from the project selector dropdown
3. **Expected:**
   - Description changes to: "Project cost code ledger with budget vs actual (same view as Project → Budget tab)"
   - Shows "Cost Code Ledger" card
   - Tabs change to: All, Labor, Subs, Materials, Other (5 tabs instead of 6)
   - Cost code ledger table appears with same structure as Project → Budget tab

### Test 3: Data Consistency Check
1. Pick a project with budget/actual data (e.g., project with CAB-L cost code)
2. Go to **Project → Budget** tab
3. Note the totals for:
   - Labor budget vs actual
   - Subs budget vs actual  
   - Materials budget vs actual
   - Specific cost codes (e.g., CAB-L)
4. Go to **Financials → Costs**
5. Select the same project
6. **Expected:**
   - Labor tab shows same totals (includes `time_logs` data)
   - Subs tab shows same totals
   - Materials tab shows same totals
   - Cost codes match (e.g., CAB-L shows same budget/actual/variance)
   - Numbers should be **identical** to Project → Budget tab

### Test 4: Category Filtering
1. In **Financials → Costs** with a project selected
2. Click "Labor" tab
3. **Expected:**
   - Only shows cost codes categorized as "labor"
   - Includes labor from `time_logs` table
   - Cost codes ending in `-L` should appear here
4. Click "Subs" tab
5. **Expected:**
   - Only shows cost codes categorized as "subs"
   - Cost codes ending in `-S` should appear here
6. Click "Materials" tab
7. **Expected:**
   - Only shows cost codes categorized as "materials"
   - Cost codes ending in `-M` should appear here

### Test 5: Switching Between Views
1. Start with "All Projects" selected
2. Select a project
3. **Expected:** View switches to cost code ledger
4. Switch back to "All Projects"
5. **Expected:** View switches back to legacy costs table
6. **No errors or crashes**

### Test 6: Edge Cases
1. **Project without active budget:**
   - Select a project with no active budget
   - **Expected:** Shows empty cost code ledger (no errors)

2. **Project with archived budget only:**
   - Select a project with only archived budgets
   - **Expected:** Shows empty cost code ledger (active budget filter excludes archived)

3. **Project with no costs:**
   - Select a project with budget but no actuals
   - **Expected:** Shows budget amounts, actuals = 0, variance = budget

## Expected Behavior Summary

### When "All Projects" Selected:
- ✅ Shows legacy `CostsTab` component
- ✅ All costs across all projects
- ✅ Labor tab shows "Go to Payments" message
- ✅ Uses `useCosts()` and `useCostsSummary()` hooks

### When Project Selected:
- ✅ Shows `CostCodeLedgerTab` component
- ✅ Uses `useUnifiedProjectBudget(projectId)` hook (canonical)
- ✅ Filters by active budget only
- ✅ Includes labor from `time_logs`
- ✅ Uses cost code suffix normalization (`-L`, `-S`, `-M`)
- ✅ Same data as Project → Budget tab

## Files to Verify

- ✅ `src/pages/financials/CostsAPTab.tsx` - Project selector added
- ✅ `src/components/project/financials/CostCodeLedgerTab.tsx` - Uses `useUnifiedProjectBudget`
- ✅ `src/hooks/useUnifiedProjectBudget.ts` - Canonical data model
- ✅ `FINANCIALS_CROSSVIEW_AUDIT.md` - Documentation created

## Success Criteria

✅ **Build compiles without errors**
✅ **No runtime TypeScript errors**
✅ **Project selector appears and works**
✅ **When project selected, shows cost code ledger**
✅ **Numbers match Project → Budget tab exactly**
✅ **Category filtering works correctly**
✅ **Switching between views doesn't crash**
