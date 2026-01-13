## Billing / Financials readiness pass (10k invoices/month)

### Source of truth verification (Proposal → Baseline → Billing)
- **Contract source**: proposals.acceptance_status='accepted' + approved_at + contract_type + billing_readiness='locked' — Verified ✅  
  - DB: `supabase/migrations/20260108130000_billing_gating_hardening_and_proof.sql` (`tg_enforce_proposal_billing_on_approval` sets `approved_at`, `acceptance_status`, `billing_readiness`, `billing_basis`)
- **Baseline canonical when present**: `contract_baselines` (1 per project) with `billing_basis` locked — Verified ✅  
  - DB: `supabase/migrations/20260105130000_contract_baseline_system.sql` (UNIQUE(project_id), billing_basis CHECK)
- **Project Billing totals (single source of truth)**: `public.get_project_billing_summary(p_project_id)` — Verified ✅  
  - DB: `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`
  - FE: `src/hooks/useBillingHub.ts` (`useBillingSummary`)
- **Contract math** — Verified ✅  
  - current_contract_total = base_contract_total + approved_change_order_total (`get_project_billing_summary`)
  - billed_to_date excludes standalone/manual/deposit (`get_project_billing_summary` filters on `invoices.source_type`/`invoice_type`)
  - open_ar includes all non-void, non-draft invoices (`get_project_billing_summary`)
  - remaining_to_bill uses contract-basis billed only (`get_project_billing_summary`)
- **Lines/progress**: `public.get_contract_billing_lines(p_project_id)` + frozen `contract_milestones`/`contract_sov_lines` — Verified ✅  
  - DB: `supabase/migrations/20260105130000_contract_baseline_system.sql`
  - FE: `src/hooks/useBillingHub.ts` (`useBillingLines`)
- **Change Orders** — Verified ✅  
  - Tenant scope via company_id trigger + RLS: `supabase/migrations/20260105110000_billing_hub_sov_payapps.sql`
  - Summary includes approved CO totals (+ legacy accepted child proposals): `supabase/migrations/20260107204000_fix_get_project_billing_summary_contract_math.sql`

### Load test checklist (10k/month)
- **Invoices list**
  - Pagination enabled (no full-table scans in UI). — Verified ✅ (`src/hooks/useInvoices.ts`, `src/components/financials/InvoicesTab.tsx`)
  - Filters (company/status/date) applied server-side. — Verified ✅ (`src/hooks/useInvoices.ts`)
- **Project Billing summary**
  - Repeated navigation does not trigger refetch storms (React Query caching).
  - Summary query uses indexes (`invoices(project_id, created_at)`, `invoices(company_id, status)` etc).
- **Idempotency / duplication**
  - Double-click create invoice does not create duplicates (UI disables while pending; DB constraints must still guard).
- **Tenant isolation**
  - Billing summary + change orders + invoices + payments are company-scoped via RLS and/or `authed_company_ids()`.


