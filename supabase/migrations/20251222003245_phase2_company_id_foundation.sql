-- =====================================================
-- PHASE 2: company_id Foundation Migration (HARDENED)
-- =====================================================
-- REMOTE-SAFE:
-- - No RLS changes
-- - No policy drops
-- HARDENED:
-- - No foreign keys
-- - No SECURITY DEFINER
-- - INSERT-only triggers (no UPDATE triggers)
-- - WHEN clause to skip if company_id already provided
-- =====================================================

-- =====================================================
-- PART 0: SAFETY SETTINGS
-- =====================================================
-- Keep functions predictable
SET statement_timeout = '10min';
SET lock_timeout = '30s';

-- =====================================================
-- PART 1: ADD company_id COLUMNS (NULLABLE, NO FK)
-- =====================================================

-- Direct project_id relationship
ALTER TABLE archived_daily_logs     ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE bid_packages            ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE budget_revisions        ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE cost_entries            ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE customer_payments       ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE daily_logs              ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE day_card_jobs           ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE documents               ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE estimates               ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE invoices                ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE material_receipts       ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE project_budget_lines    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE project_budgets         ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE project_todos           ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE proposals               ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE scheduled_shifts        ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE schedule_of_values      ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE sub_contracts           ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE sub_invoices            ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE sub_scheduled_shifts    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE time_log_allocations    ADD COLUMN IF NOT EXISTS company_id uuid;

-- Indirect relationships
ALTER TABLE bid_invitations         ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE estimate_items          ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE invoice_items           ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE labor_pay_run_items     ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE proposal_events         ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE proposal_sections       ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE project_budget_groups   ADD COLUMN IF NOT EXISTS company_id uuid;

-- Company-scoped entities (may need manual assignment later)
ALTER TABLE subs                    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE material_vendors        ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE proposal_settings       ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE proposal_templates      ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE invitations             ADD COLUMN IF NOT EXISTS company_id uuid;

-- Scope blocks
ALTER TABLE scope_blocks            ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE scope_block_cost_items  ADD COLUMN IF NOT EXISTS company_id uuid;

-- =====================================================
-- PART 2: BACKFILL company_id FROM RELATIONSHIPS
-- =====================================================

-- -----------------------------
-- 2.1 Project-based tables
-- -----------------------------
UPDATE archived_daily_logs t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE bid_packages t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE budget_revisions t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE cost_entries t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE daily_logs t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE documents t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE estimates t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE invoices t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE material_receipts t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE project_budgets t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE project_todos t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE proposals t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE scheduled_shifts t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE schedule_of_values t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE sub_contracts t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE sub_invoices t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE sub_scheduled_shifts t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

UPDATE time_log_allocations t
SET company_id = p.company_id
FROM projects p
WHERE t.project_id = p.id AND t.company_id IS NULL AND p.company_id IS NOT NULL;

-- -----------------------------
-- 2.2 Indirect tables
-- -----------------------------

-- bid_invitations -> bid_packages -> projects
UPDATE bid_invitations bi
SET company_id = p.company_id
FROM bid_packages bp
JOIN projects p ON bp.project_id = p.id
WHERE bi.bid_package_id = bp.id
  AND bi.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- estimate_items -> estimates -> projects
UPDATE estimate_items ei
SET company_id = p.company_id
FROM estimates e
JOIN projects p ON e.project_id = p.id
WHERE ei.estimate_id = e.id
  AND ei.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- invoice_items -> invoices -> projects
UPDATE invoice_items ii
SET company_id = p.company_id
FROM invoices i
JOIN projects p ON i.project_id = p.id
WHERE ii.invoice_id = i.id
  AND ii.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- labor_pay_run_items -> time_logs -> projects
UPDATE labor_pay_run_items lpri
SET company_id = p.company_id
FROM time_logs tl
JOIN projects p ON tl.project_id = p.id
WHERE lpri.time_log_id = tl.id
  AND lpri.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- proposal_events -> proposals -> projects
UPDATE proposal_events pe
SET company_id = p.company_id
FROM proposals pr
JOIN projects p ON pr.project_id = p.id
WHERE pe.proposal_id = pr.id
  AND pe.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- proposal_sections -> proposals -> projects
