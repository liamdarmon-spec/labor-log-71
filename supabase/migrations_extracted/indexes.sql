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
