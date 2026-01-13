## Billing derivation map (every number → SQL source)

### Billing KPIs (Project Billing page)

- **Contract Value**
  - **Source**: `public.get_project_billing_summary(p_project_id)` → `current_contract_total`
  - **SQL**: `current_contract_total = base_contract_total + approved_change_order_total`
  - **Inputs**:
    - `contract_baselines.base_contract_total`
    - approved CO totals from `change_orders` (+ legacy accepted child proposals)
  - **Function**: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

- **Billed to Date (Contract)**
  - **Source**: `public.get_project_billing_summary(p_project_id)` → `billed_to_date`
  - **Included**: invoices where `status NOT IN ('void','draft')` AND NOT manual/deposit
  - **Excluded**: standalone/manual invoices + deposits (do not reduce contract remaining)
  - **Function**: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

- **Open A/R**
  - **Source**: `public.get_project_billing_summary(p_project_id)` → `open_ar`
  - **SQL**: `open_ar = v_all_billed - v_paid`
  - **Included**: all invoices where `status NOT IN ('void','draft')` (includes standalone/manual)
  - **Inputs**: `invoices.total_amount`, `customer_payments.amount`
  - **Function**: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

- **Remaining to Bill (Contract)**
  - **Source**: `public.get_project_billing_summary(p_project_id)` → `remaining_to_bill`
  - **SQL**: `remaining_to_bill = current_contract_total - v_contract_billed`
  - **Excluded**: standalone/manual invoices
  - **Function**: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

- **Retention Held**
  - **Source**: `public.get_project_billing_summary(p_project_id)` → `retention_held`
  - **Included**: retention on non-draft/non-void, non-manual invoices
  - **Inputs**: `invoices.retention_amount`
  - **Function**: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

### Billing Basis display
- **Baseline present**: `billing_basis` from `contract_baselines.billing_basis` (locked)
- **Baseline missing**: derived from the most recent accepted proposal (`proposals.contract_type` / `proposals.billing_basis`)
  - **FE**: `src/components/project/ProjectBillingTab.tsx` (`derivedBilling`)


