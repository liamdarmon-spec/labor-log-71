# Financials AP Model Documentation

## Overview

This document describes the unified Accounts Payable (AP) model for all non-labor costs (subs, materials, equipment, other) in the Forma ERP system.

## Data Model

### Core Tables

#### `costs` Table (Canonical AP Ledger)

The `costs` table is the single source of truth for all non-labor project expenses.

**Key Fields:**
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `company_id` (UUID, FK → companies, nullable)
- `vendor_type` ('sub' | 'supplier' | 'other', nullable)
- `vendor_id` (UUID, nullable - references subs or suppliers)
- `description` (TEXT, required)
- `cost_code_id` (UUID, FK → cost_codes, required)
- `category` ('subs' | 'materials' | 'equipment' | 'misc')
- `amount` (NUMERIC, required) - Total cost amount
- `paid_amount` (NUMERIC, default 0) - **Total amount paid** (sum of `applied_amount` from `vendor_payment_items`)
- `retention_amount` (NUMERIC, default 0, nullable) - Amount held as retention (typically for subs)
- `date_incurred` (DATE, required)
- `status` ('unpaid' | 'partially_paid' | 'paid' | 'void' | 'disputed') - **Derived from `paid_amount` vs `amount`**
- `paid_date` (DATE, nullable) - Date when fully paid
- `payment_id` (UUID, FK → payments, nullable) - **Legacy field, deprecated** (use `vendor_payment_items` instead)
- `notes` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Status Derivation Logic:**
- `paid_amount = 0` → `status = 'unpaid'`
- `0 < paid_amount < amount` → `status = 'partially_paid'`
- `paid_amount >= amount` → `status = 'paid'`

**Payable Amount Calculation:**
- For subcontractors: `payable_amount = amount - retention_amount`
- For others: `payable_amount = amount`

---

#### `vendor_payments` Table (Payment Events)

One row per actual payment event (check, ACH, card charge, etc.).

**Key Fields:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies, nullable)
- `vendor_type` (TEXT, required) - 'sub', 'supplier', 'other'
- `vendor_id` (UUID, required) - References subs or suppliers
- `payment_date` (DATE, required)
- `amount` (NUMERIC, required) - Total payment amount
- `method` (TEXT, nullable) - 'card', 'cash', 'check', 'ach'
- `reference` (TEXT, nullable) - Check number, transaction ID, etc.
- `notes` (TEXT, nullable)
- `status` (TEXT, default 'recorded')
- `created_at`, `updated_at` (TIMESTAMPTZ)

---

#### `vendor_payment_items` Table (Join Table)

Many-to-many relationship between `vendor_payments` and `costs`. Each row represents a payment applied to a specific cost.

**Key Fields:**
- `id` (UUID, PK)
- `payment_id` (UUID, FK → vendor_payments, required)
- `cost_id` (UUID, FK → costs, required)
- `applied_amount` (NUMERIC, required, > 0) - Amount from this payment applied to the linked cost
- `created_at` (TIMESTAMPTZ)
- **Unique constraint:** `(payment_id, cost_id)` - Prevents duplicate links

**Relationship Rules:**
- One payment can be applied to multiple costs
- One cost can receive payments from multiple payment records
- `cost.paid_amount = SUM(applied_amount)` over all `vendor_payment_items` for that cost

---

## Payment Flow

### A. Subcontractor Invoices (`category='subs'`)

**Default Behavior:**
- When a cost is created with `category='subs'`:
  - `status = 'unpaid'`
  - `paid_amount = 0`
  - `retention_amount` can be set (typically 5-10% of amount)

**Payment Process:**
1. User navigates to **Financials → Payments → Subcontractor Payments**
2. Views unpaid subs costs grouped by vendor/project
3. Selects costs to pay
4. Creates a payment batch:
   - One `vendor_payment` record per vendor
   - Multiple `vendor_payment_items` records linking payment to selected costs
   - `applied_amount` = amount to apply to each cost (can be partial)
