-- ============================================================================
-- CANONICAL DATA MODEL LOCKDOWN MIGRATION
-- ============================================================================
-- This migration establishes the 4-pillar canonical architecture:
-- 1) Projects (anchor)
-- 2) Field Operations (work_schedules + time_logs)
-- 3) Money (costs, material_receipts, labor_pay_runs)
-- 4) Documents & AI
--
-- Legacy tables are marked but NOT dropped (historical data preserved)
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE COMMENTS - Mark Canonical vs Legacy
-- ============================================================================

-- CANONICAL TABLES (4 Pillars)

-- Pillar 1: Projects
COMMENT ON TABLE public.projects IS 
'CANONICAL: Primary anchor table. All schedules, costs, budgets, invoices, and documents reference projects.id';

COMMENT ON TABLE public.project_budgets IS 
'CANONICAL: Project-level budget totals (labor_budget, subs_budget, materials_budget, other_budget). Synced via sync_estimate_to_budget()';

COMMENT ON TABLE public.project_budget_lines IS 
'CANONICAL: Per-project, per-cost_code budget details with category breakdown (labor/subs/materials/other)';

-- Pillar 2: Field Operations
COMMENT ON TABLE public.work_schedules IS 
'CANONICAL: Scheduling source of truth. Contains worker_id, project_id, company_id, trade_id, cost_code_id, scheduled_date, scheduled_hours. Auto-syncs to time_logs for past dates.';

COMMENT ON TABLE public.time_logs IS 
'CANONICAL: Labor actuals source of truth. Contains actual hours_worked, labor_cost (generated), payment_status. Links back to work_schedules via source_schedule_id.';

-- Pillar 3: Money
COMMENT ON TABLE public.costs IS 
'CANONICAL: General cost ledger. Tracks all project costs by category (labor/subs/materials/other), vendor, cost_code, payment status.';

COMMENT ON TABLE public.material_receipts IS 
'CANONICAL: Material purchase tracking. Auto-syncs to costs table via sync_material_receipt_to_cost() trigger.';

COMMENT ON TABLE public.material_vendors IS 
'CANONICAL: Material vendor registry with default cost codes and contact info.';

COMMENT ON TABLE public.labor_pay_runs IS 
'CANONICAL: Labor payment batches. When marked paid, triggers mark_time_logs_paid_on_pay_run() to update time_logs.payment_status.';

COMMENT ON TABLE public.labor_pay_run_items IS 
'CANONICAL: Individual time log entries within a pay run. Links time_logs to labor_pay_runs.';

COMMENT ON TABLE public.subs IS 
'CANONICAL: Subcontractor registry with compliance tracking and trade associations.';

COMMENT ON TABLE public.sub_contracts IS 
'CANONICAL: Subcontractor contracts per project with budget amounts and payment terms.';

COMMENT ON TABLE public.sub_invoices IS 
'CANONICAL: Subcontractor invoices linked to contracts. Creates costs entries when approved.';

-- Pillar 4: Documents & AI
COMMENT ON TABLE public.documents IS 
'CANONICAL: Document storage with AI classification. Supports project docs, sub compliance docs (COI, W9, licenses). AI extraction populates compliance fields.';

-- LEGACY TABLES (Read-only for historical data)

COMMENT ON TABLE public.scheduled_shifts IS 
'LEGACY: Historical scheduling data. Replaced by work_schedules. DO NOT use for new features. Data preserved for historical reference only.';

COMMENT ON TABLE public.daily_logs IS 
'LEGACY: Historical time tracking data. Replaced by time_logs. DO NOT use for new features. Data preserved for historical reference only.';

COMMENT ON TABLE public.day_cards IS 
'LEGACY: Historical day-level labor aggregation. Replaced by time_logs aggregation queries. DO NOT use for new features. Data preserved for historical reference only.';

COMMENT ON TABLE public.day_card_jobs IS 
'LEGACY: Historical day card job splits. Replaced by time_logs with cost_code_id. DO NOT use for new features. Data preserved for historical reference only.';

COMMENT ON TABLE public.payments IS 
'LEGACY: Historical payment tracking. Replaced by labor_pay_runs + costs.payment_id flow. DO NOT use for new features. Data preserved for historical reference only.';

-- Supporting canonical tables
COMMENT ON TABLE public.cost_codes IS 
'CANONICAL: Cost code registry. Used across budgets, schedules, time logs, and costs for consistent categorization.';

COMMENT ON TABLE public.trades IS 
'CANONICAL: Trade registry with default cost codes for labor and subs. Auto-assigns cost codes via triggers.';

COMMENT ON TABLE public.workers IS 
'CANONICAL: Worker registry with hourly rates and trade associations. Rates auto-populate into time_logs.';

COMMENT ON TABLE public.companies IS 
'CANONICAL: Company registry. Auto-populated in schedules and time logs from project.company_id.';

COMMENT ON TABLE public.estimates IS 
'CANONICAL: Project estimates. Can be synced to project_budgets via sync_estimate_to_budget().';

COMMENT ON TABLE public.estimate_items IS 
'CANONICAL: Line items for estimates. Synced to project_budget_lines when estimate becomes budget source.';

