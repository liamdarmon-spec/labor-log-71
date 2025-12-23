--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: archived_daily_logs archived_daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_invitations bid_invitations_bid_package_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_invitations bid_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_packages bid_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: cost_codes cost_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: cost_codes cost_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_card_jobs day_card_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_cards day_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_cards day_cards_worker_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimate_items estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invitations invitations_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: material_receipts material_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budget_lines project_budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budget_lines project_budget_lines_project_cost_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
-- REMOVED: Constraint creation moved to forward migration 20251223090003_postbaseline_constraints_and_indexes.sql
-- Reason: Fails on duplicate data; needs dedupe first
--


--
-- Name: project_budgets project_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budgets project_budgets_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_subcontracts project_subcontracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_subcontracts project_subcontracts_project_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_todos project_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_groups proposal_line_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_overrides proposal_line_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_section_items proposal_section_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_sections proposal_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: schedule_modifications schedule_modifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_bids sub_bids_bid_package_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_bids sub_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_compliance_documents sub_compliance_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_contracts sub_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_invoices sub_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_logs sub_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_payments sub_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: subs subs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: time_log_allocations time_log_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: trades trades_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: workers workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_invitations bid_invitations_bid_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_invitations bid_invitations_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: bid_packages bid_packages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: cost_codes cost_codes_default_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: cost_codes cost_codes_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: daily_logs daily_logs_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_card_jobs day_card_jobs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_card_jobs day_card_jobs_day_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_card_jobs day_card_jobs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_card_jobs day_card_jobs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_cards day_cards_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_cards day_cards_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: day_cards day_cards_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: documents documents_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimate_items estimate_items_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimate_items estimate_items_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimate_items estimate_items_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: estimates estimates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: material_receipts material_receipts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: material_receipts material_receipts_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: material_receipts material_receipts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: payments payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budget_lines project_budget_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budget_lines project_budget_lines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budget_lines project_budget_lines_source_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budgets project_budgets_baseline_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_budgets project_budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_subcontracts project_subcontracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_subcontracts project_subcontracts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_todos project_todos_assigned_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: project_todos project_todos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_groups proposal_line_groups_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_groups proposal_line_groups_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_overrides proposal_line_overrides_estimate_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_line_overrides proposal_line_overrides_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_section_items proposal_section_items_estimate_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_section_items proposal_section_items_proposal_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposal_sections proposal_sections_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposals proposals_primary_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: proposals proposals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: scheduled_shifts scheduled_shifts_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_bids sub_bids_bid_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_bids sub_bids_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_compliance_documents sub_compliance_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_compliance_documents sub_compliance_documents_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_contracts sub_contracts_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_contracts sub_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_contracts sub_contracts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_invoices sub_invoices_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_invoices sub_invoices_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_invoices sub_invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_invoices sub_invoices_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_logs sub_logs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_logs sub_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_logs sub_logs_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_payments sub_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_payments sub_payments_payment_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_payments sub_payments_project_subcontract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_payments sub_payments_sub_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: subs subs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: time_log_allocations time_log_allocations_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: time_log_allocations time_log_allocations_day_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: time_log_allocations time_log_allocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: time_log_allocations time_log_allocations_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: trades trades_default_labor_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: trades trades_default_material_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: trades trades_default_sub_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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



--
-- Name: workers workers_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

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


CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at);

-- Company membership
CREATE TABLE IF NOT EXISTS public.company_users (
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner','admin','pm','field','accounting','viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);


CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);


CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);

CREATE INDEX IF NOT EXISTS idx_company_invites_token ON public.company_invites(token);

-- Ensure a default company exists for migration backfill
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Default Company') THEN
    INSERT INTO public.companies (name) VALUES ('Default Company');
  END IF;
END $$;



--
-- Name: idx_activity_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_bid_invitations_package; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_bid_invitations_package ON public.bid_invitations USING btree (bid_package_id);


--
-- Name: idx_bid_packages_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON public.bid_packages USING btree (project_id);


--
-- Name: idx_cost_codes_trade_category_unique; Type: INDEX; Schema: public; Owner: -



CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_codes_trade_category_unique ON public.cost_codes USING btree (trade_id, category) WHERE ((is_active = true) AND (trade_id IS NOT NULL));


--
-- Name: idx_cost_codes_trade_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_cost_codes_trade_id ON public.cost_codes USING btree (trade_id);


--
-- Name: idx_daily_logs_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code ON public.daily_logs USING btree (cost_code_id);


--
-- Name: idx_daily_logs_cost_code_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code_id ON public.daily_logs USING btree (cost_code_id);


--
-- Name: idx_daily_logs_created_at; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_created_at ON public.daily_logs USING btree (created_at DESC);


--
-- Name: idx_daily_logs_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs USING btree (date);


--
-- Name: idx_daily_logs_payment_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_payment_status ON public.daily_logs USING btree (project_id, payment_status) WHERE (payment_status = 'unpaid'::text);


--
-- Name: idx_daily_logs_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_project ON public.daily_logs USING btree (project_id);


--
-- Name: idx_daily_logs_schedule_id; Type: INDEX; Schema: public; Owner: -



CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_schedule_id ON public.daily_logs USING btree (schedule_id) WHERE (schedule_id IS NOT NULL);


--
-- Name: idx_daily_logs_trade_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_trade_id ON public.daily_logs USING btree (trade_id);


--
-- Name: idx_daily_logs_worker; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker ON public.daily_logs USING btree (worker_id);


--
-- Name: idx_daily_logs_worker_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker_id ON public.daily_logs USING btree (worker_id);


--
-- Name: idx_day_card_jobs_day_card; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_day_card ON public.day_card_jobs USING btree (day_card_id);


--
-- Name: idx_day_card_jobs_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_project ON public.day_card_jobs USING btree (project_id);


--
-- Name: idx_day_cards_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_cards_date ON public.day_cards USING btree (date);


--
-- Name: idx_day_cards_pay_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_cards_pay_status ON public.day_cards USING btree (pay_status);


--
-- Name: idx_day_cards_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_cards_status ON public.day_cards USING btree (status);


--
-- Name: idx_day_cards_worker_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_day_cards_worker_date ON public.day_cards USING btree (worker_id, date);


--
-- Name: idx_documents_ai_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON public.documents USING btree (ai_status);


--
-- Name: idx_documents_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_cost_code ON public.documents USING btree (cost_code_id);


--
-- Name: idx_documents_doc_type; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents USING btree (doc_type);


--
-- Name: idx_documents_owner; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents USING btree (owner_type, owner_id);


--
-- Name: idx_documents_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents USING btree (project_id);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents USING btree (document_type);


--
-- Name: idx_documents_uploaded_at; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents USING btree (uploaded_at);


--
-- Name: idx_estimate_items_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_estimate_items_cost_code ON public.estimate_items USING btree (cost_code_id);


--
-- Name: idx_estimate_items_estimate_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON public.estimate_items USING btree (estimate_id);


--
-- Name: idx_estimate_items_trade; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_estimate_items_trade ON public.estimate_items USING btree (trade_id);


--
-- Name: idx_estimates_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates USING btree (project_id);


--
-- Name: idx_estimates_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates USING btree (status);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_used; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_invitations_used ON public.invitations USING btree (used);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_material_receipts_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_material_receipts_cost_code ON public.material_receipts USING btree (cost_code_id);


--
-- Name: idx_material_receipts_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_material_receipts_project ON public.material_receipts USING btree (project_id);


--
-- Name: idx_payments_company; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments USING btree (company_id);


