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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_bid_package_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.companies
  DROP CONSTRAINT IF EXISTS companies_name_key;

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
  EBEGIN

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_code_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_worker_id_date_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.invitations
  DROP CONSTRAINT IF EXISTS invitations_email_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_project_id_key;

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
  EBEGIN

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_project_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_bid_package_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_name_key;

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
  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

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
  EBEGIN

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

ALTER TABLE ONLY public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_actor_id_fkey;

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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_bid_package_id_fkey;

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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_sub_id_fkey;

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

ALTER TABLE ONLY public.bid_packages
  DROP CONSTRAINT IF EXISTS bid_packages_project_id_fkey;

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_default_trade_id_fkey;

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_trade_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_created_by_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_payment_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_project_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_schedule_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_trade_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_worker_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_day_card_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_project_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_trade_id_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_approved_by_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_company_id_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_worker_id_fkey;

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

ALTER TABLE ONLY public.documents
  DROP CONSTRAINT IF EXISTS documents_cost_code_id_fkey;

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

ALTER TABLE ONLY public.documents
  DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_cost_code_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_estimate_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_trade_id_fkey;

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

ALTER TABLE ONLY public.estimates
  DROP CONSTRAINT IF EXISTS estimates_project_id_fkey;

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

ALTER TABLE ONLY public.invitations
  DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;

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

ALTER TABLE ONLY public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;

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

ALTER TABLE ONLY public.invoices
  DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_linked_document_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_project_id_fkey;

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

ALTER TABLE ONLY public.payments
  DROP CONSTRAINT IF EXISTS payments_company_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_cost_code_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_project_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_source_estimate_id_fkey;

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_baseline_estimate_id_fkey;

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_project_id_fkey;

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_sub_id_fkey;

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

ALTER TABLE ONLY public.project_todos
  DROP CONSTRAINT IF EXISTS project_todos_assigned_worker_id_fkey;

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

ALTER TABLE ONLY public.project_todos
  DROP CONSTRAINT IF EXISTS project_todos_project_id_fkey;

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

ALTER TABLE ONLY public.projects
  DROP CONSTRAINT IF EXISTS projects_company_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_groups
  DROP CONSTRAINT IF EXISTS proposal_line_groups_estimate_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_groups
  DROP CONSTRAINT IF EXISTS proposal_line_groups_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_overrides
  DROP CONSTRAINT IF EXISTS proposal_line_overrides_estimate_line_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_overrides
  DROP CONSTRAINT IF EXISTS proposal_line_overrides_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposal_section_items
  DROP CONSTRAINT IF EXISTS proposal_section_items_estimate_item_id_fkey;

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

ALTER TABLE ONLY public.proposal_section_items
  DROP CONSTRAINT IF EXISTS proposal_section_items_proposal_section_id_fkey;

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

ALTER TABLE ONLY public.proposal_sections
  DROP CONSTRAINT IF EXISTS proposal_sections_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposals
  DROP CONSTRAINT IF EXISTS proposals_primary_estimate_id_fkey;

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

ALTER TABLE ONLY public.proposals
  DROP CONSTRAINT IF EXISTS proposals_project_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_created_by_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_project_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_trade_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_worker_id_fkey;

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_bid_package_id_fkey;

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_compliance_documents
  DROP CONSTRAINT IF EXISTS sub_compliance_documents_document_id_fkey;

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

ALTER TABLE ONLY public.sub_compliance_documents
  DROP CONSTRAINT IF EXISTS sub_compliance_documents_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_linked_document_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_project_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_contract_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_linked_document_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_project_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_project_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_created_by_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_payment_batch_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_project_subcontract_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_sub_invoice_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_project_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_sub_id_fkey;

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

ALTER TABLE ONLY public.subs
  DROP CONSTRAINT IF EXISTS subs_trade_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_cost_code_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_day_card_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_project_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_trade_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_labor_cost_code_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_material_cost_code_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_sub_cost_code_id_fkey;

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

ALTER TABLE ONLY public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

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

ALTER TABLE ONLY public.workers
  DROP CONSTRAINT IF EXISTS workers_trade_id_fkey;

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

-- Indexes moved from canonical_tables_foundation

