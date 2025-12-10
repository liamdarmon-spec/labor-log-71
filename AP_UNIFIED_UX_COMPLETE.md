# AP Unified UX Implementation Complete

## Overview

All non-labor costs (subs, materials, equipment, other) now use a unified payment flow through `vendor_payments` + `vendor_payment_items`. Status on costs is **always derived from payments** via database trigger, never manually toggled.

## Changes Made

### 1. New Components

#### `src/components/financials/PaymentDrawer.tsx` (NEW)
- Unified payment creation component for both single and batch modes
- **Single mode**: Pay one cost
- **Batch mode**: Pay multiple costs (one payment, multiple payment_items)
- Always creates `vendor_payments` + `vendor_payment_items` records
- Never directly updates `costs.status` - relies on database trigger
- Features:
  - Payment date, vendor type, vendor selector (subs dropdown)
  - Payment method (ACH, check, card, cash, other)
  - Reference/check number, memo
  - Batch mode: editable `applied_amount` per cost
  - Single mode: payment amount input
  - Validates applied amounts match total payment

#### `src/components/financials/VendorPaymentsTab.tsx` (NEW)
- Lists all `vendor_payments` with links to costs via `vendor_payment_items`
- Shows payment history for all non-labor costs
- Displays: date, vendor, method, reference, amount, cost count, status

### 2. Updated Components

#### `src/components/financials/CostsTab.tsx`
- **Added**: "Apply Payment" button in Actions column for each unpaid cost
- **Added**: Paid and Unpaid columns showing `paid_amount` and `amount - paid_amount`
- **Updated**: Status badge handles 'partially_paid', 'void', 'disputed'
- **Behavior**: Clicking "Pay" opens PaymentDrawer in single mode
- **Note**: Status is always derived from payments, never manually set

#### `src/components/financials/SubPaymentsTab.tsx`
- **Removed**: Direct `costs.status` update mutation (`markCostsPaidMutation`)
- **Added**: PaymentDrawer integration for batch payment processing
- **Updated**: Query now includes `status IN ('unpaid', 'partially_paid')` instead of just 'unpaid'
- **Fixed**: Summary calculations use `paid_amount`:
  - Total Unpaid = SUM(amount - paid_amount)
  - Retention Held = SUM(retention_amount)
  - Unpaid Count = COUNT where status IN ('unpaid', 'partially_paid')
- **Added**: Paid, Unpaid, Retention columns in table
- **Changed**: "Mark as Paid" button → "Create Payment" button (opens PaymentDrawer)

#### `src/pages/financials/PaymentsCenterTab.tsx`
- **Updated**: Vendor Payments tab now shows `VendorPaymentsTab` component
- **Removed**: Placeholder "coming soon" message

#### `src/components/financials/AddCostDialog.tsx`
- **Note**: Still sets `status='paid'` when "Paid Immediately" is checked
- **Justification**: OK because it immediately creates `vendor_payment` + `vendor_payment_items`
- **Behavior**: Trigger will also update status, but setting it here provides immediate UI feedback

### 3. Updated Hooks

#### `src/hooks/useCosts.ts`
- **Updated**: `Cost` interface includes `paid_amount`, `retention_amount`, expanded `status`
- **Updated**: `useCostsSummary` calculates unpaid/paid based on `paid_amount`:
  - `unpaidCosts = SUM(amount - paid_amount)`
  - `paidCosts = SUM(paid_amount)`
- **Updated**: Summary query selects `paid_amount` column

## Data Flow

### Payment Creation Flow

1. **User clicks "Apply Payment" or "Create Payment"**
   - Opens `PaymentDrawer` (single or batch mode)

2. **User fills payment details**
   - Payment date, vendor, method, reference, memo
   - In batch mode: sets `applied_amount` for each selected cost

3. **On submit:**
   - Creates `vendor_payments` record
   - Creates `vendor_payment_items` records (one per cost)
   - **Does NOT** manually update `costs.status` or `costs.paid_amount`

