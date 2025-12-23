--
-- Name: daily_logs auto_assign_labor_cost_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: sub_logs auto_assign_sub_cost_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS auto_assign_sub_cost_code_trigger ON public.sub_logs;
CREATE TRIGGER auto_assign_sub_cost_code_trigger BEFORE INSERT ON public.sub_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_sub_cost_code();



--
-- Name: day_cards day_cards_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS day_cards_activity_log ON public.day_cards;
CREATE TRIGGER day_cards_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.log_activity('log');



--
-- Name: payments payments_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS payments_activity_log ON public.payments;
CREATE TRIGGER payments_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity('payment');



--
-- Name: payments sync_payment_to_logs_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_payment_to_logs_trigger ON public.payments;
CREATE TRIGGER sync_payment_to_logs_trigger AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_logs();



--
-- Name: scheduled_shifts sync_schedule_to_timelog_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON public.scheduled_shifts;
CREATE TRIGGER sync_schedule_to_timelog_trigger BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();



--
-- Name: daily_logs sync_timelog_to_schedule_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON public.daily_logs;
CREATE TRIGGER sync_timelog_to_schedule_trigger AFTER UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.sync_timelog_to_schedule();



--
-- Name: daily_logs trigger_auto_assign_labor_cost_code; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_auto_assign_labor_cost_code ON public.daily_logs;
CREATE TRIGGER trigger_auto_assign_labor_cost_code BEFORE INSERT ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_labor_cost_code();



--
-- Name: sub_logs trigger_auto_assign_sub_cost_code; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_auto_assign_sub_cost_code ON public.sub_logs;
CREATE TRIGGER trigger_auto_assign_sub_cost_code BEFORE INSERT ON public.sub_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_sub_cost_code();



--
-- Name: scheduled_shifts trigger_sync_schedule_to_timelog; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON public.scheduled_shifts;
CREATE TRIGGER trigger_sync_schedule_to_timelog BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();



--
-- Name: daily_logs trigger_sync_timelog_to_schedule; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_sync_timelog_to_schedule ON public.daily_logs;
CREATE TRIGGER trigger_sync_timelog_to_schedule BEFORE UPDATE ON public.daily_logs FOR EACH ROW WHEN ((new.schedule_id IS NOT NULL)) EXECUTE FUNCTION public.sync_timelog_to_schedule();



--
-- Name: bid_packages update_bid_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_bid_packages_updated_at ON public.bid_packages;
CREATE TRIGGER update_bid_packages_updated_at BEFORE UPDATE ON public.bid_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: cost_codes update_cost_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_cost_codes_updated_at ON public.cost_codes;
CREATE TRIGGER update_cost_codes_updated_at BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: day_card_jobs update_day_card_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_day_card_jobs_updated_at ON public.day_card_jobs;
CREATE TRIGGER update_day_card_jobs_updated_at BEFORE UPDATE ON public.day_card_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: day_cards update_day_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_day_cards_updated_at ON public.day_cards;
CREATE TRIGGER update_day_cards_updated_at BEFORE UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: estimates update_estimates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_estimates_updated_at ON public.estimates;
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: material_receipts update_material_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_material_receipts_updated_at ON public.material_receipts;
CREATE TRIGGER update_material_receipts_updated_at BEFORE UPDATE ON public.material_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: project_budget_lines update_project_budget_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_budget_lines_updated_at ON public.project_budget_lines;
CREATE TRIGGER update_project_budget_lines_updated_at BEFORE UPDATE ON public.project_budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: project_budgets update_project_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON public.project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: project_subcontracts update_project_subcontracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_subcontracts_updated_at ON public.project_subcontracts;
CREATE TRIGGER update_project_subcontracts_updated_at BEFORE UPDATE ON public.project_subcontracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: project_todos update_project_todos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_todos_updated_at ON public.project_todos;
CREATE TRIGGER update_project_todos_updated_at BEFORE UPDATE ON public.project_todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: proposals update_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: scheduled_shifts update_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_scheduled_shifts_updated_at ON public.scheduled_shifts;
CREATE TRIGGER update_scheduled_shifts_updated_at BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: sub_compliance_documents update_sub_compliance_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_compliance_documents_updated_at ON public.sub_compliance_documents;
CREATE TRIGGER update_sub_compliance_documents_updated_at BEFORE UPDATE ON public.sub_compliance_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: sub_contracts update_sub_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_contracts_updated_at ON public.sub_contracts;
CREATE TRIGGER update_sub_contracts_updated_at BEFORE UPDATE ON public.sub_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: sub_invoices update_sub_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_invoices_updated_at ON public.sub_invoices;
CREATE TRIGGER update_sub_invoices_updated_at BEFORE UPDATE ON public.sub_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: sub_scheduled_shifts update_sub_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_scheduled_shifts_updated_at ON public.sub_scheduled_shifts;
CREATE TRIGGER update_sub_scheduled_shifts_updated_at BEFORE UPDATE ON public.sub_scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: subs update_subs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_subs_updated_at ON public.subs;
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: time_log_allocations update_time_log_allocations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_time_log_allocations_updated_at ON public.time_log_allocations;
CREATE TRIGGER update_time_log_allocations_updated_at BEFORE UPDATE ON public.time_log_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



