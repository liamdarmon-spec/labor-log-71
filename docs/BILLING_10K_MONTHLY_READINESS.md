## Billing / Financials readiness pass (10k invoices/month)

### Canonical derivation (Proposal → Billing)
- **Accepted proposal** → `contract_baselines` (frozen contract, `billing_basis` locked)
- **Contract totals** → `get_project_billing_summary(p_project_id)` (DB-authoritative rollups)
- **Contract lines** → `get_contract_billing_lines(p_project_id)` (milestones/SOV progress)
- **Change orders** → `change_orders` (approved impacts `current_contract_total` via summary function)
- **Invoices**:
  - Contract-basis invoices affect `billed_to_date` / `remaining_to_bill`
  - Standalone/manual invoices affect AR (`open_ar`) but must NOT reduce contract remaining
- **Payments** → `customer_payments` (affects `paid_to_date`, `open_ar`)

### Load test checklist (10k/month)
- **Invoices list**
  - Pagination enabled (no full-table scans in UI).
  - Filters (company/status/date) are applied server-side.
- **Project Billing summary**
  - Repeated navigation does not trigger refetch storms (React Query caching).
  - Summary query uses indexes (`invoices(project_id, created_at)`, `invoices(company_id, status)` etc).
- **Idempotency / duplication**
  - Double-click create invoice does not create duplicates (UI disables while pending; DB constraints must still guard).
- **Tenant isolation**
  - Billing summary + change orders + invoices + payments are company-scoped via RLS and/or `authed_company_ids()`.