--
-- Name: idx_payments_company_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments USING btree (company_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_dates; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_payments_dates ON public.payments USING btree (start_date, end_date);


--
-- Name: idx_project_budget_lines_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_cost_code ON public.project_budget_lines USING btree (cost_code_id);


--
-- Name: idx_project_budget_lines_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project ON public.project_budget_lines USING btree (project_id);


--
-- Name: idx_project_subcontracts_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_project ON public.project_subcontracts USING btree (project_id);


--
-- Name: idx_project_subcontracts_sub; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_sub ON public.project_subcontracts USING btree (sub_id);


--
-- Name: idx_project_todos_assigned_worker_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_todos_assigned_worker_id ON public.project_todos USING btree (assigned_worker_id);


--
-- Name: idx_project_todos_due_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_todos_due_date ON public.project_todos USING btree (due_date);


--
-- Name: idx_project_todos_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON public.project_todos USING btree (project_id);


--
-- Name: idx_project_todos_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_todos_status ON public.project_todos USING btree (status);


--
-- Name: idx_project_todos_task_type; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_project_todos_task_type ON public.project_todos USING btree (task_type);


--
-- Name: idx_proposal_line_groups_proposal_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposal_line_groups_proposal_id ON public.proposal_line_groups USING btree (proposal_id);


--
-- Name: idx_proposal_line_overrides_proposal_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposal_line_overrides_proposal_id ON public.proposal_line_overrides USING btree (proposal_id);


--
-- Name: idx_proposal_section_items_estimate_item_id; Type: INDEX; Schema: public; Owner: -

--

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposal_section_items'
      AND column_name = 'estimate_item_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_section_items_estimate_item_id ON public.proposal_section_items USING btree (estimate_item_id)';
  END IF;
END
$$;



--
-- Name: idx_proposal_section_items_section_id; Type: INDEX; Schema: public; Owner: -
-- REMOVED: Index creation moved to forward migration 20251223090003_postbaseline_constraints_and_indexes.sql
-- Reason: Column may not exist at this point
--


--
-- Name: idx_proposal_sections_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal_id ON public.proposal_sections USING btree (proposal_id);


--
-- Name: idx_proposals_estimate_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON public.proposals USING btree (primary_estimate_id);


--
-- Name: idx_proposals_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals USING btree (project_id);


--
-- Name: idx_proposals_status; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals USING btree (status);


--
-- Name: idx_schedule_modifications_new; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_new ON public.schedule_modifications USING btree (new_schedule_id);


--
-- Name: idx_schedule_modifications_original; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_original ON public.schedule_modifications USING btree (original_schedule_id);


--
-- Name: idx_scheduled_shifts_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_cost_code ON public.scheduled_shifts USING btree (cost_code_id);


--
-- Name: idx_scheduled_shifts_created_at; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_created_at ON public.scheduled_shifts USING btree (created_at DESC);


--
-- Name: idx_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date ON public.scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_scheduled_shifts_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_project ON public.scheduled_shifts USING btree (project_id);


--
-- Name: idx_scheduled_shifts_worker; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker ON public.scheduled_shifts USING btree (worker_id);


--
-- Name: idx_scheduled_shifts_worker_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker_id ON public.scheduled_shifts USING btree (worker_id);


--
-- Name: idx_sub_bids_package; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON public.sub_bids USING btree (bid_package_id);


--
-- Name: idx_sub_compliance_expiry; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_compliance_expiry ON public.sub_compliance_documents USING btree (expiry_date);


--
-- Name: idx_sub_compliance_sub_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_compliance_sub_id ON public.sub_compliance_documents USING btree (sub_id);


--
-- Name: idx_sub_contracts_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_contracts_project ON public.sub_contracts USING btree (project_id);


--
-- Name: idx_sub_contracts_sub; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub ON public.sub_contracts USING btree (sub_id);


--
-- Name: idx_sub_invoices_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_invoices_project ON public.sub_invoices USING btree (project_id);


--
-- Name: idx_sub_invoices_sub; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON public.sub_invoices USING btree (sub_id);


--
-- Name: idx_sub_logs_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_logs_cost_code ON public.sub_logs USING btree (cost_code_id);


--
-- Name: idx_sub_logs_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_logs_date ON public.sub_logs USING btree (date);


--
-- Name: idx_sub_logs_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_logs_project_id ON public.sub_logs USING btree (project_id);


--
-- Name: idx_sub_logs_sub_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_logs_sub_id ON public.sub_logs USING btree (sub_id);


--
-- Name: idx_sub_payments_contract; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_payments_contract ON public.sub_payments USING btree (project_subcontract_id);


--
-- Name: idx_sub_payments_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_payments_date ON public.sub_payments USING btree (payment_date);


--
-- Name: idx_sub_payments_invoice; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_payments_invoice ON public.sub_payments USING btree (sub_invoice_id);


--
-- Name: idx_sub_scheduled_shifts_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_cost_code ON public.sub_scheduled_shifts USING btree (cost_code_id);


--
-- Name: idx_sub_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_date ON public.sub_scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_sub_scheduled_shifts_project_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_project_id ON public.sub_scheduled_shifts USING btree (project_id);


--
-- Name: idx_sub_scheduled_shifts_sub_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_sub_id ON public.sub_scheduled_shifts USING btree (sub_id);


--
-- Name: idx_time_log_allocations_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_cost_code ON public.time_log_allocations USING btree (cost_code_id);


--
-- Name: idx_time_log_allocations_day_card; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_day_card ON public.time_log_allocations USING btree (day_card_id);


--
-- Name: idx_time_log_allocations_project; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_project ON public.time_log_allocations USING btree (project_id);


--
-- Name: idx_trades_default_labor_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_trades_default_labor_cost_code ON public.trades USING btree (default_labor_cost_code_id);


--
-- Name: idx_trades_default_material_cost_code; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_trades_default_material_cost_code ON public.trades USING btree (default_material_cost_code_id);


--
-- Name: idx_workers_trade; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_workers_trade ON public.workers USING btree (trade_id);


--
-- Name: day_cards_with_details _RETURN; Type: RULE; Schema: public; Owner: -


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from bid_invitations on (bid_package_id, sub_id), keep smallest id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY id ASC
        ) AS rn
      FROM public.bid_invitations
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.bid_invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