--
-- Name: workers update_workers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS prevent_projects_company_change ON public.projects;
CREATE TRIGGER prevent_projects_company_change
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_day_cards_company_change ON public.day_cards;
CREATE TRIGGER prevent_day_cards_company_change
  BEFORE UPDATE ON public.day_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_scheduled_shifts_company_change ON public.scheduled_shifts;
CREATE TRIGGER prevent_scheduled_shifts_company_change
  BEFORE UPDATE ON public.scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_daily_logs_company_change ON public.daily_logs;
CREATE TRIGGER prevent_daily_logs_company_change
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_documents_company_change ON public.documents;
CREATE TRIGGER prevent_documents_company_change
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_payments_company_change ON public.payments;
CREATE TRIGGER prevent_payments_company_change
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_material_receipts_company_change ON public.material_receipts;
CREATE TRIGGER prevent_material_receipts_company_change
  BEFORE UPDATE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_logs_company_change ON public.sub_logs;
CREATE TRIGGER prevent_sub_logs_company_change
  BEFORE UPDATE ON public.sub_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_subs_company_change ON public.subs;
CREATE TRIGGER prevent_subs_company_change
  BEFORE UPDATE ON public.subs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_workers_company_change ON public.workers;
CREATE TRIGGER prevent_workers_company_change
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_cost_codes_company_change ON public.cost_codes;
CREATE TRIGGER prevent_cost_codes_company_change
  BEFORE UPDATE ON public.cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_trades_company_change ON public.trades;
CREATE TRIGGER prevent_trades_company_change
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_project_budget_lines_company_change ON public.project_budget_lines;
CREATE TRIGGER prevent_project_budget_lines_company_change
  BEFORE UPDATE ON public.project_budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_estimates_company_change ON public.estimates;
CREATE TRIGGER prevent_estimates_company_change
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_estimate_items_company_change ON public.estimate_items;
CREATE TRIGGER prevent_estimate_items_company_change
  BEFORE UPDATE ON public.estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_invoices_company_change ON public.invoices;
CREATE TRIGGER prevent_invoices_company_change
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_invoice_items_company_change ON public.invoice_items;
CREATE TRIGGER prevent_invoice_items_company_change
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_bid_packages_company_change ON public.bid_packages;
CREATE TRIGGER prevent_bid_packages_company_change
  BEFORE UPDATE ON public.bid_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_bid_invitations_company_change ON public.bid_invitations;
CREATE TRIGGER prevent_bid_invitations_company_change
  BEFORE UPDATE ON public.bid_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_project_budgets_company_change ON public.project_budgets;
CREATE TRIGGER prevent_project_budgets_company_change
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_project_todos_company_change ON public.project_todos;
CREATE TRIGGER prevent_project_todos_company_change
  BEFORE UPDATE ON public.project_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_proposals_company_change ON public.proposals;
CREATE TRIGGER prevent_proposals_company_change
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_proposal_sections_company_change ON public.proposal_sections;
CREATE TRIGGER prevent_proposal_sections_company_change
  BEFORE UPDATE ON public.proposal_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_proposal_section_items_company_change ON public.proposal_section_items;
CREATE TRIGGER prevent_proposal_section_items_company_change
  BEFORE UPDATE ON public.proposal_section_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_contracts_company_change ON public.sub_contracts;
CREATE TRIGGER prevent_sub_contracts_company_change
  BEFORE UPDATE ON public.sub_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_invoices_company_change ON public.sub_invoices;
CREATE TRIGGER prevent_sub_invoices_company_change
  BEFORE UPDATE ON public.sub_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_bids_company_change ON public.sub_bids;
CREATE TRIGGER prevent_sub_bids_company_change
  BEFORE UPDATE ON public.sub_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_time_log_allocations_company_change ON public.time_log_allocations;
CREATE TRIGGER prevent_time_log_allocations_company_change
  BEFORE UPDATE ON public.time_log_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_day_card_jobs_company_change ON public.day_card_jobs;
CREATE TRIGGER prevent_day_card_jobs_company_change
  BEFORE UPDATE ON public.day_card_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_archived_daily_logs_company_change ON public.archived_daily_logs;
CREATE TRIGGER prevent_archived_daily_logs_company_change
  BEFORE UPDATE ON public.archived_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_schedule_modifications_company_change ON public.schedule_modifications;
CREATE TRIGGER prevent_schedule_modifications_company_change
  BEFORE UPDATE ON public.schedule_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_scheduled_shifts_company_change ON public.sub_scheduled_shifts;
CREATE TRIGGER prevent_sub_scheduled_shifts_company_change
  BEFORE UPDATE ON public.sub_scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_payments_company_change ON public.sub_payments;
CREATE TRIGGER prevent_sub_payments_company_change
  BEFORE UPDATE ON public.sub_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_sub_compliance_documents_company_change ON public.sub_compliance_documents;
CREATE TRIGGER prevent_sub_compliance_documents_company_change
  BEFORE UPDATE ON public.sub_compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();


DROP TRIGGER IF EXISTS prevent_material_receipts_company_change ON public.material_receipts;
CREATE TRIGGER prevent_material_receipts_company_change
  BEFORE UPDATE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_company_id_change();
