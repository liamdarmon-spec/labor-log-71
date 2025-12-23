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
