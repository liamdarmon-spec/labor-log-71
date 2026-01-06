-- ============================================================================
-- Company Trades defaults & Cost Code Library (DEPRECATED)
-- ============================================================================
-- This migration introduced a company_trades-based cost code library and helper
-- RPCs, including legacy category values ('materials'/'subs') and legacy unique
-- constraints (e.g., cost_codes_company_code_key).
--
-- The Trades → Cost Codes production fix (canonical) is now implemented via:
-- - 20260105901000_cost_codes_category_canonical.sql (ENUM: labor/material/sub)
-- - 20260105902000_cost_codes_uniqueness.sql (canonical uniqueness)
-- - 20260105903000_rpc_create_trade_with_default_cost_codes.sql (atomic RPC)
-- - 20260105904000_trades_cost_codes_rls_minimal.sql (tenant RLS)
--
-- Kept as a NO-OP to preserve migration history and avoid reintroducing
-- non-canonical constraints/functions.
-- ============================================================================

SELECT 1;