UPDATE proposal_sections ps
SET company_id = p.company_id
FROM proposals pr
JOIN projects p ON pr.project_id = p.id
WHERE ps.proposal_id = pr.id
  AND ps.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- project_budget_groups -> project_budgets -> projects
UPDATE project_budget_groups pbg
SET company_id = p.company_id
FROM project_budgets pb
JOIN projects p ON pb.project_id = p.id
WHERE pbg.project_budget_id = pb.id
  AND pbg.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- -----------------------------
-- 2.3 Special cases
-- -----------------------------

-- scope_blocks: entity_type = estimate
UPDATE scope_blocks sb
SET company_id = p.company_id
FROM estimates e
JOIN projects p ON e.project_id = p.id
WHERE sb.entity_type = 'estimate'
  AND sb.entity_id = e.id
  AND sb.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- scope_blocks: entity_type = proposal
UPDATE scope_blocks sb
SET company_id = p.company_id
FROM proposals pr
JOIN projects p ON pr.project_id = p.id
WHERE sb.entity_type = 'proposal'
  AND sb.entity_id = pr.id
  AND sb.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- scope_block_cost_items -> scope_blocks
UPDATE scope_block_cost_items sbci
SET company_id = sb.company_id
FROM scope_blocks sb
WHERE sbci.scope_block_id = sb.id
  AND sbci.company_id IS NULL
  AND sb.company_id IS NOT NULL;

-- customer_payments: PRIMARY from project_id (invoice_id may be NULL)
UPDATE customer_payments cp
SET company_id = p.company_id
FROM projects p
WHERE cp.project_id = p.id
  AND cp.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- customer_payments fallback: invoice_id -> invoices -> projects
UPDATE customer_payments cp
SET company_id = p.company_id
FROM invoices i
JOIN projects p ON i.project_id = p.id
WHERE cp.invoice_id = i.id
  AND cp.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- day_card_jobs fallback: day_card_id -> day_cards
UPDATE day_card_jobs dcj
SET company_id = dc.company_id
FROM day_cards dc
WHERE dcj.day_card_id = dc.id
  AND dcj.company_id IS NULL
  AND dc.company_id IS NOT NULL;

-- time_log_allocations fallback: day_card_id -> day_cards
UPDATE time_log_allocations tla
SET company_id = dc.company_id
FROM day_cards dc
WHERE tla.day_card_id = dc.id
  AND tla.company_id IS NULL
  AND dc.company_id IS NOT NULL;