CREATE INDEX IF NOT EXISTS idx_time_logs_company ON public.time_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON public.time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_worker ON public.time_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON public.time_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_company ON public.work_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_project ON public.work_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_worker ON public.work_schedules(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON public.work_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_costs_company ON public.costs(company_id);
CREATE INDEX IF NOT EXISTS idx_costs_project ON public.costs(project_id);
CREATE INDEX IF NOT EXISTS idx_costs_cost_code ON public.costs(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_company ON public.cost_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_project ON public.cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_company ON public.labor_pay_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_pay_run ON public.labor_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_company ON public.labor_pay_run_items(company_id);
CREATE INDEX IF NOT EXISTS idx_material_vendors_company ON public.material_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_company ON public.customer_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_invoice ON public.customer_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_project ON public.customer_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_document ON public.document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON public.document_tags(tag);
CREATE UNIQUE INDEX IF NOT EXISTS measurement_units_code_key ON public.measurement_units(code);
CREATE INDEX IF NOT EXISTS idx_measurement_units_company ON public.measurement_units(company_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_groups_project ON public.project_budget_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_groups_company ON public.project_budget_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_scope_block ON public.scope_block_cost_items(scope_block_id);
CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_company ON public.scope_block_cost_items(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_project ON public.budget_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_company ON public.budget_revisions(company_id);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_project ON public.schedule_of_values(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_company ON public.schedule_of_values(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON public.proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_company ON public.proposal_events(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_created_at ON public.proposal_events(created_at);
CREATE INDEX IF NOT EXISTS idx_proposal_settings_company ON public.proposal_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_settings_proposal ON public.proposal_settings(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_company ON public.proposal_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_name ON public.proposal_templates(name);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal ON public.proposal_sections(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_company ON public.proposal_sections(company_id);
CREATE INDEX IF NOT EXISTS idx_scope_blocks_entity ON public.scope_blocks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scope_blocks_company ON public.scope_blocks(company_id);

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185403_remix_migration_from_pg_dump.sql — indexes
-- ============================================================================



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

CREATE INDEX IF NOT EXISTS idx_proposal_section_items_estimate_item_id ON public.proposal_section_items USING btree (estimate_item_id);


--
-- Name: idx_proposal_section_items_section_id; Type: INDEX; Schema: public; Owner: -

--

CREATE INDEX IF NOT EXISTS idx_proposal_section_items_section_id ON public.proposal_section_items USING btree (proposal_section_id);


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

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185403_remix_migration_from_pg_dump.sql — other (moved for tables-only)
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;

SET xmloption = content;
SET client_min_messages = warning;

SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -

--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--


-- Pre-clean: Remove duplicates from bid_invitations on (bid_package_id, sub_id) keep smallest id
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



-- Pre-clean: Remove duplicates from companies on (name) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY id ASC
    ) AS rn
  FROM public.companies
  WHERE name IS NOT NULL
)
DELETE FROM public.companies t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from cost_codes on (code) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY code
      ORDER BY id ASC
    ) AS rn
  FROM public.cost_codes
  WHERE code IS NOT NULL
)
DELETE FROM public.cost_codes t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from day_cards on (worker_id, date) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY worker_id, date
      ORDER BY id ASC
    ) AS rn
  FROM public.day_cards
  WHERE worker_id IS NOT NULL AND date IS NOT NULL
)
DELETE FROM public.day_cards t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from invitations on (email) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email
      ORDER BY id ASC
    ) AS rn
  FROM public.invitations
  WHERE email IS NOT NULL
)
DELETE FROM public.invitations t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from project_budget_lines on (project_id, cost_code_id) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, cost_code_id
      ORDER BY id ASC
    ) AS rn
  FROM public.project_budget_lines
  WHERE project_id IS NOT NULL AND cost_code_id IS NOT NULL
)
DELETE FROM public.project_budget_lines t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from project_budgets on (project_id) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id
      ORDER BY id ASC
    ) AS rn
  FROM public.project_budgets
  WHERE project_id IS NOT NULL
)
DELETE FROM public.project_budgets t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from project_subcontracts on (project_id, sub_id) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, sub_id
      ORDER BY id ASC
    ) AS rn
  FROM public.project_subcontracts
  WHERE project_id IS NOT NULL AND sub_id IS NOT NULL
)
DELETE FROM public.project_subcontracts t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from sub_bids on (bid_package_id, sub_id) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY bid_package_id, sub_id
      ORDER BY id ASC
    ) AS rn
  FROM public.sub_bids
  WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
)
DELETE FROM public.sub_bids t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from trades on (name) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY id ASC
    ) AS rn
  FROM public.trades
  WHERE name IS NOT NULL
)
DELETE FROM public.trades t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



