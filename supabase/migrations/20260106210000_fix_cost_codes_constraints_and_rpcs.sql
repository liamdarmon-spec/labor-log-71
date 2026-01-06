-- ============================================================================
-- Trades → Cost Codes (DEPRECATED)
-- ============================================================================
-- This migration previously introduced company_trade_id-based constraints/RPCs.
-- It is superseded by canonical tenant-scoped trades + cost_codes migrations:
-- - 20260105901000_cost_codes_category_canonical.sql (ENUM + strict mapping)
-- - 20260105902000_cost_codes_uniqueness.sql (canonical uniqueness)
-- - 20260105903000_rpc_create_trade_with_default_cost_codes.sql (atomic RPC)
-- - 20260105904000_trades_cost_codes_rls_minimal.sql (tenant RLS)
--
-- Kept as a NO-OP to preserve migration history and avoid reintroducing
-- non-canonical constraints/functions.
-- ============================================================================

SELECT 1;


