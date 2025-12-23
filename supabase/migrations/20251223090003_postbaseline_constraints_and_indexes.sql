-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: constraints
-- Count: 174

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'activity_log_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.activity_log

    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'archived_daily_logs_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.archived_daily_logs

    ADD CONSTRAINT archived_daily_logs_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_invitations_bid_package_id_sub_id_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_invitations

    ADD CONSTRAINT bid_invitations_bid_package_id_sub_id_key UNIQUE (bid_package_id, sub_id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_invitations_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_invitations

    ADD CONSTRAINT bid_invitations_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_packages_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_packages

    ADD CONSTRAINT bid_packages_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'companies_name_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.companies

    ADD CONSTRAINT companies_name_key UNIQUE (name);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'companies_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.companies

    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'cost_codes_code_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.cost_codes

    ADD CONSTRAINT cost_codes_code_key UNIQUE (code);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'cost_codes_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.cost_codes

    ADD CONSTRAINT cost_codes_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_card_jobs_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_card_jobs

    ADD CONSTRAINT day_card_jobs_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_cards_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_cards

    ADD CONSTRAINT day_cards_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_cards_worker_id_date_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_cards

    ADD CONSTRAINT day_cards_worker_id_date_key UNIQUE (worker_id, date);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'documents_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.documents

    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimate_items_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimate_items

    ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimates_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimates

    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invitations_email_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invitations

    ADD CONSTRAINT invitations_email_key UNIQUE (email);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invitations_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invitations

    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invoice_items_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invoice_items

    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invoices_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invoices

    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'material_receipts_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.material_receipts

    ADD CONSTRAINT material_receipts_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'payments_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.payments

    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budget_lines_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budget_lines

    ADD CONSTRAINT project_budget_lines_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budgets_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budgets

    ADD CONSTRAINT project_budgets_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budgets_project_id_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budgets

    ADD CONSTRAINT project_budgets_project_id_key UNIQUE (project_id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_subcontracts_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_subcontracts

    ADD CONSTRAINT project_subcontracts_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_subcontracts_project_id_sub_id_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_subcontracts

    ADD CONSTRAINT project_subcontracts_project_id_sub_id_key UNIQUE (project_id, sub_id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_todos_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_todos

    ADD CONSTRAINT project_todos_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'projects_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.projects

    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_groups_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_groups

    ADD CONSTRAINT proposal_line_groups_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_overrides_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_overrides

    ADD CONSTRAINT proposal_line_overrides_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_section_items_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_section_items

    ADD CONSTRAINT proposal_section_items_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_sections_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_sections

    ADD CONSTRAINT proposal_sections_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposals_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposals

    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'schedule_modifications_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.schedule_modifications

    ADD CONSTRAINT schedule_modifications_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_bids_bid_package_id_sub_id_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_bids

    ADD CONSTRAINT sub_bids_bid_package_id_sub_id_key UNIQUE (bid_package_id, sub_id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_bids_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_bids

    ADD CONSTRAINT sub_bids_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_compliance_documents_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_compliance_documents

    ADD CONSTRAINT sub_compliance_documents_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_contracts_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_contracts

    ADD CONSTRAINT sub_contracts_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_invoices_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_invoices

    ADD CONSTRAINT sub_invoices_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_logs_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_logs

    ADD CONSTRAINT sub_logs_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_payments_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_payments

    ADD CONSTRAINT sub_payments_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_scheduled_shifts_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_scheduled_shifts

    ADD CONSTRAINT sub_scheduled_shifts_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'subs_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.subs

    ADD CONSTRAINT subs_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'time_log_allocations_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.time_log_allocations

    ADD CONSTRAINT time_log_allocations_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'trades_name_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.trades

    ADD CONSTRAINT trades_name_key UNIQUE (name);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'trades_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.trades

    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'user_roles_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.user_roles

    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'user_roles_user_id_role_key'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.user_roles

    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'workers_pkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.workers

    ADD CONSTRAINT workers_pkey PRIMARY KEY (id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'activity_log_actor_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.activity_log

    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_invitations_bid_package_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_invitations

    ADD CONSTRAINT bid_invitations_bid_package_id_fkey FOREIGN KEY (bid_package_id) REFERENCES public.bid_packages(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_invitations_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_invitations

    ADD CONSTRAINT bid_invitations_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'bid_packages_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.bid_packages

    ADD CONSTRAINT bid_packages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'cost_codes_default_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.cost_codes

    ADD CONSTRAINT cost_codes_default_trade_id_fkey FOREIGN KEY (default_trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'cost_codes_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.cost_codes

    ADD CONSTRAINT cost_codes_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_created_by_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_payment_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_schedule_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.scheduled_shifts(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'daily_logs_worker_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.daily_logs

    ADD CONSTRAINT daily_logs_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_card_jobs_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_card_jobs

    ADD CONSTRAINT day_card_jobs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_card_jobs_day_card_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_card_jobs

    ADD CONSTRAINT day_card_jobs_day_card_id_fkey FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_card_jobs_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_card_jobs

    ADD CONSTRAINT day_card_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_card_jobs_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_card_jobs

    ADD CONSTRAINT day_card_jobs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_cards_approved_by_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_cards

    ADD CONSTRAINT day_cards_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_cards_company_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_cards

    ADD CONSTRAINT day_cards_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'day_cards_worker_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.day_cards

    ADD CONSTRAINT day_cards_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'documents_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.documents

    ADD CONSTRAINT documents_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'documents_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.documents

    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimate_items_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimate_items

    ADD CONSTRAINT estimate_items_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimate_items_estimate_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimate_items

    ADD CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimate_items_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimate_items

    ADD CONSTRAINT estimate_items_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'estimates_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.estimates

    ADD CONSTRAINT estimates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invitations_invited_by_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invitations

    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invoice_items_invoice_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invoice_items

    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'invoices_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.invoices

    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'material_receipts_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.material_receipts

    ADD CONSTRAINT material_receipts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'material_receipts_linked_document_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.material_receipts

    ADD CONSTRAINT material_receipts_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'material_receipts_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.material_receipts

    ADD CONSTRAINT material_receipts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'payments_company_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.payments

    ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budget_lines_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budget_lines

    ADD CONSTRAINT project_budget_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budget_lines_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budget_lines

    ADD CONSTRAINT project_budget_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budget_lines_source_estimate_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budget_lines

    ADD CONSTRAINT project_budget_lines_source_estimate_id_fkey FOREIGN KEY (source_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budgets_baseline_estimate_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budgets

    ADD CONSTRAINT project_budgets_baseline_estimate_id_fkey FOREIGN KEY (baseline_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_budgets_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_budgets

    ADD CONSTRAINT project_budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_subcontracts_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_subcontracts

    ADD CONSTRAINT project_subcontracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_subcontracts_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_subcontracts

    ADD CONSTRAINT project_subcontracts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_todos_assigned_worker_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_todos

    ADD CONSTRAINT project_todos_assigned_worker_id_fkey FOREIGN KEY (assigned_worker_id) REFERENCES public.workers(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'project_todos_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.project_todos

    ADD CONSTRAINT project_todos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'projects_company_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.projects

    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_groups_estimate_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_groups

    ADD CONSTRAINT proposal_line_groups_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_groups_proposal_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_groups

    ADD CONSTRAINT proposal_line_groups_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_overrides_estimate_line_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_overrides

    ADD CONSTRAINT proposal_line_overrides_estimate_line_id_fkey FOREIGN KEY (estimate_line_id) REFERENCES public.estimate_items(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_line_overrides_proposal_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_line_overrides

    ADD CONSTRAINT proposal_line_overrides_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_section_items_estimate_item_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_section_items

    ADD CONSTRAINT proposal_section_items_estimate_item_id_fkey FOREIGN KEY (estimate_item_id) REFERENCES public.estimate_items(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_section_items_proposal_section_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_section_items

    ADD CONSTRAINT proposal_section_items_proposal_section_id_fkey FOREIGN KEY (proposal_section_id) REFERENCES public.proposal_sections(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposal_sections_proposal_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposal_sections

    ADD CONSTRAINT proposal_sections_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposals_primary_estimate_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposals

    ADD CONSTRAINT proposals_primary_estimate_id_fkey FOREIGN KEY (primary_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'proposals_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.proposals

    ADD CONSTRAINT proposals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_created_by_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'scheduled_shifts_worker_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.scheduled_shifts

    ADD CONSTRAINT scheduled_shifts_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_bids_bid_package_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_bids

    ADD CONSTRAINT sub_bids_bid_package_id_fkey FOREIGN KEY (bid_package_id) REFERENCES public.bid_packages(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_bids_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_bids

    ADD CONSTRAINT sub_bids_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_compliance_documents_document_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_compliance_documents

    ADD CONSTRAINT sub_compliance_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_compliance_documents_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_compliance_documents

    ADD CONSTRAINT sub_compliance_documents_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_contracts_linked_document_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_contracts

    ADD CONSTRAINT sub_contracts_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_contracts_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_contracts

    ADD CONSTRAINT sub_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_contracts_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_contracts

    ADD CONSTRAINT sub_contracts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_invoices_contract_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_invoices

    ADD CONSTRAINT sub_invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.sub_contracts(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_invoices_linked_document_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_invoices

    ADD CONSTRAINT sub_invoices_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_invoices_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_invoices

    ADD CONSTRAINT sub_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_invoices_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_invoices

    ADD CONSTRAINT sub_invoices_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_logs_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_logs

    ADD CONSTRAINT sub_logs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_logs_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_logs

    ADD CONSTRAINT sub_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_logs_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_logs

    ADD CONSTRAINT sub_logs_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_payments_created_by_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_payments

    ADD CONSTRAINT sub_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_payments_payment_batch_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_payments

    ADD CONSTRAINT sub_payments_payment_batch_id_fkey FOREIGN KEY (payment_batch_id) REFERENCES public.payments(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_payments_project_subcontract_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_payments

    ADD CONSTRAINT sub_payments_project_subcontract_id_fkey FOREIGN KEY (project_subcontract_id) REFERENCES public.sub_contracts(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_payments_sub_invoice_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_payments

    ADD CONSTRAINT sub_payments_sub_invoice_id_fkey FOREIGN KEY (sub_invoice_id) REFERENCES public.sub_invoices(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_scheduled_shifts_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_scheduled_shifts

    ADD CONSTRAINT sub_scheduled_shifts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_scheduled_shifts_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_scheduled_shifts

    ADD CONSTRAINT sub_scheduled_shifts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'sub_scheduled_shifts_sub_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.sub_scheduled_shifts

    ADD CONSTRAINT sub_scheduled_shifts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'subs_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.subs

    ADD CONSTRAINT subs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'time_log_allocations_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.time_log_allocations

    ADD CONSTRAINT time_log_allocations_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'time_log_allocations_day_card_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.time_log_allocations

    ADD CONSTRAINT time_log_allocations_day_card_id_fkey FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'time_log_allocations_project_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.time_log_allocations

    ADD CONSTRAINT time_log_allocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'time_log_allocations_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.time_log_allocations

    ADD CONSTRAINT time_log_allocations_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'trades_default_labor_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.trades

    ADD CONSTRAINT trades_default_labor_cost_code_id_fkey FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'trades_default_material_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.trades

    ADD CONSTRAINT trades_default_material_cost_code_id_fkey FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'trades_default_sub_cost_code_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.trades

    ADD CONSTRAINT trades_default_sub_cost_code_id_fkey FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id);

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'user_roles_user_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.user_roles

    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  END IF;

END

$$;

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1

    FROM pg_constraint c

    JOIN pg_class t ON t.oid = c.conrelid

    JOIN pg_namespace n ON n.oid = t.relnamespace

    WHERE c.conname = 'workers_trade_id_fkey'

      AND n.nspname = 'public'

  ) THEN

ALTER TABLE ONLY public.workers

    ADD CONSTRAINT workers_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;

  END IF;

END

$$;

ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.day_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.scheduled_shifts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.daily_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cost_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.trades FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_budget_lines FORCE ROW LEVEL SECURITY;

ALTER TABLE public.estimates FORCE ROW LEVEL SECURITY;

ALTER TABLE public.estimate_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bid_packages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bid_invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_todos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_sections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_section_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_contracts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_bids FORCE ROW LEVEL SECURITY;

ALTER TABLE public.time_log_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.day_card_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.archived_daily_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.schedule_modifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_scheduled_shifts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sub_compliance_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: indexes
-- Count: 98

CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at);

CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);

CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);

CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);

CREATE INDEX IF NOT EXISTS idx_company_invites_token ON public.company_invites(token);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_bid_invitations_package ON public.bid_invitations USING btree (bid_package_id);

CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON public.bid_packages USING btree (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_codes_trade_category_unique ON public.cost_codes USING btree (trade_id, category) WHERE ((is_active = true) AND (trade_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_cost_codes_trade_id ON public.cost_codes USING btree (trade_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code ON public.daily_logs USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code_id ON public.daily_logs USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_created_at ON public.daily_logs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs USING btree (date);

CREATE INDEX IF NOT EXISTS idx_daily_logs_payment_status ON public.daily_logs USING btree (project_id, payment_status) WHERE (payment_status = 'unpaid'::text);

CREATE INDEX IF NOT EXISTS idx_daily_logs_project ON public.daily_logs USING btree (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_schedule_id ON public.daily_logs USING btree (schedule_id) WHERE (schedule_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_daily_logs_trade_id ON public.daily_logs USING btree (trade_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker ON public.daily_logs USING btree (worker_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker_id ON public.daily_logs USING btree (worker_id);

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_day_card ON public.day_card_jobs USING btree (day_card_id);

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_project ON public.day_card_jobs USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_day_cards_date ON public.day_cards USING btree (date);

CREATE INDEX IF NOT EXISTS idx_day_cards_pay_status ON public.day_cards USING btree (pay_status);

CREATE INDEX IF NOT EXISTS idx_day_cards_status ON public.day_cards USING btree (status);

CREATE INDEX IF NOT EXISTS idx_day_cards_worker_date ON public.day_cards USING btree (worker_id, date);

CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON public.documents USING btree (ai_status);

CREATE INDEX IF NOT EXISTS idx_documents_cost_code ON public.documents USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents USING btree (doc_type);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents USING btree (owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents USING btree (document_type);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents USING btree (uploaded_at);

CREATE INDEX IF NOT EXISTS idx_estimate_items_cost_code ON public.estimate_items USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON public.estimate_items USING btree (estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimate_items_trade ON public.estimate_items USING btree (trade_id);

CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates USING btree (status);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations USING btree (email);

CREATE INDEX IF NOT EXISTS idx_invitations_used ON public.invitations USING btree (used);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX IF NOT EXISTS idx_material_receipts_cost_code ON public.material_receipts USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_material_receipts_project ON public.material_receipts USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments USING btree (company_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments USING btree (company_id);

CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_dates ON public.payments USING btree (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_cost_code ON public.project_budget_lines USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project ON public.project_budget_lines USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_project ON public.project_subcontracts USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_sub ON public.project_subcontracts USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_project_todos_assigned_worker_id ON public.project_todos USING btree (assigned_worker_id);

CREATE INDEX IF NOT EXISTS idx_project_todos_due_date ON public.project_todos USING btree (due_date);

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON public.project_todos USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_project_todos_status ON public.project_todos USING btree (status);

CREATE INDEX IF NOT EXISTS idx_project_todos_task_type ON public.project_todos USING btree (task_type);

CREATE INDEX IF NOT EXISTS idx_proposal_line_groups_proposal_id ON public.proposal_line_groups USING btree (proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_line_overrides_proposal_id ON public.proposal_line_overrides USING btree (proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal_id ON public.proposal_sections USING btree (proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON public.proposals USING btree (primary_estimate_id);

CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals USING btree (status);

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_new ON public.schedule_modifications USING btree (new_schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_original ON public.schedule_modifications USING btree (original_schedule_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_cost_code ON public.scheduled_shifts USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_created_at ON public.scheduled_shifts USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date ON public.scheduled_shifts USING btree (scheduled_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_project ON public.scheduled_shifts USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker ON public.scheduled_shifts USING btree (worker_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker_id ON public.scheduled_shifts USING btree (worker_id);

CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON public.sub_bids USING btree (bid_package_id);

CREATE INDEX IF NOT EXISTS idx_sub_compliance_expiry ON public.sub_compliance_documents USING btree (expiry_date);

CREATE INDEX IF NOT EXISTS idx_sub_compliance_sub_id ON public.sub_compliance_documents USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_sub_contracts_project ON public.sub_contracts USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub ON public.sub_contracts USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_sub_invoices_project ON public.sub_invoices USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON public.sub_invoices USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_sub_logs_cost_code ON public.sub_logs USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_sub_logs_date ON public.sub_logs USING btree (date);

CREATE INDEX IF NOT EXISTS idx_sub_logs_project_id ON public.sub_logs USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_sub_logs_sub_id ON public.sub_logs USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_sub_payments_contract ON public.sub_payments USING btree (project_subcontract_id);

CREATE INDEX IF NOT EXISTS idx_sub_payments_date ON public.sub_payments USING btree (payment_date);

CREATE INDEX IF NOT EXISTS idx_sub_payments_invoice ON public.sub_payments USING btree (sub_invoice_id);

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_cost_code ON public.sub_scheduled_shifts USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_date ON public.sub_scheduled_shifts USING btree (scheduled_date);

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_project_id ON public.sub_scheduled_shifts USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_sub_id ON public.sub_scheduled_shifts USING btree (sub_id);

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_cost_code ON public.time_log_allocations USING btree (cost_code_id);

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_day_card ON public.time_log_allocations USING btree (day_card_id);

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_project ON public.time_log_allocations USING btree (project_id);

CREATE INDEX IF NOT EXISTS idx_trades_default_labor_cost_code ON public.trades USING btree (default_labor_cost_code_id);

CREATE INDEX IF NOT EXISTS idx_trades_default_material_cost_code ON public.trades USING btree (default_material_cost_code_id);

CREATE INDEX IF NOT EXISTS idx_workers_trade ON public.workers USING btree (trade_id);-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: dml
-- Count: 12

  INSERT INTO time_log_allocations (day_card_id, project_id, trade_id, cost_code_id, hours)
  SELECT 
    dcj.day_card_id,
    dcj.project_id,
    dcj.trade_id,
    dcj.cost_code_id,
    dcj.hours
  FROM day_card_jobs dcj
  JOIN day_cards dc ON dc.id = dcj.day_card_id
  WHERE 
    dc.date < CURRENT_DATE
    AND dc.lifecycle_status = 'logged'
    AND NOT EXISTS (
      SELECT 1 FROM time_log_allocations tla 
      WHERE tla.day_card_id = dcj.day_card_id
    );

    INSERT INTO day_cards (
      worker_id,
      date,
      scheduled_hours,
      logged_hours,
      status,
      pay_rate,
      pay_status
    ) VALUES (
      v_worker_id,
      v_date,
      v_scheduled_total,
      v_logged_total,
      v_status,
      v_worker_rate,
      v_pay_status
    )
    ON CONFLICT (worker_id, date) DO UPDATE
    SET
      scheduled_hours = EXCLUDED.scheduled_hours,
      logged_hours = EXCLUDED.logged_hours,
      status = EXCLUDED.status,
      pay_rate = EXCLUDED.pay_rate,
      pay_status = EXCLUDED.pay_status,
      updated_at = now()
    RETURNING id INTO v_day_card_id;

    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      scheduled_hours
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date
    ON CONFLICT DO NOTHING;

    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours, notes)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      hours_worked,
      notes
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    ON CONFLICT DO NOTHING;

  INSERT INTO schedule_modifications (
    original_schedule_id,
    modification_type,
    metadata
  ) VALUES (
    p_original_schedule_id,
    'split',
    jsonb_build_object(
      'original_hours', v_original_schedule.scheduled_hours,
      'original_project_id', v_original_schedule.project_id,
      'split_count', jsonb_array_length(p_time_log_entries)
    )
  );

      INSERT INTO daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        v_new_schedule_id,
        v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        v_cost_code_id,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        v_original_schedule.scheduled_date,
        now()
      )
      RETURNING id INTO v_new_timelog_id;

      INSERT INTO schedule_modifications (
        original_schedule_id,
        new_schedule_id,
        modification_type,
        metadata
      ) VALUES (
        p_original_schedule_id,
        v_new_schedule_id,
        'split',
        jsonb_build_object(
          'project_id', (v_entry->>'project_id')::UUID,
          'hours', (v_entry->>'hours')::NUMERIC
        )
      );

  UPDATE estimates
  SET is_budget_source = false
  WHERE project_id = v_project_id
    AND id != p_estimate_id;

  UPDATE estimates
  SET 
    is_budget_source = true,
    status = 'accepted',
    updated_at = now()
  WHERE id = p_estimate_id;

  INSERT INTO project_budgets (
    project_id,
    labor_budget,
    subs_budget,
    materials_budget,
    other_budget,
    baseline_estimate_id
  ) VALUES (
    v_project_id,
    v_labor_total,
    v_subs_total,
    v_materials_total,
    v_other_total,
    p_estimate_id
  )
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();

  DELETE FROM project_budget_lines
  WHERE project_id = v_project_id;

  INSERT INTO project_budget_lines (
    project_id,
    cost_code_id,
    category,
    description,
    budget_amount,
    budget_hours,
    is_allowance,
    source_estimate_id
  )
  SELECT 
    v_project_id,
    cost_code_id,
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END as normalized_category,
    string_agg(DISTINCT description, ' | ') as description,
    SUM(line_total) as budget_amount,
    SUM(planned_hours) as budget_hours,
    bool_and(is_allowance) as is_allowance,
    p_estimate_id
  FROM estimate_items
  WHERE estimate_id = p_estimate_id
  GROUP BY cost_code_id, normalized_category;