-- Pre-clean: Remove duplicates from user_roles on (user_id, role) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, role
      ORDER BY id ASC
    ) AS rn
  FROM public.user_roles
  WHERE user_id IS NOT NULL AND role IS NOT NULL
)
DELETE FROM public.user_roles t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin',
      'field_user'
    );
  END IF;
END
$$;



--
-- Name: auto_assign_labor_cost_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_labor_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the worker's trade_id
    SELECT trade_id INTO v_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    IF v_trade_id IS NOT NULL THEN
      -- Find the Labor cost code for this trade
      SELECT default_labor_cost_code_id INTO v_labor_cost_code_id
      FROM trades
      WHERE id = v_trade_id;

      -- Assign it if found
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;

  RETURN NEW;
END;
$$;



--
-- Name: auto_assign_sub_cost_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_assign_sub_cost_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the sub's trade_id
    SELECT trade_id INTO v_trade_id
    FROM subs
    WHERE id = NEW.sub_id;

    IF v_trade_id IS NOT NULL THEN
      -- Find the Sub cost code for this trade
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id
      FROM trades
      WHERE id = v_trade_id;

      -- Assign it if found
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;

  RETURN NEW;
END;
$$;



--
-- Name: auto_create_past_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_create_past_logs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- For day_cards that are in the past and have scheduled_hours but no logged_hours
  UPDATE day_cards
  SET 
    logged_hours = scheduled_hours,
    lifecycle_status = 'logged'
  WHERE 
    date < CURRENT_DATE
    AND scheduled_hours > 0
    AND (logged_hours IS NULL OR logged_hours = 0)
    AND lifecycle_status = 'scheduled';
    
  -- Copy allocations from day_card_jobs to time_log_allocations for these
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
END;
$$;



--
-- Name: delete_old_archived_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.delete_old_archived_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$$;



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;



--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;



--
-- Name: log_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    TG_ARGV[0]::TEXT,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by),
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('changes', row_to_json(NEW) - row_to_json(OLD))
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;



--
-- Name: migrate_to_day_cards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.migrate_to_day_cards() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_worker_id UUID;
  v_date DATE;
  v_day_card_id UUID;
  v_scheduled_total NUMERIC;
  v_logged_total NUMERIC;
  v_worker_rate NUMERIC;
  v_status TEXT;
  v_pay_status TEXT;
BEGIN
  -- Get all unique worker+date combinations from both schedules and logs
  FOR v_worker_id, v_date IN 
    SELECT DISTINCT worker_id, scheduled_date as date
    FROM scheduled_shifts
    UNION
    SELECT DISTINCT worker_id, date
    FROM daily_logs
  LOOP
    -- Calculate scheduled hours for this worker+date
    SELECT COALESCE(SUM(scheduled_hours), 0)
    INTO v_scheduled_total
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date;
    
    -- Calculate logged hours for this worker+date
    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_logged_total
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date;
    
    -- Get worker's hourly rate
    SELECT hourly_rate
    INTO v_worker_rate
    FROM workers
    WHERE id = v_worker_id;
    
    -- Determine status based on date and logged hours
    IF v_logged_total > 0 THEN
      v_status := 'logged';
    ELSIF v_date < CURRENT_DATE THEN
      v_status := 'scheduled';
    ELSE
      v_status := 'scheduled';
    
    -- Determine pay status from daily_logs
    SELECT CASE 
      WHEN payment_status = 'paid' THEN 'paid'
      WHEN payment_status = 'pending' THEN 'pending'
      ELSE 'unpaid'
    END
    INTO v_pay_status
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    LIMIT 1;
    
    IF v_pay_status IS NULL THEN
      v_pay_status := 'unpaid';
    
    -- Create or update the DayCard
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
    
    -- Migrate job splits from scheduled_shifts
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
    
    -- Migrate job splits from daily_logs (if different from schedules)
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
  END LOOP;
  
  RAISE NOTICE 'Migration complete. DayCards created from existing schedules and logs.';
