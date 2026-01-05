-- ============================================================================
-- Drop duplicate indexes
-- ============================================================================
-- Problem: Several tables have two indexes on the same column(s).
-- Solution: Drop the shorter-named one, keep the _company_id suffix version.
--
-- Identified duplicates:
-- - customer_payments: idx_customer_payments_company vs idx_customer_payments_company_id
-- - documents: idx_documents_company vs idx_documents_company_id
-- - estimate_items: idx_estimate_items_company vs idx_estimate_items_company_id
-- - estimates: idx_estimates_company vs idx_estimates_company_id
-- - invoice_items: idx_invoice_items_company vs idx_invoice_items_company_id
-- - invoices: idx_invoices_company vs idx_invoices_company_id
--
-- All of these are simple btree indexes on company_id. We keep idx_*_company_id.
-- ============================================================================

-- customer_payments
DROP INDEX IF EXISTS public.idx_customer_payments_company;

-- documents
DROP INDEX IF EXISTS public.idx_documents_company;

-- estimate_items
DROP INDEX IF EXISTS public.idx_estimate_items_company;

-- estimates
DROP INDEX IF EXISTS public.idx_estimates_company;

-- invoice_items
DROP INDEX IF EXISTS public.idx_invoice_items_company;

-- invoices
DROP INDEX IF EXISTS public.idx_invoices_company;

-- ============================================================================
-- Verify: the following indexes REMAIN (not duplicates, just similar names):
-- - costs: idx_costs_company_id (single index, no duplicate)
-- - proposals: idx_proposals_public_token vs proposals_public_token_unique
--   ^ The second is a UNIQUE constraint index, not a duplicate
-- ============================================================================