4. **Database trigger (`update_cost_paid_amount`)**
   - Fires on `vendor_payment_items` INSERT/UPDATE/DELETE
   - Calculates `SUM(applied_amount)` for each cost
   - Updates `cost.paid_amount`
   - Derives `cost.status`:
     - `paid_amount = 0` → `'unpaid'`
     - `0 < paid_amount < amount` → `'partially_paid'`
     - `paid_amount >= amount` → `'paid'`
   - Sets `cost.paid_date` if fully paid

5. **UI updates**
   - React Query invalidates `['costs']`, `['costs-summary']`, `['unpaid-sub-costs']`, `['vendor-payments']`
   - All views refresh automatically

## Status Derivation Rules

**Status is ALWAYS derived from `paid_amount` vs `amount`:**

- `paid_amount = 0` → `status = 'unpaid'`
- `0 < paid_amount < amount` → `status = 'partially_paid'`
- `paid_amount >= amount` → `status = 'paid'`
- Manual status updates to `'void'` or `'disputed'` are OK (admin-only actions)

**Never manually set status to 'paid' or 'unpaid'** - always create payment records.

## UI Consistency

### Costs Tab (Global)
- Shows all costs from `costs` table
- "Apply Payment" button for each unpaid cost
- Paid/Unpaid columns show `paid_amount` and `amount - paid_amount`
- Status badge reflects trigger-calculated status

### Subcontractor Payments Tab
- Shows costs where `category='subs'` and `status IN ('unpaid', 'partially_paid')`
- Batch selection with "Create Payment" button
- Summary cards use `paid_amount` for calculations
- Same data model as Costs tab (filtered view)

### Vendor Payments Tab
- Shows all `vendor_payments` records
- Links to costs via `vendor_payment_items`
- Payment history for all non-labor costs

## Testing Checklist

✅ **Single Payment Flow:**
1. Go to Costs tab
2. Click "Pay" on a material cost
3. Fill payment details, submit
4. Verify:
   - Cost status becomes 'paid'
   - `paid_amount = amount`
   - Payment appears in Vendor Payments tab
   - Unpaid summary decreases

✅ **Batch Payment Flow:**
1. Go to Subcontractor Payments tab
2. Select 2 unpaid subs costs
3. Click "Create Payment"
4. Set partial amounts (e.g., pay half of each)
5. Submit
6. Verify:
   - Both costs become 'partially_paid'
   - `paid_amount` updated correctly
   - Unpaid and paid summaries update
   - Payment appears in Vendor Payments tab

✅ **Data Consistency:**
1. Create costs: one sub, one material, one equipment
2. Pay material cost fully
3. Pay sub cost partially
4. Verify:
   - Project-level Cost Code Ledger matches global Costs tab totals
   - All views show same `paid_amount` values
   - Status badges match calculated status

## Files Changed

### New Files
- `src/components/financials/PaymentDrawer.tsx`
- `src/components/financials/VendorPaymentsTab.tsx`
- `AP_UNIFIED_UX_COMPLETE.md` (this file)

### Modified Files
- `src/components/financials/CostsTab.tsx`
- `src/components/financials/SubPaymentsTab.tsx`
- `src/pages/financials/PaymentsCenterTab.tsx`
- `src/hooks/useCosts.ts`
- `src/components/financials/AddCostDialog.tsx` (comment added)

## Migration Status

✅ **Database migration already applied**: `20251210004803_unified_ap_payment_model.sql`
- Adds `paid_amount` column
- Expands status constraint
- Creates trigger `update_cost_paid_amount()`
- Ensures `vendor_payment_items` table exists

## Remaining Manual Status Updates

Found one remaining manual status update:
- `src/components/project/ProjectSubsTab.tsx` line 209: Updates `sub_invoices.payment_status` (not `costs.status`)

This is OK - it's updating a different table (`sub_invoices`), not the unified `costs` table.

## Next Steps (Optional)

1. **Vendor Selector Enhancement**: Add supplier/other vendor selectors to PaymentDrawer (currently only subs dropdown)
2. **Payment Reconciliation**: Add view to reconcile payments against bank statements
3. **Retention Release**: Add workflow for releasing retention when milestones reached
4. **Payment Approval**: Add approval workflow for large payments

---

**Status**: ✅ Complete
**All non-labor costs now use unified payment flow**
**Status always derived from payments via trigger**