END;
$$;



--
-- Name: split_schedule_for_multi_project(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.split_schedule_for_multi_project(p_original_schedule_id uuid, p_time_log_entries jsonb) RETURNS TABLE(schedule_id uuid, time_log_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_original_schedule RECORD;
  v_entry JSONB;
  v_new_schedule_id UUID;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_existing_timelog_id UUID;
  v_cost_code_id UUID;
BEGIN
  -- Get the original schedule details INCLUDING cost_code_id
  SELECT * INTO v_original_schedule
  FROM scheduled_shifts
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found';

  -- Disable triggers to prevent infinite recursion during split
  PERFORM set_config('session.split_in_progress', 'true', true);

  -- Log the original schedule state
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

  -- Process each time log entry
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_time_log_entries)
  LOOP
    -- Extract cost_code_id from entry or use original
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_schedule.cost_code_id);

    IF v_first_iteration THEN
      -- Update the original schedule with the first entry
      UPDATE scheduled_shifts
      SET
        project_id = (v_entry->>'project_id')::UUID,
        scheduled_hours = (v_entry->>'hours')::NUMERIC,
        trade_id = (v_entry->>'trade_id')::UUID,
        cost_code_id = v_cost_code_id,
        notes = COALESCE(v_entry->>'notes', notes),
        status = 'split_modified',
        converted_to_timelog = true,
        updated_at = now(),
        last_synced_at = now()
      WHERE id = p_original_schedule_id
      RETURNING id INTO v_new_schedule_id;

      -- Check if a time log already exists for this schedule
      SELECT id INTO v_existing_timelog_id
      FROM daily_logs
      WHERE daily_logs.schedule_id = v_new_schedule_id;

      IF v_existing_timelog_id IS NOT NULL THEN
        -- Update existing time log INCLUDING cost_code_id
        UPDATE daily_logs
        SET
          project_id = (v_entry->>'project_id')::UUID,
          hours_worked = (v_entry->>'hours')::NUMERIC,
          trade_id = (v_entry->>'trade_id')::UUID,
          cost_code_id = v_cost_code_id,
          notes = v_entry->>'notes',
          last_synced_at = now()
        WHERE id = v_existing_timelog_id
        RETURNING id INTO v_new_timelog_id;
      ELSE
        -- Create new time log INCLUDING cost_code_id
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

      v_first_iteration := false;
    ELSE
      -- Create new schedule entries for additional projects INCLUDING cost_code_id
      INSERT INTO scheduled_shifts (
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        scheduled_date,
        scheduled_hours,
        notes,
        status,
        created_by,
        converted_to_timelog,
        last_synced_at
      ) VALUES (
        v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        v_cost_code_id,
        v_original_schedule.scheduled_date,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        'split_created',
        v_original_schedule.created_by,
        true,
        now()
      )
      RETURNING id INTO v_new_schedule_id;

      -- Create corresponding time log for new schedule INCLUDING cost_code_id
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

      -- Log the new schedule creation
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

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;
  END LOOP;

  -- Re-enable triggers
  PERFORM set_config('session.split_in_progress', 'false', true);
END;
$$;



