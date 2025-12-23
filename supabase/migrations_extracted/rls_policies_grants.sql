-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: rls
-- Count: 323

CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);

CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);

CREATE POLICY "Anyone can delete budget lines" ON public.project_budget_lines FOR DELETE USING (true);

CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes FOR DELETE USING (true);

CREATE POLICY "Anyone can delete day card jobs" ON public.day_card_jobs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete day cards" ON public.day_cards FOR DELETE USING (true);

CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Anyone can delete estimate items" ON public.estimate_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete estimates" ON public.estimates FOR DELETE USING (true);

CREATE POLICY "Anyone can delete invoice items" ON public.invoice_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);

CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);

CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub compliance" ON public.sub_compliance_documents FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub payments" ON public.sub_payments FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub schedules" ON public.sub_scheduled_shifts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete time log allocations" ON public.time_log_allocations FOR DELETE USING (true);

CREATE POLICY "Anyone can delete todos" ON public.project_todos FOR DELETE USING (true);

CREATE POLICY "Anyone can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert budget lines" ON public.project_budget_lines FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert day card jobs" ON public.day_card_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert day cards" ON public.day_cards FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert estimate items" ON public.estimate_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert estimates" ON public.estimates FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub compliance" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub payments" ON public.sub_payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub schedules" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert time log allocations" ON public.time_log_allocations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert todos" ON public.project_todos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);

CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);

CREATE POLICY "Anyone can update budget lines" ON public.project_budget_lines FOR UPDATE USING (true);

CREATE POLICY "Anyone can update cost codes" ON public.cost_codes FOR UPDATE USING (true);

CREATE POLICY "Anyone can update day card jobs" ON public.day_card_jobs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update day cards" ON public.day_cards FOR UPDATE USING (true);

CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Anyone can update estimate items" ON public.estimate_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update estimates" ON public.estimates FOR UPDATE USING (true);

CREATE POLICY "Anyone can update invoice items" ON public.invoice_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);

CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);

CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub compliance" ON public.sub_compliance_documents FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub payments" ON public.sub_payments FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub schedules" ON public.sub_scheduled_shifts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update time log allocations" ON public.time_log_allocations FOR UPDATE USING (true);

CREATE POLICY "Anyone can update todos" ON public.project_todos FOR UPDATE USING (true);

CREATE POLICY "Anyone can view activity log" ON public.activity_log FOR SELECT USING (true);

CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);

CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);

CREATE POLICY "Anyone can view budget lines" ON public.project_budget_lines FOR SELECT USING (true);

CREATE POLICY "Anyone can view cost codes" ON public.cost_codes FOR SELECT USING (true);

CREATE POLICY "Anyone can view day card jobs" ON public.day_card_jobs FOR SELECT USING (true);

CREATE POLICY "Anyone can view day cards" ON public.day_cards FOR SELECT USING (true);

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);

CREATE POLICY "Anyone can view estimate items" ON public.estimate_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view estimates" ON public.estimates FOR SELECT USING (true);

CREATE POLICY "Anyone can view invoice items" ON public.invoice_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);

CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);

CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);

CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub compliance" ON public.sub_compliance_documents FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub payments" ON public.sub_payments FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub schedules" ON public.sub_scheduled_shifts FOR SELECT USING (true);

CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);

CREATE POLICY "Anyone can view time log allocations" ON public.time_log_allocations FOR SELECT USING (true);

CREATE POLICY "Anyone can view todos" ON public.project_todos FOR SELECT USING (true);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_policy ON public.projects
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY projects_insert_policy ON public.projects
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY projects_update_policy ON public.projects
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY projects_delete_policy ON public.projects
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_cards_select_policy ON public.day_cards
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY day_cards_insert_policy ON public.day_cards
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY day_cards_update_policy ON public.day_cards
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY day_cards_delete_policy ON public.day_cards
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_shifts_select_policy ON public.scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY scheduled_shifts_insert_policy ON public.scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY scheduled_shifts_update_policy ON public.scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY scheduled_shifts_delete_policy ON public.scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_logs_select_policy ON public.daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY daily_logs_insert_policy ON public.daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY daily_logs_update_policy ON public.daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY daily_logs_delete_policy ON public.daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select_policy ON public.documents
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY documents_insert_policy ON public.documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY documents_update_policy ON public.documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY documents_delete_policy ON public.documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_policy ON public.payments
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY payments_insert_policy ON public.payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY payments_update_policy ON public.payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY payments_delete_policy ON public.payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_logs_select_policy ON public.sub_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_logs_insert_policy ON public.sub_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_logs_update_policy ON public.sub_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_logs_delete_policy ON public.sub_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