5. Trigger automatically updates `cost.paid_amount` and `cost.status`

**Payable Amount:**
- `payable_amount = amount - retention_amount`
- Retention is held until project completion or milestone

---

### B. Material Receipts (`category='materials'` or `category='equipment'`)

**Two Modes:**

#### 1. Already Paid (Card/Cash)
- When creating cost, user checks **"Paid Immediately"**
- System automatically:
  - Creates `vendor_payment` record
  - Creates `vendor_payment_items` link
  - Sets `paid_amount = amount`, `status = 'paid'`
- Typical for: Home Depot card charges, cash purchases, small receipts

#### 2. On Terms (Unpaid)
- User leaves "Paid Immediately" unchecked
- Cost created with `status = 'unpaid'`
- Flows through same payment batch UI as subs
- Typical for: Large material invoices, supplier terms

---

## Data Consistency

### Project-Level vs Global Views

**Project-Level Cost Code Ledger:**
- Component: `CostCodeLedgerTab` (used in Project → Budget tab)
- Hook: `useUnifiedProjectBudget(projectId)`
- Data Source: `costs` table filtered by `project_id`
- Aggregation: Groups by `(cost_code_id, category)`

**Global Financials → Costs:**
- Component: `CostsAPTab` → `CostsTab`
- Hook: `useCosts(filters)` + `useCostsSummary(filters)`
- Data Source: Same `costs` table (no project filter by default)
- Aggregation: Sums `amount`, `paid_amount` across all projects

**Consistency Guarantee:**
- Both views use the same `costs` table
- Both calculate unpaid as `amount - paid_amount`
- Project-level view = filtered subset of global view
- Numbers match when same filters are applied

---

## Hooks & Functions

### `useCosts(filters?)`
- Fetches costs with joins to projects, cost_codes, subs
- Supports filters: date range, category, status, project, company
- Returns array of `Cost` objects

### `useCostsSummary(filters?)`
- Aggregates costs for dashboard cards
- Returns:
  - `totalCosts` = SUM(amount)
  - `unpaidCosts` = SUM(amount - paid_amount)
  - `paidCosts` = SUM(paid_amount)
  - `byCategory` breakdown

### `useCreateCost()`
- Creates new cost record
- Supports "paid immediately" mode (creates payment + link automatically)
- Invalidates financial queries on success

### `useUpdateCost()`
- Updates cost fields
- Note: `paid_amount` and `status` are auto-calculated by trigger
- Manual updates to these fields are discouraged

---

## Database Triggers

### `update_cost_paid_amount()`
- **Triggered:** On INSERT/UPDATE/DELETE of `vendor_payment_items`
- **Action:**
  1. Calculates `SUM(applied_amount)` for the affected cost
  2. Updates `cost.paid_amount`
  3. Derives `cost.status` based on `paid_amount` vs `amount`
  4. Sets `cost.paid_date` if fully paid

**This ensures:**
- `paid_amount` is always accurate
- `status` is always in sync
- No manual updates needed

---

## UI Components

### `AddCostDialog`
- Location: Financials → Costs → "Add Cost" button
- Features:
  - Category selector (Subs, Materials, Equipment, Misc)
  - "Paid Immediately" toggle (for materials/equipment)
  - Payment method selector (when paid immediately)
  - Retention amount field (for subs)
- Creates cost + optional payment automatically

### `SubPaymentsTab`
- Location: Financials → Costs → Subcontractors tab
- Features:
  - Lists unpaid subs costs from `costs` table
  - Summary cards: Total Unpaid, Retention Held, Unpaid Count
  - "Mark as Paid" button (creates payment batch)
- Uses same data model as All Costs tab

### `CostsTab`
- Location: Financials → Costs → All Costs tab
- Features:
  - Filters: date, company, category, status
  - Summary cards: Total Costs, Unpaid, Paid, By Category
  - Detailed table with all costs