--
-- Name: sync_estimate_to_budget(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  -- Get project_id from estimate
  SELECT project_id INTO v_project_id
  FROM estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate not found';

  -- Clear is_budget_source from all other estimates for this project
  UPDATE estimates
  SET is_budget_source = false
  WHERE project_id = v_project_id
    AND id != p_estimate_id;

  -- Mark this estimate as budget source and accepted
  UPDATE estimates
  SET 
    is_budget_source = true,
    status = 'accepted',
    updated_at = now()
  WHERE id = p_estimate_id;

  -- Calculate category totals from estimate items
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

  -- Update or insert project_budgets
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

  -- Delete old budget lines for this project
  DELETE FROM project_budget_lines
  WHERE project_id = v_project_id;

  -- Insert new budget lines aggregated by category + cost_code
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

END;
$$;



--
-- Name: sync_payment_to_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_payment_to_logs() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When a payment is created, mark all related logs as paid
  UPDATE day_cards
  SET 
    pay_status = 'paid',
    lifecycle_status = 'paid',
    paid_at = NEW.payment_date,
    locked = true
  WHERE 
    company_id = NEW.company_id
    AND date BETWEEN NEW.start_date AND NEW.end_date
    AND pay_status = 'unpaid'
    AND logged_hours > 0;
    
  RETURN NEW;
END;
$$;



--
-- Name: sync_schedule_to_timelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_schedule_to_timelog() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;

  -- CRITICAL: Only auto-sync if ALL these conditions are met:
  -- 1. The scheduled date has ALREADY PASSED (not today, must be in the past)
  -- 2. There's no existing time log for this schedule
  -- This prevents future schedules from auto-creating time logs
  IF NEW.scheduled_date < CURRENT_DATE THEN
    -- Check if a time log already exists for this schedule
    IF EXISTS (SELECT 1 FROM public.daily_logs WHERE schedule_id = NEW.id) THEN
      -- Update existing time log with schedule changes
      UPDATE public.daily_logs
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        hours_worked = NEW.scheduled_hours,
        notes = NEW.notes,
        date = NEW.scheduled_date,
        last_synced_at = now()
      WHERE schedule_id = NEW.id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        cost_code_id IS DISTINCT FROM NEW.cost_code_id OR
        hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
        notes IS DISTINCT FROM NEW.notes OR
        date IS DISTINCT FROM NEW.scheduled_date
      );
    ELSE
      -- Only create new time log if date has passed
      INSERT INTO public.daily_logs (
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
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.trade_id,
        NEW.cost_code_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
    
    -- Update schedule status
    NEW.status := 'synced';
    NEW.last_synced_at := now();
  ELSIF NEW.converted_to_timelog = true AND OLD.converted_to_timelog = false THEN
    -- MANUAL CONVERSION: User explicitly converted this schedule to a time log
    -- This allows converting future schedules manually
    IF NOT EXISTS (SELECT 1 FROM public.daily_logs WHERE schedule_id = NEW.id) THEN
      INSERT INTO public.daily_logs (
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
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.trade_id,
        NEW.cost_code_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
    
    NEW.status := 'converted';
    NEW.last_synced_at := now();
  
  RETURN NEW;
END;
$$;



--
-- Name: sync_timelog_to_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_timelog_to_schedule() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  schedule_date date;
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;

  -- Only process if there's a linked schedule
  IF NEW.schedule_id IS NOT NULL THEN
    -- Get the scheduled date
    SELECT scheduled_date INTO schedule_date
    FROM public.scheduled_shifts
    WHERE id = NEW.schedule_id;
    
    -- Only sync if schedule exists and date has passed (prevents same-day auto-sync)
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      -- Update corresponding schedule with time log changes INCLUDING cost_code_id
      UPDATE public.scheduled_shifts
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        scheduled_hours = NEW.hours_worked,
        notes = NEW.notes,
        scheduled_date = NEW.date,
        status = 'synced',
        last_synced_at = now()
      WHERE id = NEW.schedule_id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        cost_code_id IS DISTINCT FROM NEW.cost_code_id OR
        scheduled_hours IS DISTINCT FROM NEW.hours_worked OR
        notes IS DISTINCT FROM NEW.notes OR
        scheduled_date IS DISTINCT FROM NEW.date
      );
      
      NEW.last_synced_at := now();
  
  RETURN NEW;
END;
$$;



--



SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -



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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_bid_package_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.companies
  DROP CONSTRAINT IF EXISTS companies_name_key;

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
  EBEGIN

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_code_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_worker_id_date_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.invitations
  DROP CONSTRAINT IF EXISTS invitations_email_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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
--

ALTER TABLE public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_project_cost_code_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'project_budget_lines_project_cost_code_unique'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_project_cost_code_unique UNIQUE (project_id, cost_code_id);
  EBEGIN

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_project_id_key;

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
  EBEGIN

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_project_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_bid_package_id_sub_id_key;

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
  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_name_key;

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
  EBEGIN

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

  EBEGIN

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

ALTER TABLE ONLY public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

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
  EBEGIN

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


-- Pre-clean: Remove duplicates from cost_codes on (trade_id, category) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY trade_id, category
      ORDER BY id ASC
    ) AS rn
  FROM public.cost_codes
  WHERE is_active = true AND trade_id IS NOT NULL
)
DELETE FROM public.cost_codes t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

