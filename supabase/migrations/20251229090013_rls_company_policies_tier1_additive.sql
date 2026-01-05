-- Company-scoped RLS policies for Tier-1 tables
-- NOTE: This ADDS company_* policies. It does NOT remove existing permissive policies.
-- To actually lock things down, you will later delete/replace the old "Anyone can *" policies.

DO $$
DECLARE
  t text;
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
    IF to_regclass('public.' || t) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t
          AND column_name = 'company_id'
      )
    THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- SELECT (member)
      EXECUTE format('DROP POLICY IF EXISTS company_select ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY company_select ON public.%I FOR SELECT TO authenticated USING (public.is_company_member(company_id))',
        t
      );

      -- INSERT (member)
      EXECUTE format('DROP POLICY IF EXISTS company_insert ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY company_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id))',
        t
      );

      -- UPDATE (manager+)
      EXECUTE format('DROP POLICY IF EXISTS company_update ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY company_update ON public.%I FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ''manager''::public.company_role)) WITH CHECK (public.has_company_role(company_id, ''manager''::public.company_role))',
        t
      );

      -- DELETE (admin+)
      EXECUTE format('DROP POLICY IF EXISTS company_delete ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY company_delete ON public.%I FOR DELETE TO authenticated USING (public.has_company_role(company_id, ''admin''::public.company_role))',
        t
      );
    END IF;
  END LOOP;
END
$$;