- Canonical view of all AP costs

---

## Migration Notes

### Required SQL Migration

Run migration: `supabase/migrations/20251210004803_unified_ap_payment_model.sql`

**What it does:**
1. Adds `paid_amount` column to `costs` table
2. Expands `status` constraint to include 'partially_paid'
3. Adds `retention_amount` column
4. Ensures `vendor_payment_items` table exists with `applied_amount` column
5. Creates trigger to auto-update `paid_amount` from payment items
6. Updates views to use `paid_amount` for calculations

**Backward Compatibility:**
- Existing costs with `status='paid'` are backfilled: `paid_amount = amount`
- Existing costs with `status='unpaid'` have `paid_amount = 0`
- Legacy `payment_id` FK is preserved but deprecated

---

## Best Practices

### Creating Costs

1. **Subcontractor invoices:**
   - Set `category='subs'`
   - Set `status='unpaid'` (default)
   - Set `retention_amount` if applicable
   - Do NOT check "Paid Immediately"

2. **Material receipts (already paid):**
   - Set `category='materials'` or `'equipment'`
   - Check "Paid Immediately"
   - Select payment method
   - System creates payment record automatically

3. **Material invoices (on terms):**
   - Set `category='materials'`
   - Leave "Paid Immediately" unchecked
   - Process through payment batch UI later

### Processing Payments

1. **Batch Processing:**
   - Group costs by vendor
   - Create one `vendor_payment` per vendor
   - Create multiple `vendor_payment_items` linking payment to costs
   - Trigger automatically updates `paid_amount` and `status`

2. **Partial Payments:**
   - Set `applied_amount < cost.amount` in `vendor_payment_items`
   - Cost status becomes 'partially_paid'
   - Can apply additional payments later

3. **Retention:**
   - For subs, `payable_amount = amount - retention_amount`
   - Apply full `payable_amount` in payment, not full `amount`
   - Retention released separately when milestone reached

---

## Troubleshooting

### Issue: Unpaid costs showing as paid
- **Check:** `cost.paid_amount` vs `cost.amount`
- **Fix:** Verify `vendor_payment_items` links are correct
- **Recalculate:** Trigger should auto-update, but can manually run:
  ```sql
  UPDATE costs SET paid_amount = (
    SELECT COALESCE(SUM(applied_amount), 0)
    FROM vendor_payment_items
    WHERE cost_id = costs.id
  );
  ```

### Issue: Summary totals don't match detail table
- **Check:** Filters applied consistently
- **Check:** `useCostsSummary` selects `paid_amount` column
- **Fix:** Ensure both use same query/filters

### Issue: Payment created but cost not marked paid
- **Check:** `vendor_payment_items` record exists
- **Check:** Trigger is enabled
- **Fix:** Verify trigger function `update_cost_paid_amount()` exists and is attached

---

## Future Enhancements

### TODO:
- [ ] Add payment batch UI component for unified subs/materials payment processing
- [ ] Add retention release workflow
- [ ] Add payment reconciliation view
- [ ] Add vendor payment history report
- [ ] Add cost approval workflow (for large costs)

---

## Related Files

- **Migration:** `supabase/migrations/20251210004803_unified_ap_payment_model.sql`
- **Hooks:** `src/hooks/useCosts.ts`
- **Components:**
  - `src/components/financials/AddCostDialog.tsx`
  - `src/components/financials/CostsTab.tsx`
  - `src/components/financials/SubPaymentsTab.tsx`
  - `src/pages/financials/CostsAPTab.tsx`
- **Project Views:**
  - `src/hooks/useUnifiedProjectBudget.ts`
  - `src/components/project/financials/CostCodeLedgerTab.tsx`

---

**Last Updated:** 2025-12-10
**Migration Required:** Yes - Run `20251210004803_unified_ap_payment_model.sql` in Supabase