--


-- Pre-clean: Remove duplicates from daily_logs on (schedule_id) keep smallest id
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY schedule_id
      ORDER BY id ASC
    ) AS rn
  FROM public.daily_logs
  WHERE schedule_id IS NOT NULL
)
DELETE FROM public.daily_logs t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;



--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_actor_id_fkey;

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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_bid_package_id_fkey;

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

ALTER TABLE ONLY public.bid_invitations
  DROP CONSTRAINT IF EXISTS bid_invitations_sub_id_fkey;

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

ALTER TABLE ONLY public.bid_packages
  DROP CONSTRAINT IF EXISTS bid_packages_project_id_fkey;

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_default_trade_id_fkey;

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

ALTER TABLE ONLY public.cost_codes
  DROP CONSTRAINT IF EXISTS cost_codes_trade_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_created_by_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_payment_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_project_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_schedule_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_trade_id_fkey;

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

ALTER TABLE ONLY public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_worker_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_day_card_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_project_id_fkey;

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

ALTER TABLE ONLY public.day_card_jobs
  DROP CONSTRAINT IF EXISTS day_card_jobs_trade_id_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_approved_by_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_company_id_fkey;

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

ALTER TABLE ONLY public.day_cards
  DROP CONSTRAINT IF EXISTS day_cards_worker_id_fkey;

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

ALTER TABLE ONLY public.documents
  DROP CONSTRAINT IF EXISTS documents_cost_code_id_fkey;

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

ALTER TABLE ONLY public.documents
  DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_cost_code_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_estimate_id_fkey;

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

ALTER TABLE ONLY public.estimate_items
  DROP CONSTRAINT IF EXISTS estimate_items_trade_id_fkey;

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

ALTER TABLE ONLY public.estimates
  DROP CONSTRAINT IF EXISTS estimates_project_id_fkey;

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

ALTER TABLE ONLY public.invitations
  DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;

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

ALTER TABLE ONLY public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;

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

ALTER TABLE ONLY public.invoices
  DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_linked_document_id_fkey;

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

ALTER TABLE ONLY public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_project_id_fkey;

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

ALTER TABLE ONLY public.payments
  DROP CONSTRAINT IF EXISTS payments_company_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_cost_code_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_project_id_fkey;

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

ALTER TABLE ONLY public.project_budget_lines
  DROP CONSTRAINT IF EXISTS project_budget_lines_source_estimate_id_fkey;

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_baseline_estimate_id_fkey;

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

ALTER TABLE ONLY public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_project_id_fkey;

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

ALTER TABLE ONLY public.project_subcontracts
  DROP CONSTRAINT IF EXISTS project_subcontracts_sub_id_fkey;

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

ALTER TABLE ONLY public.project_todos
  DROP CONSTRAINT IF EXISTS project_todos_assigned_worker_id_fkey;

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

ALTER TABLE ONLY public.project_todos
  DROP CONSTRAINT IF EXISTS project_todos_project_id_fkey;

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

ALTER TABLE ONLY public.projects
  DROP CONSTRAINT IF EXISTS projects_company_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_groups
  DROP CONSTRAINT IF EXISTS proposal_line_groups_estimate_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_groups
  DROP CONSTRAINT IF EXISTS proposal_line_groups_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_overrides
  DROP CONSTRAINT IF EXISTS proposal_line_overrides_estimate_line_id_fkey;

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

ALTER TABLE ONLY public.proposal_line_overrides
  DROP CONSTRAINT IF EXISTS proposal_line_overrides_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposal_section_items
  DROP CONSTRAINT IF EXISTS proposal_section_items_estimate_item_id_fkey;

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

ALTER TABLE ONLY public.proposal_section_items
  DROP CONSTRAINT IF EXISTS proposal_section_items_proposal_section_id_fkey;

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

ALTER TABLE ONLY public.proposal_sections
  DROP CONSTRAINT IF EXISTS proposal_sections_proposal_id_fkey;

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

ALTER TABLE ONLY public.proposals
  DROP CONSTRAINT IF EXISTS proposals_primary_estimate_id_fkey;

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

ALTER TABLE ONLY public.proposals
  DROP CONSTRAINT IF EXISTS proposals_project_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_created_by_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_project_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_trade_id_fkey;

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