-- ============================================================================
-- PART 2: TRIGGER SETUP - Wire canonical functions to canonical tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- work_schedules triggers
-- ---------------------------------------------------------------------------

-- BEFORE INSERT/UPDATE: Auto-populate company_id and cost_code_id
DROP TRIGGER IF EXISTS trigger_work_schedule_auto_populate_company ON public.work_schedules;
CREATE TRIGGER trigger_work_schedule_auto_populate_company
  BEFORE INSERT OR UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_company_id();

DROP TRIGGER IF EXISTS trigger_work_schedule_auto_assign_cost_code ON public.work_schedules;
CREATE TRIGGER trigger_work_schedule_auto_assign_cost_code
  BEFORE INSERT OR UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_labor_cost_code();

-- AFTER INSERT/UPDATE: Sync to time_logs for past dates
DROP TRIGGER IF EXISTS trigger_work_schedule_sync_to_timelog ON public.work_schedules;
CREATE TRIGGER trigger_work_schedule_sync_to_timelog
  AFTER INSERT OR UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_work_schedule_to_time_log();

-- ---------------------------------------------------------------------------
-- time_logs triggers
-- ---------------------------------------------------------------------------

-- BEFORE INSERT/UPDATE: Auto-populate company_id, worker rate, cost_code_id
DROP TRIGGER IF EXISTS trigger_timelog_auto_populate_company ON public.time_logs;
CREATE TRIGGER trigger_timelog_auto_populate_company
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_company_id();

DROP TRIGGER IF EXISTS trigger_timelog_auto_populate_rate ON public.time_logs;
CREATE TRIGGER trigger_timelog_auto_populate_rate
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_worker_rate();

DROP TRIGGER IF EXISTS trigger_timelog_auto_assign_cost_code ON public.time_logs;
CREATE TRIGGER trigger_timelog_auto_assign_cost_code
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_labor_cost_code();

-- AFTER INSERT/UPDATE: Sync back to work_schedules
DROP TRIGGER IF EXISTS trigger_timelog_sync_to_schedule ON public.time_logs;
CREATE TRIGGER trigger_timelog_sync_to_schedule
  AFTER INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_time_log_to_work_schedule();

-- ---------------------------------------------------------------------------
-- material_receipts triggers
-- ---------------------------------------------------------------------------

-- AFTER INSERT/UPDATE/DELETE: Sync to costs table
DROP TRIGGER IF EXISTS trigger_material_receipt_sync_to_cost ON public.material_receipts;
CREATE TRIGGER trigger_material_receipt_sync_to_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_material_receipt_to_cost();

-- ---------------------------------------------------------------------------
-- labor_pay_runs triggers
-- ---------------------------------------------------------------------------

-- AFTER UPDATE: Mark time_logs as paid when pay run status changes to 'paid'
DROP TRIGGER IF EXISTS trigger_pay_run_mark_logs_paid ON public.labor_pay_runs;
CREATE TRIGGER trigger_pay_run_mark_logs_paid
  AFTER UPDATE ON public.labor_pay_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_time_logs_paid_on_pay_run();

-- ---------------------------------------------------------------------------
-- documents triggers (already exists, but ensure it's wired)
-- ---------------------------------------------------------------------------

-- AFTER INSERT/UPDATE: Update sub compliance from document AI data
DROP TRIGGER IF EXISTS trigger_document_update_sub_compliance ON public.documents;
CREATE TRIGGER trigger_document_update_sub_compliance
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sub_compliance_from_document();

-- ============================================================================
-- PART 3: VERIFICATION QUERIES (commented out for reference)
-- ============================================================================

-- Verify canonical tables exist and have proper structure:
-- SELECT tablename, obj_description(('public.' || tablename)::regclass) as comment
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('work_schedules', 'time_logs', 'costs', 'project_budgets', 'project_budget_lines', 'documents')
-- ORDER BY tablename;

-- Verify legacy tables are marked:
-- SELECT tablename, obj_description(('public.' || tablename)::regclass) as comment
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('scheduled_shifts', 'daily_logs', 'day_cards', 'day_card_jobs', 'payments')
-- ORDER BY tablename;

-- Verify triggers are attached:
-- SELECT tgname, tgrelid::regclass, proname
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE tgrelid::regclass::text IN ('work_schedules', 'time_logs', 'material_receipts', 'labor_pay_runs', 'documents')
-- ORDER BY tgrelid, tgname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✓ All canonical tables marked with CANONICAL comments
-- ✓ All legacy tables marked with LEGACY comments
-- ✓ work_schedules: 3 triggers (auto company, auto cost code, sync to timelog)
-- ✓ time_logs: 4 triggers (auto company, auto rate, auto cost code, sync to schedule)
-- ✓ material_receipts: 1 trigger (sync to costs)
-- ✓ labor_pay_runs: 1 trigger (mark time_logs paid)
-- ✓ documents: 1 trigger (update sub compliance)
-- ✓ All migrations are idempotent (DROP IF EXISTS, CREATE OR REPLACE)
-- ✓ No destructive operations (no DROP TABLE, no DROP COLUMN)
-- ============================================================================