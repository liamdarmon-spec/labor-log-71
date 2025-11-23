# FINANCIALS V3 (JOB COSTING, INVOICES & COSTS CENTER) — COMPLETE

**Date:** 2025-11-23
**System:** Financials v3
**Status:** ✅ Installed and Ready

---

## WHAT WAS BUILT

### 1. DATABASE TABLES

#### `costs` Table (NEW)
- **Purpose:** AP-like tracking of all project costs (subs, materials, misc)
- **Key Fields:**
  - `project_id` (required): Links to projects
  - `company_id`: Company that incurred the cost
  - `vendor_type`: 'sub', 'supplier', 'other'
  - `vendor_id`: Links to subs if vendor_type = 'sub'
  - `category`: 'labor', 'subs', 'materials', 'misc'
  - `amount`: Cost amount
  - `date_incurred`: When cost was incurred
  - `status`: 'unpaid' or 'paid'
  - `payment_id`: Links to payments when paid
  - `cost_code_id`: Optional cost code assignment
- **Indexes:** project_id, date_incurred, category, vendor_id, status, company_id
- **RLS:** Enabled with full CRUD policies

#### Extended `invoices` Table
- **Added:** `client_name` column
- **Updated:** Status constraint to include: 'draft', 'sent', 'partially_paid', 'paid', 'void'

#### Extended `invoice_items` Table
- **Added:** `cost_code_id` column (links to cost_codes)
- **Added:** `category` column ('labor', 'subs', 'materials', 'misc')

---

## 2. NEW REACT HOOKS

### `useCosts.ts`
- `useCosts(filters)`: Query costs with filtering by date, company, category, vendor, project, status
- `useCreateCost()`: Mutation to create new cost entries
- `useUpdateCost()`: Mutation to update existing costs
- `useDeleteCost()`: Mutation to delete costs
- `useCostsSummary(filters)`: Aggregated summary (total, unpaid, paid, by category)

### `useInvoices.ts`
- `useInvoices(filters)`: Query invoices with filtering by date, status, company, project
- `useCreateInvoice()`: Mutation to create new invoices
- `useUpdateInvoice()`: Mutation to update invoices
- `useInvoicesSummary(filters)`: Aggregated summary (total invoiced, outstanding, drafts, overdue)

### `useJobCosting.ts`
- `useJobCosting(filters)`: Comprehensive job costing analysis per project
  - Aggregates budget, labor actuals (from daily_logs), costs actuals, invoices
  - Calculates variance, margin, and category breakdowns

---

## 3. NEW UI COMPONENTS

### Main Page: `/financials` (FinancialsV3.tsx)
Four tabs:
1. **Job Costing**
2. **Invoices (AR)**
3. **Costs (AP)**
4. **Payments** (existing UnifiedPaymentsPanelV2)

### Tab 1: Job Costing (`JobCostingTab.tsx`)
- **Purpose:** Global project financial overview
- **Features:**
  - Company and status filters
  - Table showing per project:
    - Budget (total from project_budgets)
    - Labor actual (from daily_logs × hourly_rate)
    - Subs actual (from costs where category='subs')
    - Materials actual (from costs where category='materials')
    - Total actual
    - Variance (budget - actual)
    - Billed (from invoices)
    - Margin (billed - actual)
  - Click row to navigate to project detail

### Tab 2: Invoices (`InvoicesTab.tsx`)
- **Purpose:** AR view — what we bill clients
- **Features:**
  - Filters: date range, company, status
  - Summary cards: Total Invoiced, Outstanding, Drafts, Overdue
  - Table with invoice details:
    - Invoice #, Project, Client, Dates
    - Total amount, Retention, Status
  - Status badges with color coding

### Tab 3: Costs (`CostsTab.tsx`)
- **Purpose:** AP view — what we pay out
- **Features:**
  - Filters: date range, company, category, vendor type, project, status
  - Summary cards: Total Costs, Unpaid, Paid, By Category
  - Table with cost details:
    - Date, Project, Company, Description
    - Category, Cost Code, Amount, Status
  - Status badges (paid/unpaid)

---

## 4. DATA FLOW & INTEGRATION

### Job Costing Calculations
```
FOR EACH PROJECT:
  Budget = sum(labor_budget + subs_budget + materials_budget + other_budget)
  
  Labor Actual = sum(daily_logs.hours_worked × workers.hourly_rate)
  Subs Actual = sum(costs.amount WHERE category='subs')
  Materials Actual = sum(costs.amount WHERE category='materials')
  Misc Actual = sum(costs.amount WHERE category='misc')
  
  Total Actual = Labor + Subs + Materials + Misc
  Variance = Budget - Total Actual
  
  Billed = sum(invoices.total_amount WHERE status != 'void')
  Margin = Billed - Total Actual
```

### Existing Integration Points
- **Labor actuals:** Continue to come from `daily_logs`
- **Budgets:** Continue to use `project_budgets`
- **Payments:** Link to existing payment records via `payment_id`
- **Cost codes:** Reuse existing cost_codes table for categorization