ALTER TABLE ONLY public.scheduled_shifts
  DROP CONSTRAINT IF EXISTS scheduled_shifts_worker_id_fkey;

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_bid_package_id_fkey;

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

ALTER TABLE ONLY public.sub_bids
  DROP CONSTRAINT IF EXISTS sub_bids_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_compliance_documents
  DROP CONSTRAINT IF EXISTS sub_compliance_documents_document_id_fkey;

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

ALTER TABLE ONLY public.sub_compliance_documents
  DROP CONSTRAINT IF EXISTS sub_compliance_documents_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_linked_document_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_project_id_fkey;

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

ALTER TABLE ONLY public.sub_contracts
  DROP CONSTRAINT IF EXISTS sub_contracts_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_contract_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_linked_document_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_project_id_fkey;

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

ALTER TABLE ONLY public.sub_invoices
  DROP CONSTRAINT IF EXISTS sub_invoices_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_cost_code_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_project_id_fkey;

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

ALTER TABLE ONLY public.sub_logs
  DROP CONSTRAINT IF EXISTS sub_logs_sub_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_created_by_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_payment_batch_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_project_subcontract_id_fkey;

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

ALTER TABLE ONLY public.sub_payments
  DROP CONSTRAINT IF EXISTS sub_payments_sub_invoice_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_cost_code_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_project_id_fkey;

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

ALTER TABLE ONLY public.sub_scheduled_shifts
  DROP CONSTRAINT IF EXISTS sub_scheduled_shifts_sub_id_fkey;

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

ALTER TABLE ONLY public.subs
  DROP CONSTRAINT IF EXISTS subs_trade_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_cost_code_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_day_card_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_project_id_fkey;

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

ALTER TABLE ONLY public.time_log_allocations
  DROP CONSTRAINT IF EXISTS time_log_allocations_trade_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_labor_cost_code_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_material_cost_code_id_fkey;

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

ALTER TABLE ONLY public.trades
  DROP CONSTRAINT IF EXISTS trades_default_sub_cost_code_id_fkey;

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

ALTER TABLE ONLY public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

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

ALTER TABLE ONLY public.workers
  DROP CONSTRAINT IF EXISTS workers_trade_id_fkey;

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
  

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185806_10ede57c-86cd-4c6b-8d01-6fa38f2e5bbb.sql — indexes
-- ============================================================================


-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_schedules_worker_date ON work_schedules(worker_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_project ON work_schedules(project_id);

CREATE INDEX IF NOT EXISTS idx_work_schedules_company_date ON work_schedules(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(scheduled_date);


CREATE INDEX IF NOT EXISTS idx_time_logs_worker_date ON time_logs(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON time_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_time_logs_company_date ON time_logs(company_id, date);
CREATE INDEX IF NOT EXISTS idx_time_logs_payment_status ON time_logs(payment_status);

CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date);

CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_status ON labor_pay_runs(status);


-- moved to guarded DO block above
-- CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_dates ON labor_pay_runs(date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_pay_run ON labor_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_time_log ON labor_pay_run_items(time_log_id);

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185806_10ede57c-86cd-4c6b-8d01-6fa38f2e5bbb.sql — comments
-- ============================================================================


-- 12. Add helpful comments
COMMENT ON TABLE work_schedules IS 'Forma OS: Planned work schedules for workers and subs';
COMMENT ON TABLE time_logs IS 'Forma OS: Actual logged work hours and labor costs';

COMMENT ON TABLE labor_pay_runs IS 'Forma OS: Grouped payment runs for labor costs by company';
COMMENT ON TABLE labor_pay_run_items IS 'Forma OS: Individual time log entries included in a pay run';

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185806_10ede57c-86cd-4c6b-8d01-6fa38f2e5bbb.sql — other (moved for tables-only)
-- ============================================================================


DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    -- Ensure required columns exist for the index
    EXECUTE 'ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS date_range_start date';
    EXECUTE 'ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS date_range_end date';

    -- Create index only if both columns exist (belt + suspenders)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='labor_pay_runs' AND column_name='date_range_start'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='labor_pay_runs' AND column_name='date_range_end'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_dates ON public.labor_pay_runs(date_range_start, date_range_end)';
    END IF;
  END IF;
END $$;