-- =====================================================
-- PART 3: INDEXES (REDUCED SET)
-- =====================================================
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_company              ON invoices(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.invoice_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoice_items' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoice_items_company         ON invoice_items(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.estimates') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='estimates' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_estimates_company             ON estimates(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.estimate_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='estimate_items' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_estimate_items_company        ON estimate_items(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_company             ON documents(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.daily_logs') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_logs' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_logs_company            ON daily_logs(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.time_log_allocations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_log_allocations' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_time_log_allocations_company  ON time_log_allocations(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.schedule_of_values') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schedule_of_values' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_schedule_of_values_company    ON schedule_of_values(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.scheduled_shifts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_shifts' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_company      ON scheduled_shifts(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.sub_contracts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sub_contracts' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sub_contracts_company         ON sub_contracts(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.sub_invoices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sub_invoices' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sub_invoices_company          ON sub_invoices(company_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.customer_payments') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_payments' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customer_payments_company     ON customer_payments(company_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_company_project      ON invoices(company_id, project_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.estimates') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='estimates' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='estimates' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_estimates_company_project     ON estimates(company_id, project_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.daily_logs') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_logs' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_logs' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_logs_company_project    ON daily_logs(company_id, project_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.scheduled_shifts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_shifts' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_shifts' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_company_proj ON scheduled_shifts(company_id, project_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.sub_invoices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sub_invoices' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sub_invoices' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sub_invoices_company_project  ON sub_invoices(company_id, project_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='company_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='project_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_company_project     ON documents(company_id, project_id)';
  END IF;
END $$;

-- =====================================================
-- PART 4: AUTO-FILL FUNCTIONS (NO SECURITY DEFINER)
-- =====================================================

-- project_id -> projects.company_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM projects p
    WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- estimate_id -> estimates -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_estimate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.estimate_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM estimates e
    JOIN projects p ON p.id = e.project_id
    WHERE e.id = NEW.estimate_id;
  END IF;
  RETURN NEW;
END;
$$;

-- invoice_id -> invoices -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.invoice_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM invoices i
    JOIN projects p ON p.id = i.project_id
    WHERE i.id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

-- time_log_id -> time_logs -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.time_log_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM time_logs tl
    JOIN projects p ON p.id = tl.project_id
    WHERE tl.id = NEW.time_log_id;
  END IF;
  RETURN NEW;
END;
$$;

-- proposal_id -> proposals -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.proposal_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM proposals pr
    JOIN projects p ON p.id = pr.project_id
    WHERE pr.id = NEW.proposal_id;
  END IF;
  RETURN NEW;
END;
$$;

-- bid_package_id -> bid_packages -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_bid_package()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.bid_package_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM bid_packages bp
    JOIN projects p ON p.id = bp.project_id
    WHERE bp.id = NEW.bid_package_id;
  END IF;
  RETURN NEW;
END;
$$;

-- scope_block_id -> scope_blocks.company_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_scope_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.scope_block_id IS NOT NULL THEN
    SELECT sb.company_id INTO NEW.company_id
    FROM scope_blocks sb
    WHERE sb.id = NEW.scope_block_id;
  END IF;
  RETURN NEW;
END;
$$;

-- project_budget_id -> project_budgets -> projects
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_project_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_budget_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM project_budgets pb
    JOIN projects p ON p.id = pb.project_id
    WHERE pb.id = NEW.project_budget_id;
  END IF;
  RETURN NEW;
END;
$$;

-- day_card_id -> day_cards.company_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_from_day_card()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.day_card_id IS NOT NULL THEN
    SELECT dc.company_id INTO NEW.company_id
    FROM day_cards dc
    WHERE dc.id = NEW.day_card_id;
  END IF;
  RETURN NEW;
END;
$$;

-- customer_payments: project_id first, then invoice_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_for_customer_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM projects p
    WHERE p.id = NEW.project_id;

    IF NEW.company_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM invoices i
    JOIN projects p ON p.id = i.project_id
    WHERE i.id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

-- project_budget_lines: project_budget_id first, else project_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_for_project_budget_lines()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.project_budget_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM project_budgets pb
    JOIN projects p ON p.id = pb.project_id
    WHERE pb.id = NEW.project_budget_id;

    IF NEW.company_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM projects p
    WHERE p.id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

-- day_card_jobs: day_card_id first, else project_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_for_day_card_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.day_card_id IS NOT NULL THEN
    SELECT dc.company_id INTO NEW.company_id
    FROM day_cards dc
    WHERE dc.id = NEW.day_card_id;

    IF NEW.company_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM projects p
    WHERE p.id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

-- time_log_allocations: day_card_id first, else project_id
CREATE OR REPLACE FUNCTION auto_fill_company_id_for_time_log_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.day_card_id IS NOT NULL THEN
    SELECT dc.company_id INTO NEW.company_id
    FROM day_cards dc
    WHERE dc.id = NEW.day_card_id;

    IF NEW.company_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM projects p
    WHERE p.id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 5: APPLY TRIGGERS (INSERT-ONLY + WHEN)
-- =====================================================

-- Drop old triggers to avoid duplicates
DROP TRIGGER IF EXISTS auto_fill_company_archived_daily_logs      ON archived_daily_logs;
DROP TRIGGER IF EXISTS auto_fill_company_bid_packages             ON bid_packages;
DROP TRIGGER IF EXISTS auto_fill_company_budget_revisions         ON budget_revisions;
DROP TRIGGER IF EXISTS auto_fill_company_cost_entries             ON cost_entries;
DROP TRIGGER IF EXISTS auto_fill_company_customer_payments        ON customer_payments;
DROP TRIGGER IF EXISTS auto_fill_company_daily_logs               ON daily_logs;
DROP TRIGGER IF EXISTS auto_fill_company_day_card_jobs            ON day_card_jobs;
DROP TRIGGER IF EXISTS auto_fill_company_documents                ON documents;
DROP TRIGGER IF EXISTS auto_fill_company_estimates                ON estimates;
DROP TRIGGER IF EXISTS auto_fill_company_invoices                 ON invoices;
DROP TRIGGER IF EXISTS auto_fill_company_material_receipts        ON material_receipts;
DROP TRIGGER IF EXISTS auto_fill_company_project_budget_lines     ON project_budget_lines;
DROP TRIGGER IF EXISTS auto_fill_company_project_budgets          ON project_budgets;
DROP TRIGGER IF EXISTS auto_fill_company_project_todos            ON project_todos;
DROP TRIGGER IF EXISTS auto_fill_company_proposals                ON proposals;
DROP TRIGGER IF EXISTS auto_fill_company_scheduled_shifts         ON scheduled_shifts;
DROP TRIGGER IF EXISTS auto_fill_company_schedule_of_values       ON schedule_of_values;
DROP TRIGGER IF EXISTS auto_fill_company_sub_contracts            ON sub_contracts;
DROP TRIGGER IF EXISTS auto_fill_company_sub_invoices             ON sub_invoices;
DROP TRIGGER IF EXISTS auto_fill_company_sub_scheduled_shifts     ON sub_scheduled_shifts;
DROP TRIGGER IF EXISTS auto_fill_company_time_log_allocations     ON time_log_allocations;

DROP TRIGGER IF EXISTS auto_fill_company_bid_invitations          ON bid_invitations;
DROP TRIGGER IF EXISTS auto_fill_company_estimate_items           ON estimate_items;
DROP TRIGGER IF EXISTS auto_fill_company_invoice_items            ON invoice_items;
DROP TRIGGER IF EXISTS auto_fill_company_labor_pay_run_items      ON labor_pay_run_items;
DROP TRIGGER IF EXISTS auto_fill_company_proposal_events          ON proposal_events;
DROP TRIGGER IF EXISTS auto_fill_company_proposal_sections        ON proposal_sections;
DROP TRIGGER IF EXISTS auto_fill_company_project_budget_groups    ON project_budget_groups;
DROP TRIGGER IF EXISTS auto_fill_company_scope_block_cost_items   ON scope_block_cost_items;

-- Project-based triggers (tables with project_id)
DROP TRIGGER IF EXISTS auto_fill_company_archived_daily_logs ON archived_daily_logs;
CREATE TRIGGER auto_fill_company_archived_daily_logs
  BEFORE INSERT ON archived_daily_logs
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_bid_packages ON bid_packages;
CREATE TRIGGER auto_fill_company_bid_packages
  BEFORE INSERT ON bid_packages
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_budget_revisions ON budget_revisions;
CREATE TRIGGER auto_fill_company_budget_revisions
  BEFORE INSERT ON budget_revisions
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_cost_entries ON cost_entries;
CREATE TRIGGER auto_fill_company_cost_entries
  BEFORE INSERT ON cost_entries
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_daily_logs ON daily_logs;
CREATE TRIGGER auto_fill_company_daily_logs
  BEFORE INSERT ON daily_logs
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_documents ON documents;
CREATE TRIGGER auto_fill_company_documents
  BEFORE INSERT ON documents
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_estimates ON estimates;
CREATE TRIGGER auto_fill_company_estimates
  BEFORE INSERT ON estimates
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_invoices ON invoices;
CREATE TRIGGER auto_fill_company_invoices
  BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_material_receipts ON material_receipts;
CREATE TRIGGER auto_fill_company_material_receipts
  BEFORE INSERT ON material_receipts
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_project_budgets ON project_budgets;
CREATE TRIGGER auto_fill_company_project_budgets
  BEFORE INSERT ON project_budgets
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_project_todos ON project_todos;
CREATE TRIGGER auto_fill_company_project_todos
  BEFORE INSERT ON project_todos
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_proposals ON proposals;
CREATE TRIGGER auto_fill_company_proposals
  BEFORE INSERT ON proposals
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_scheduled_shifts ON scheduled_shifts;
CREATE TRIGGER auto_fill_company_scheduled_shifts
  BEFORE INSERT ON scheduled_shifts
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_schedule_of_values ON schedule_of_values;
CREATE TRIGGER auto_fill_company_schedule_of_values
  BEFORE INSERT ON schedule_of_values
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_sub_contracts ON sub_contracts;
CREATE TRIGGER auto_fill_company_sub_contracts
  BEFORE INSERT ON sub_contracts
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_sub_invoices ON sub_invoices;
CREATE TRIGGER auto_fill_company_sub_invoices
  BEFORE INSERT ON sub_invoices
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

DROP TRIGGER IF EXISTS auto_fill_company_sub_scheduled_shifts ON sub_scheduled_shifts;
CREATE TRIGGER auto_fill_company_sub_scheduled_shifts
  BEFORE INSERT ON sub_scheduled_shifts
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project();

-- Special dual-column tables
DROP TRIGGER IF EXISTS auto_fill_company_customer_payments ON customer_payments;
CREATE TRIGGER auto_fill_company_customer_payments
  BEFORE INSERT ON customer_payments
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_for_customer_payments();

DROP TRIGGER IF EXISTS auto_fill_company_project_budget_lines ON project_budget_lines;
CREATE TRIGGER auto_fill_company_project_budget_lines
  BEFORE INSERT ON project_budget_lines
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_for_project_budget_lines();

DROP TRIGGER IF EXISTS auto_fill_company_day_card_jobs ON day_card_jobs;
CREATE TRIGGER auto_fill_company_day_card_jobs
  BEFORE INSERT ON day_card_jobs
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_for_day_card_jobs();

DROP TRIGGER IF EXISTS auto_fill_company_time_log_allocations ON time_log_allocations;
CREATE TRIGGER auto_fill_company_time_log_allocations
  BEFORE INSERT ON time_log_allocations
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_for_time_log_allocations();

-- Indirect relationship triggers
DROP TRIGGER IF EXISTS auto_fill_company_bid_invitations ON bid_invitations;
CREATE TRIGGER auto_fill_company_bid_invitations
  BEFORE INSERT ON bid_invitations
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_bid_package();

DROP TRIGGER IF EXISTS auto_fill_company_estimate_items ON estimate_items;
CREATE TRIGGER auto_fill_company_estimate_items
  BEFORE INSERT ON estimate_items
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_estimate();

DROP TRIGGER IF EXISTS auto_fill_company_invoice_items ON invoice_items;
CREATE TRIGGER auto_fill_company_invoice_items
  BEFORE INSERT ON invoice_items
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_invoice();

DROP TRIGGER IF EXISTS auto_fill_company_labor_pay_run_items ON labor_pay_run_items;
CREATE TRIGGER auto_fill_company_labor_pay_run_items
  BEFORE INSERT ON labor_pay_run_items
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_time_log();

DROP TRIGGER IF EXISTS auto_fill_company_proposal_events ON proposal_events;
CREATE TRIGGER auto_fill_company_proposal_events
  BEFORE INSERT ON proposal_events
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_proposal();

DROP TRIGGER IF EXISTS auto_fill_company_proposal_sections ON proposal_sections;
CREATE TRIGGER auto_fill_company_proposal_sections
  BEFORE INSERT ON proposal_sections
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_proposal();

DROP TRIGGER IF EXISTS auto_fill_company_project_budget_groups ON project_budget_groups;
CREATE TRIGGER auto_fill_company_project_budget_groups
  BEFORE INSERT ON project_budget_groups
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_project_budget();

DROP TRIGGER IF EXISTS auto_fill_company_scope_block_cost_items ON scope_block_cost_items;
CREATE TRIGGER auto_fill_company_scope_block_cost_items
  BEFORE INSERT ON scope_block_cost_items
  FOR EACH ROW WHEN (NEW.company_id IS NULL)
  EXECUTE FUNCTION auto_fill_company_id_from_scope_block();

-- =====================================================
-- PART 6: COMMENTS (optional but helpful)
-- =====================================================
COMMENT ON COLUMN customer_payments.company_id IS 'Tenant company owning this payment. Derived from project_id first, then invoice_id.';
COMMENT ON COLUMN project_budget_lines.company_id IS 'Tenant company owning this line. Derived from project_budget_id first, else project_id.';
COMMENT ON COLUMN day_card_jobs.company_id IS 'Tenant company owning this record. Derived from day_card_id first, else project_id.';
COMMENT ON COLUMN time_log_allocations.company_id IS 'Tenant company owning this record. Derived from day_card_id first, else project_id.';

-- =====================================================
-- END PHASE 2 MIGRATION
-- =====================================================