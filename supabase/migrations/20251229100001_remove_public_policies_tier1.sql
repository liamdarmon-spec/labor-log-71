-- Remove permissive {public} policies for Tier-1 tables.

-- Keep company-scoped authenticated policies (company_select/company_insert/company_update/company_delete).
-- This is SAFE + idempotent: drops only policies that start with "Anyone can ".
DO $$
DECLARE
  t text;
  pol record;
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
      -- Drop any policy literally named like "Anyone can ..."
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t
          AND policyname LIKE 'Anyone can %'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END
$$;

-- NOTE:
-- We are intentionally NOT touching measurement_units or other "lookup" tables here.
-- If you want those locked too, do it in a separate migration.

