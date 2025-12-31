-- Add company_id to Tier-1 tables (additive, idempotent; no backfill; no NOT NULL)

DO $$
DECLARE
  t text;
  idx text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects',
    'cost_codes',
    'costs',
    'invoices',
    'invoice_items',
    'customer_payments',
    'documents',
    'document_tags',
    'material_receipts',
    'material_vendors',
    'estimates',
    'estimate_items',
    'time_logs',
    'work_schedules',
    'workers',
    'day_cards',
    'day_card_jobs',
    'labor_pay_runs',
    'labor_pay_run_items',
    'proposal_templates',
    'proposal_images',
    'proposals',
    'proposal_events',
    'budget_revisions',
    'project_budget_lines',
    'project_budget_groups',
    'scope_blocks',
    'scope_block_cost_items',
    'activity_log',
    'entity_change_log'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid', t);

      idx := 'idx_' || t || '_company_id';
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)', idx, t);
    END IF;
  END LOOP;
END
$$;
