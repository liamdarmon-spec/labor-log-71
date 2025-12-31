-- Enrichment: add missing columns referenced by downstream migrations (from MIGRATION_BLOCKER_AUDIT.md)
-- Columns-only, idempotent, safe for db:reset

-- public.subs
DO $$
BEGIN
  IF to_regclass('public.subs') IS NOT NULL THEN
    ALTER TABLE public.subs ADD COLUMN IF NOT EXISTS compliance_license_expiration date;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.subs') IS NOT NULL THEN
    ALTER TABLE public.subs ADD COLUMN IF NOT EXISTS total_cost numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.subs') IS NOT NULL THEN
    ALTER TABLE public.subs ADD COLUMN IF NOT EXISTS project_id uuid;
  END IF;
END $$;

-- public.proposals
DO $$
BEGIN
  IF to_regclass('public.proposals') IS NOT NULL THEN
    ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS public_token text;
  END IF;
END $$;

-- public.material_receipts
DO $$
BEGIN
  IF to_regclass('public.material_receipts') IS NOT NULL THEN
    ALTER TABLE public.material_receipts ADD COLUMN IF NOT EXISTS receipt_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.material_receipts') IS NOT NULL THEN
    ALTER TABLE public.material_receipts ADD COLUMN IF NOT EXISTS linked_cost_id uuid;
  END IF;
END $$;

-- public.work_schedules
DO $$
BEGIN
  IF to_regclass('public.work_schedules') IS NOT NULL THEN
    ALTER TABLE public.work_schedules ADD COLUMN IF NOT EXISTS status text;
  END IF;
END $$;

-- public.labor_pay_runs
DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS created_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS payment_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS payer_company_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS company_id uuid;
  END IF;
END $$;

-- public.project_budget_lines
DO $$
BEGIN
  IF to_regclass('public.project_budget_lines') IS NOT NULL THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS group_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.project_budget_lines') IS NOT NULL THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS sort_order int;
  END IF;
END $$;

-- public.measurement_units
DO $$
BEGIN
  IF to_regclass('public.measurement_units') IS NOT NULL THEN
    ALTER TABLE public.measurement_units ADD COLUMN IF NOT EXISTS code text;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.measurement_units') IS NOT NULL THEN
    ALTER TABLE public.measurement_units ADD COLUMN IF NOT EXISTS company_id uuid;
  END IF;
END $$;

-- public.scope_block_cost_items
DO $$
BEGIN
  IF to_regclass('public.scope_block_cost_items') IS NOT NULL THEN
    ALTER TABLE public.scope_block_cost_items ADD COLUMN IF NOT EXISTS breakdown_notes text;
  END IF;
END $$;

-- public.checklist_template_items
DO $$
BEGIN
  IF to_regclass('public.checklist_template_items') IS NOT NULL THEN
    ALTER TABLE public.checklist_template_items ADD COLUMN IF NOT EXISTS checklist_template_id uuid;
  END IF;
END $$;

-- public.documents
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS related_cost_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS related_invoice_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_archived boolean;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version_group_id uuid;
  END IF;
END $$;

-- public.project_budget_groups
DO $$
BEGIN
  IF to_regclass('public.project_budget_groups') IS NOT NULL THEN
    ALTER TABLE public.project_budget_groups ADD COLUMN IF NOT EXISTS project_id uuid;
  END IF;
END $$;

-- public.proposal_settings
DO $$
BEGIN
  IF to_regclass('public.proposal_settings') IS NOT NULL THEN
    ALTER TABLE public.proposal_settings ADD COLUMN IF NOT EXISTS proposal_id uuid;
  END IF;
END $$;

-- public.proposal_templates
DO $$
BEGIN
  IF to_regclass('public.proposal_templates') IS NOT NULL THEN
    ALTER TABLE public.proposal_templates ADD COLUMN IF NOT EXISTS name text;
  END IF;
END $$;