CREATE POLICY subs_select_policy ON public.subs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY subs_insert_policy ON public.subs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY subs_update_policy ON public.subs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY subs_delete_policy ON public.subs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY workers_select_policy ON public.workers
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY workers_insert_policy ON public.workers
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY workers_update_policy ON public.workers
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY workers_delete_policy ON public.workers
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_codes_select_policy ON public.cost_codes
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY cost_codes_insert_policy ON public.cost_codes
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY cost_codes_update_policy ON public.cost_codes
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY cost_codes_delete_policy ON public.cost_codes
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_select_policy ON public.trades
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY trades_insert_policy ON public.trades
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY trades_update_policy ON public.trades
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY trades_delete_policy ON public.trades
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budget_lines_select_policy ON public.project_budget_lines
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_budget_lines_insert_policy ON public.project_budget_lines
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY project_budget_lines_update_policy ON public.project_budget_lines
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY project_budget_lines_delete_policy ON public.project_budget_lines
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY estimates_select_policy ON public.estimates
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY estimates_insert_policy ON public.estimates
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY estimates_update_policy ON public.estimates
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY estimates_delete_policy ON public.estimates
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY estimate_items_select_policy ON public.estimate_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY estimate_items_insert_policy ON public.estimate_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY estimate_items_update_policy ON public.estimate_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY estimate_items_delete_policy ON public.estimate_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_policy ON public.invoices
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY invoices_insert_policy ON public.invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY invoices_update_policy ON public.invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY invoices_delete_policy ON public.invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_items_select_policy ON public.invoice_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY invoice_items_insert_policy ON public.invoice_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY invoice_items_update_policy ON public.invoice_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY invoice_items_delete_policy ON public.invoice_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY bid_packages_select_policy ON public.bid_packages
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY bid_packages_insert_policy ON public.bid_packages
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY bid_packages_update_policy ON public.bid_packages
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY bid_packages_delete_policy ON public.bid_packages
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY bid_invitations_select_policy ON public.bid_invitations
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY bid_invitations_insert_policy ON public.bid_invitations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY bid_invitations_update_policy ON public.bid_invitations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY bid_invitations_delete_policy ON public.bid_invitations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budgets_select_policy ON public.project_budgets
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_budgets_insert_policy ON public.project_budgets
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY project_budgets_update_policy ON public.project_budgets
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY project_budgets_delete_policy ON public.project_budgets
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_todos_select_policy ON public.project_todos
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_todos_insert_policy ON public.project_todos
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY project_todos_update_policy ON public.project_todos
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY project_todos_delete_policy ON public.project_todos
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_select_policy ON public.proposals
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposals_insert_policy ON public.proposals
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposals_update_policy ON public.proposals
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposals_delete_policy ON public.proposals
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_sections_select_policy ON public.proposal_sections
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposal_sections_insert_policy ON public.proposal_sections
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposal_sections_update_policy ON public.proposal_sections
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposal_sections_delete_policy ON public.proposal_sections
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_section_items_select_policy ON public.proposal_section_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposal_section_items_insert_policy ON public.proposal_section_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposal_section_items_update_policy ON public.proposal_section_items
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposal_section_items_delete_policy ON public.proposal_section_items
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_contracts_select_policy ON public.sub_contracts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_contracts_insert_policy ON public.sub_contracts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_contracts_update_policy ON public.sub_contracts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_contracts_delete_policy ON public.sub_contracts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_invoices_select_policy ON public.sub_invoices
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_invoices_insert_policy ON public.sub_invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY sub_invoices_update_policy ON public.sub_invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY sub_invoices_delete_policy ON public.sub_invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_bids_select_policy ON public.sub_bids
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_bids_insert_policy ON public.sub_bids
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_bids_update_policy ON public.sub_bids
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_bids_delete_policy ON public.sub_bids
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_log_allocations_select_policy ON public.time_log_allocations
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY time_log_allocations_insert_policy ON public.time_log_allocations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY time_log_allocations_update_policy ON public.time_log_allocations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY time_log_allocations_delete_policy ON public.time_log_allocations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_card_jobs_select_policy ON public.day_card_jobs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY day_card_jobs_insert_policy ON public.day_card_jobs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY day_card_jobs_update_policy ON public.day_card_jobs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY day_card_jobs_delete_policy ON public.day_card_jobs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.archived_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY archived_daily_logs_select_policy ON public.archived_daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY archived_daily_logs_insert_policy ON public.archived_daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY archived_daily_logs_update_policy ON public.archived_daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY archived_daily_logs_delete_policy ON public.archived_daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.schedule_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_modifications_select_policy ON public.schedule_modifications
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY schedule_modifications_insert_policy ON public.schedule_modifications
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY schedule_modifications_update_policy ON public.schedule_modifications
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY schedule_modifications_delete_policy ON public.schedule_modifications
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_scheduled_shifts_select_policy ON public.sub_scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_scheduled_shifts_insert_policy ON public.sub_scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_scheduled_shifts_update_policy ON public.sub_scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_scheduled_shifts_delete_policy ON public.sub_scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_payments_select_policy ON public.sub_payments
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_payments_insert_policy ON public.sub_payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY sub_payments_update_policy ON public.sub_payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY sub_payments_delete_policy ON public.sub_payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_compliance_documents_select_policy ON public.sub_compliance_documents
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_compliance_documents_insert_policy ON public.sub_compliance_documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_compliance_documents_update_policy ON public.sub_compliance_documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_compliance_documents_delete_policy ON public.sub_compliance_documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());