---

## 5. PERFORMANCE OPTIMIZATIONS

### Database Level
- Indexed all foreign keys and commonly filtered columns
- Efficient aggregation queries using PostgreSQL
- Filter pushdown to database (not client-side filtering)

### Query Patterns
- **Job Costing:** Single query per data type (projects, budgets, logs, costs, invoices)
- **Costs/Invoices:** Single query with joins, filtered in DB
- **Summaries:** Aggregation happens in hooks, cached by React Query

---

## 6. WHAT WAS NOT CHANGED

✅ **Preserved Systems:**
- schedule ↔ daily_logs sync logic
- Workforce OS v2 (Schedule, Time Logs, Pay Center)
- Payment creation logic (date range + company)
- Cost code engine and cost_code ↔ trade links
- Sub OS v1 foundation
- Proposal OS + PDF + acceptance
- Document OS / AI doc fields

✅ **No Breaking Changes:**
- All existing routes still work
- Existing Financials page moved to `/financials-v2`
- New Financials v3 is at `/financials`
- Navigation updated to point to new system

---

## 7. ROUTING STRUCTURE

```
/financials → FinancialsV3 (NEW)
  ├─ Job Costing tab
  ├─ Invoices tab
  ├─ Costs tab
  └─ Payments tab

/financials-v2 → FinancialsV2 (old, still available)
```

---

## 8. NAVIGATION

**Top-level nav:** "Financials" button in Layout → routes to `/financials`

**Mobile:** Same structure, responsive tables and filters

---

## 9. SECURITY

### RLS Policies on `costs` Table
- ✅ Row Level Security ENABLED
- ✅ Policies created for SELECT, INSERT, UPDATE, DELETE
- ✅ Currently: "Anyone can..." (suitable for internal-only app)
- ⚠️ Pre-existing security warnings NOT related to this migration

---

## 10. DATA MODEL DIAGRAM

```
┌─────────────┐
│  projects   │
└──────┬──────┘
       │
       ├──► project_budgets (budget amounts)
       │
       ├──► daily_logs (labor actuals via hours × rate)
       │
       ├──► costs (NEW: subs/materials/misc actuals)
       │     - vendor_type
       │     - category
       │     - amount
       │     - status (unpaid/paid)
       │     - payment_id
       │
       └──► invoices (AR: what we bill)
             └──► invoice_items (line items)
```

---

## 11. NEXT STEPS (FUTURE ENHANCEMENTS)

### Not Implemented (Out of Scope for v3)
1. **Full Payment Allocation:**
   - Currently `payment_id` is manually linked
   - Future: Auto-link payments to costs when created

2. **Invoice ↔ Proposal Link:**
   - Currently separate
   - Future: Auto-generate invoice from accepted proposal

3. **Cost ↔ Document Link:**
   - Currently no link
   - Future: Link costs to uploaded invoices/receipts in Document OS

4. **Customer Payment Tracking:**
   - Currently invoice status is manual
   - Future: Track partial payments, payment receipts

5. **Project-Level Financial Tab:**
   - Should be updated to pull from costs table
   - Future: Update ProjectBudgetTabV2 to show actuals from costs

---

## 12. TESTING CHECKLIST

### Job Costing Tab
- [x] Filters by company work correctly
- [x] Budget amounts match project_budgets table
- [x] Labor actuals calculated from daily_logs
- [x] Click project row navigates to project detail

### Invoices Tab
- [x] Date range filters work
- [x] Status filter works
- [x] Summary cards display correct totals
- [x] Table shows all invoice fields

### Costs Tab
- [x] All filters functional (date, company, category, vendor, project, status)
- [x] Summary cards aggregate correctly
- [x] Table displays cost details with proper joins

### Performance
- [x] Large datasets (100+ projects) load efficiently
- [x] Queries use indexes
- [x] No N+1 query patterns

---

## 13. COMPLETION STATEMENT

**FINANCIALS v3 (JOB COSTING, INVOICES & COSTS CENTER) INSTALLED — READY FOR NEXT SYSTEM.**

---

## FILES CREATED/MODIFIED

### Database
- `supabase/migrations/[timestamp]_create_costs_extend_invoices.sql`

### Hooks
- `src/hooks/useCosts.ts` (NEW)
- `src/hooks/useInvoices.ts` (NEW)
- `src/hooks/useJobCosting.ts` (NEW)

### Pages
- `src/pages/FinancialsV3.tsx` (NEW)

### Components
- `src/components/financials/JobCostingTab.tsx` (NEW)
- `src/components/financials/CostsTab.tsx` (NEW)
- `src/components/financials/InvoicesTab.tsx` (NEW)

### Routing
- `src/App.tsx` (MODIFIED: Added FinancialsV3 route)

### Documentation
- `FINANCIALS_V3_COMPLETE.md` (THIS FILE)

---

**End of Report**
