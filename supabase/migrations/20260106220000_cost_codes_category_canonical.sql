-- ============================================================================
-- db: canonicalize cost code categories (DEPRECATED)
-- ============================================================================
-- This migration has been superseded by:
--   20260105901000_cost_codes_category_canonical.sql
-- which:
-- - creates enum public.cost_code_category ('labor','material','sub')
-- - converts public.cost_codes.category to the enum with strict mapping
--
-- This file remains as a NO-OP to preserve migration history and keep resets
-- deterministic without re-applying legacy category updates.
-- ============================================================================

SELECT 1;


