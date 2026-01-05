-- ============================================================================
-- Prereq: Drop objects that depend on things being dropped in remote_schema
-- ============================================================================
-- Problem: 20260104225405_remote_schema.sql has dependency ordering issues:
--
-- View dependencies:
-- - get_project_budget_ledger(uuid) depends on project_budget_ledger_view
-- - get_project_budget_overview(uuid) depends on project_budget_vs_actual_view
--
-- Solution: Drop these dependent functions first so views can be dropped.
-- Functions will be recreated by the remote_schema migration.
-- 
-- Note: project_subcontracts column dependencies are handled in remote_schema
-- with idempotent DO blocks.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_project_budget_ledger(uuid);
DROP FUNCTION IF EXISTS public.get_project_budget_overview(uuid);