-- =============================================================================
-- PHASE 4 LANDMINE: project_budget_lines uniqueness
-- =============================================================================
-- 1) Deduplicate by (project_id, cost_code_id) where both are NOT NULL.
--    Keep: smallest id.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, cost_code_id
      ORDER BY id ASC
    ) AS rn
  FROM public.project_budget_lines
  WHERE project_id IS NOT NULL
    AND cost_code_id IS NOT NULL
)
DELETE FROM public.project_budget_lines t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 2) Enforce uniqueness as a partial unique index (cost_code_id is nullable).
CREATE UNIQUE INDEX IF NOT EXISTS project_budget_lines_project_cost_code_unique
  ON public.project_budget_lines(project_id, cost_code_id)
  WHERE cost_code_id IS NOT NULL;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from companies on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.companies
      WHERE name IS NOT NULL
    )
    DELETE FROM public.companies t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (code), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY code
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE code IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from day_cards on (worker_id, date), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY worker_id, date
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.day_cards
      WHERE worker_id IS NOT NULL AND date IS NOT NULL
    )
    DELETE FROM public.day_cards t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from invitations on (email), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY email
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.invitations
      WHERE email IS NOT NULL
    )
    DELETE FROM public.invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budget_lines on (project_id, cost_code_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, cost_code_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budget_lines
      WHERE project_id IS NOT NULL AND cost_code_id IS NOT NULL
    )
    DELETE FROM public.project_budget_lines t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budgets on (project_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budgets
      WHERE project_id IS NOT NULL
    )
    DELETE FROM public.project_budgets t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_subcontracts on (project_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_subcontracts
      WHERE project_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.project_subcontracts t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from sub_bids on (bid_package_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.sub_bids
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.sub_bids t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from trades on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.trades
      WHERE name IS NOT NULL
    )
    DELETE FROM public.trades t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from user_roles on (user_id, role), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, role
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.user_roles
      WHERE user_id IS NOT NULL AND role IS NOT NULL
    )
    DELETE FROM public.user_roles t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (trade_id, category), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY trade_id, category
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE is_active = true AND trade_id IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from daily_logs on (schedule_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY schedule_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.daily_logs
      WHERE schedule_id IS NOT NULL
    )
    DELETE FROM public.daily_logs t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;
