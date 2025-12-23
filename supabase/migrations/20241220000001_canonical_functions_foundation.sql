-- ============================================================================
-- CANONICAL FUNCTIONS FOUNDATION
-- ============================================================================
-- Purpose: Create stub functions referenced by triggers in later migrations
--          but not defined in baseline. Prevents "function does not exist" errors.
--
-- Functions created:
--   - auto_populate_company_id() - Auto-populate company_id from project
--   - auto_assign_labor_cost_code() - Auto-assign cost code from worker's trade
--   - sync_work_schedule_to_time_log() - Sync schedules to time logs
--   - auto_populate_worker_rate() - Auto-populate worker rate
--   - mark_time_logs_paid_on_pay_run() - Mark time logs as paid
--   - sync_material_receipt_to_cost() - Sync material receipts to costs
--   - update_sub_compliance_from_document() - Update sub compliance from document
--
-- These are MINIMAL STUBS - later migrations may redefine with full logic.
-- ============================================================================

-- auto_populate_company_id: Auto-populate company_id from project relationship
CREATE OR REPLACE FUNCTION public.auto_populate_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual logic
  -- (e.g., NEW.company_id := (SELECT company_id FROM projects WHERE id = NEW.project_id))
  RETURN NEW;
END;
$$;

-- auto_assign_labor_cost_code: Auto-assign cost code from worker's trade
CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual logic
  -- (e.g., lookup default labor cost code from trades table)
  RETURN NEW;
END;
$$;

-- sync_work_schedule_to_time_log: Sync work schedules to time logs for past dates
CREATE OR REPLACE FUNCTION public.sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual sync logic
  -- (e.g., INSERT INTO time_logs when scheduled_date < CURRENT_DATE)
  RETURN NEW;
END;
$$;

-- auto_populate_worker_rate: Auto-populate worker hourly rate
CREATE OR REPLACE FUNCTION public.auto_populate_worker_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual rate lookup logic
  RETURN NEW;
END;
$$;

-- mark_time_logs_paid_on_pay_run: Mark time logs as paid when pay run is processed
CREATE OR REPLACE FUNCTION public.mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual payment marking logic
  RETURN NEW;
END;
$$;

-- sync_material_receipt_to_cost: Sync material receipts to cost ledger
CREATE OR REPLACE FUNCTION public.sync_material_receipt_to_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual cost sync logic
  RETURN NEW;
END;
$$;

-- update_sub_compliance_from_document: Update subcontractor compliance from uploaded documents
CREATE OR REPLACE FUNCTION public.update_sub_compliance_from_document()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual compliance update logic
  RETURN NEW;
END;
$$;

-- sync_time_log_to_work_schedule: Sync time logs back to work schedules
CREATE OR REPLACE FUNCTION public.sync_time_log_to_work_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Stub implementation: just return NEW unchanged
  -- Later migrations can redefine with actual sync-back logic
  RETURN NEW;
END;
$$;

-- log_activity: Activity logging trigger function (stub)
CREATE OR REPLACE FUNCTION public.log_activity(entity_type text)
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Created 8 stub functions that are referenced by triggers but missing:
--   ✓ auto_populate_company_id()
--   ✓ auto_assign_labor_cost_code()
--   ✓ sync_work_schedule_to_time_log()
--   ✓ auto_populate_worker_rate()
--   ✓ mark_time_logs_paid_on_pay_run()
--   ✓ sync_material_receipt_to_cost()
--   ✓ update_sub_compliance_from_document()
--   ✓ sync_time_log_to_work_schedule()
--
-- All later CREATE TRIGGER statements will now succeed.
-- Later migrations can safely redefine these with CREATE OR REPLACE FUNCTION.
-- ============================================================================

