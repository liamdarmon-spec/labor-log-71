-- Enrichment: add missing columns referenced by downstream migrations
-- Columns-only, idempotent, safe for db:reset

DO $$
BEGIN
  -- public.documents
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS ai_expiration_date date,
      ADD COLUMN IF NOT EXISTS related_cost_id uuid,
      ADD COLUMN IF NOT EXISTS related_invoice_id uuid,
      ADD COLUMN IF NOT EXISTS is_archived boolean,
      ADD COLUMN IF NOT EXISTS version_group_id uuid;
  END IF;

  -- public.subs
  IF to_regclass('public.subs') IS NOT NULL THEN
    ALTER TABLE public.subs
      ADD COLUMN IF NOT EXISTS compliance_license_expiration date,
      ADD COLUMN IF NOT EXISTS total_cost numeric,
      ADD COLUMN IF NOT EXISTS project_id uuid;
  END IF;

  -- public.proposals
  IF to_regclass('public.proposals') IS NOT NULL THEN
    ALTER TABLE public.proposals
      ADD COLUMN IF NOT EXISTS public_token text;
  END IF;

  -- public.material_receipts
  IF to_regclass('public.material_receipts') IS NOT NULL THEN
    ALTER TABLE public.material_receipts
      ADD COLUMN IF NOT EXISTS receipt_date date,
      ADD COLUMN IF NOT EXISTS linked_cost_id uuid;
  END IF;

  -- public.work_schedules
  IF to_regclass('public.work_schedules') IS NOT NULL THEN
    ALTER TABLE public.work_schedules
      ADD COLUMN IF NOT EXISTS status text;
  END IF;

  -- public.labor_pay_runs
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS created_at timestamptz,
      ADD COLUMN IF NOT EXISTS payment_date date,
      ADD COLUMN IF NOT EXISTS payer_company_id uuid,
      ADD COLUMN IF NOT EXISTS company_id uuid;
  END IF;

  -- public.project_budget_lines
  IF to_regclass('public.project_budget_lines') IS NOT NULL THEN
    ALTER TABLE public.project_budget_lines
      ADD COLUMN IF NOT EXISTS group_id uuid,
      ADD COLUMN IF NOT EXISTS sort_order int;
  END IF;

  -- public.measurement_units
  IF to_regclass('public.measurement_units') IS NOT NULL THEN
    ALTER TABLE public.measurement_units
      ADD COLUMN IF NOT EXISTS code text,
      ADD COLUMN IF NOT EXISTS company_id uuid;
  END IF;

  -- public.scope_block_cost_items
  IF to_regclass('public.scope_block_cost_items') IS NOT NULL THEN
    ALTER TABLE public.scope_block_cost_items
      ADD COLUMN IF NOT EXISTS breakdown_notes text;
  END IF;

  -- public.checklist_template_items
  IF to_regclass('public.checklist_template_items') IS NOT NULL THEN
    ALTER TABLE public.checklist_template_items
      ADD COLUMN IF NOT EXISTS checklist_template_id uuid;
  END IF;

  -- public.project_budget_groups
  IF to_regclass('public.project_budget_groups') IS NOT NULL THEN
    ALTER TABLE public.project_budget_groups
      ADD COLUMN IF NOT EXISTS project_id uuid;
  END IF;

  -- public.proposal_settings
  IF to_regclass('public.proposal_settings') IS NOT NULL THEN
    ALTER TABLE public.proposal_settings
      ADD COLUMN IF NOT EXISTS proposal_id uuid;
  END IF;

  -- public.proposal_templates
  IF to_regclass('public.proposal_templates') IS NOT NULL THEN
    ALTER TABLE public.proposal_templates
      ADD COLUMN IF NOT EXISTS name text;
  END IF;
END
$$;

