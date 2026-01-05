-- POSTBASELINE ENFORCEMENT (TEMPORARILY QUARANTINED)
--
-- This migration previously contained a large dump-derived blob that was corrupt
-- (e.g. the token "EBEGIN" causing SQLSTATE 42601) and prevented deterministic
-- `supabase db reset` / `npm run db:reset`.
--
-- Hard rule for stability: migrations must be runnable on a fresh DB.
-- Until we reconcile constraints/indexes against the canonical project
-- (repeqiyrpplpeznlendx.supabase.co) and regenerate a clean, minimal,
-- idempotent enforcement migration, this file is intentionally a no-op.
--
-- NOTE: The original content remains in `supabase/migrations__quarantine_postbaseline/`
-- and must NOT be executed as part of local resets.

SELECT 1;


