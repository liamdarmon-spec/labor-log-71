--
-- Name: bid_invitations Anyone can delete bid invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);


--
-- Name: bid_packages Anyone can delete bid packages; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);


--
-- Name: project_budget_lines Anyone can delete budget lines; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete budget lines" ON public.project_budget_lines FOR DELETE USING (true);


--
-- Name: cost_codes Anyone can delete cost codes; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes FOR DELETE USING (true);


--
-- Name: day_card_jobs Anyone can delete day card jobs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete day card jobs" ON public.day_card_jobs FOR DELETE USING (true);


--
-- Name: day_cards Anyone can delete day cards; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete day cards" ON public.day_cards FOR DELETE USING (true);


--
-- Name: documents Anyone can delete documents; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);


--
-- Name: estimate_items Anyone can delete estimate items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete estimate items" ON public.estimate_items FOR DELETE USING (true);


--
-- Name: estimates Anyone can delete estimates; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete estimates" ON public.estimates FOR DELETE USING (true);


--
-- Name: invoice_items Anyone can delete invoice items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete invoice items" ON public.invoice_items FOR DELETE USING (true);


--
-- Name: invoices Anyone can delete invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);


--
-- Name: material_receipts Anyone can delete material receipts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);


--
-- Name: project_budgets Anyone can delete project budgets; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);


--
-- Name: project_subcontracts Anyone can delete project subcontracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);


--
-- Name: proposal_line_groups Anyone can delete proposal line groups; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);


--
-- Name: proposal_line_overrides Anyone can delete proposal line overrides; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);


--
-- Name: proposal_section_items Anyone can delete proposal section items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);


--
-- Name: proposal_sections Anyone can delete proposal sections; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);


--
-- Name: proposals Anyone can delete proposals; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);


--
-- Name: sub_bids Anyone can delete sub bids; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);


--
-- Name: sub_compliance_documents Anyone can delete sub compliance; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub compliance" ON public.sub_compliance_documents FOR DELETE USING (true);


--
-- Name: sub_contracts Anyone can delete sub contracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);


--
-- Name: sub_invoices Anyone can delete sub invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);


--
-- Name: sub_logs Anyone can delete sub logs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);


--
-- Name: sub_payments Anyone can delete sub payments; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub payments" ON public.sub_payments FOR DELETE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can delete sub schedules; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete sub schedules" ON public.sub_scheduled_shifts FOR DELETE USING (true);


--
-- Name: subs Anyone can delete subs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);


--
-- Name: time_log_allocations Anyone can delete time log allocations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete time log allocations" ON public.time_log_allocations FOR DELETE USING (true);


--
-- Name: project_todos Anyone can delete todos; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can delete todos" ON public.project_todos FOR DELETE USING (true);


--
-- Name: activity_log Anyone can insert activity log; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);


--
-- Name: bid_invitations Anyone can insert bid invitations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);


--
-- Name: bid_packages Anyone can insert bid packages; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);


--
-- Name: project_budget_lines Anyone can insert budget lines; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert budget lines" ON public.project_budget_lines FOR INSERT WITH CHECK (true);


--
-- Name: cost_codes Anyone can insert cost codes; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes FOR INSERT WITH CHECK (true);


--
-- Name: day_card_jobs Anyone can insert day card jobs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert day card jobs" ON public.day_card_jobs FOR INSERT WITH CHECK (true);


--
-- Name: day_cards Anyone can insert day cards; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert day cards" ON public.day_cards FOR INSERT WITH CHECK (true);


--
-- Name: documents Anyone can insert documents; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);


--
-- Name: estimate_items Anyone can insert estimate items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert estimate items" ON public.estimate_items FOR INSERT WITH CHECK (true);


--
-- Name: estimates Anyone can insert estimates; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert estimates" ON public.estimates FOR INSERT WITH CHECK (true);


--
-- Name: invoice_items Anyone can insert invoice items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);


--
-- Name: invoices Anyone can insert invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);


--
-- Name: material_receipts Anyone can insert material receipts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);


--
-- Name: project_budgets Anyone can insert project budgets; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);


--
-- Name: project_subcontracts Anyone can insert project subcontracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);


--
-- Name: proposal_line_groups Anyone can insert proposal line groups; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);


--
-- Name: proposal_line_overrides Anyone can insert proposal line overrides; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);


--
-- Name: proposal_section_items Anyone can insert proposal section items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);


--
-- Name: proposal_sections Anyone can insert proposal sections; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);


--
-- Name: proposals Anyone can insert proposals; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);


--
-- Name: sub_bids Anyone can insert sub bids; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);


--
-- Name: sub_compliance_documents Anyone can insert sub compliance; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub compliance" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);


--
-- Name: sub_contracts Anyone can insert sub contracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);


--
-- Name: sub_invoices Anyone can insert sub invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);


--
-- Name: sub_logs Anyone can insert sub logs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);


--
-- Name: sub_payments Anyone can insert sub payments; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub payments" ON public.sub_payments FOR INSERT WITH CHECK (true);


--
-- Name: sub_scheduled_shifts Anyone can insert sub schedules; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert sub schedules" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);


--
-- Name: subs Anyone can insert subs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);


--
-- Name: time_log_allocations Anyone can insert time log allocations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert time log allocations" ON public.time_log_allocations FOR INSERT WITH CHECK (true);


--
-- Name: project_todos Anyone can insert todos; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can insert todos" ON public.project_todos FOR INSERT WITH CHECK (true);


--
-- Name: bid_invitations Anyone can update bid invitations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);


--
-- Name: bid_packages Anyone can update bid packages; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);


--
-- Name: project_budget_lines Anyone can update budget lines; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update budget lines" ON public.project_budget_lines FOR UPDATE USING (true);


--
-- Name: cost_codes Anyone can update cost codes; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update cost codes" ON public.cost_codes FOR UPDATE USING (true);


--
-- Name: day_card_jobs Anyone can update day card jobs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update day card jobs" ON public.day_card_jobs FOR UPDATE USING (true);


--
-- Name: day_cards Anyone can update day cards; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update day cards" ON public.day_cards FOR UPDATE USING (true);


--
-- Name: documents Anyone can update documents; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);


--
-- Name: estimate_items Anyone can update estimate items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update estimate items" ON public.estimate_items FOR UPDATE USING (true);


--
-- Name: estimates Anyone can update estimates; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update estimates" ON public.estimates FOR UPDATE USING (true);


--
-- Name: invoice_items Anyone can update invoice items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update invoice items" ON public.invoice_items FOR UPDATE USING (true);


--
-- Name: invoices Anyone can update invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);


--
-- Name: material_receipts Anyone can update material receipts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);


--
-- Name: project_budgets Anyone can update project budgets; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);


--
-- Name: project_subcontracts Anyone can update project subcontracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);


--
-- Name: proposal_line_groups Anyone can update proposal line groups; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);


--
-- Name: proposal_line_overrides Anyone can update proposal line overrides; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);


--
-- Name: proposal_section_items Anyone can update proposal section items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);


--
-- Name: proposal_sections Anyone can update proposal sections; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);


--
-- Name: proposals Anyone can update proposals; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);


--
-- Name: sub_bids Anyone can update sub bids; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);


--
-- Name: sub_compliance_documents Anyone can update sub compliance; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub compliance" ON public.sub_compliance_documents FOR UPDATE USING (true);


--
-- Name: sub_contracts Anyone can update sub contracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);


--
-- Name: sub_invoices Anyone can update sub invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);


--
-- Name: sub_logs Anyone can update sub logs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);


--
-- Name: sub_payments Anyone can update sub payments; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub payments" ON public.sub_payments FOR UPDATE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can update sub schedules; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update sub schedules" ON public.sub_scheduled_shifts FOR UPDATE USING (true);


--
-- Name: subs Anyone can update subs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);


--
-- Name: time_log_allocations Anyone can update time log allocations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update time log allocations" ON public.time_log_allocations FOR UPDATE USING (true);


--
-- Name: project_todos Anyone can update todos; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can update todos" ON public.project_todos FOR UPDATE USING (true);


--
-- Name: activity_log Anyone can view activity log; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view activity log" ON public.activity_log FOR SELECT USING (true);


--
-- Name: bid_invitations Anyone can view bid invitations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);


--
-- Name: bid_packages Anyone can view bid packages; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);


--
-- Name: project_budget_lines Anyone can view budget lines; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view budget lines" ON public.project_budget_lines FOR SELECT USING (true);


--
-- Name: cost_codes Anyone can view cost codes; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view cost codes" ON public.cost_codes FOR SELECT USING (true);


--
-- Name: day_card_jobs Anyone can view day card jobs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view day card jobs" ON public.day_card_jobs FOR SELECT USING (true);


--
-- Name: day_cards Anyone can view day cards; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view day cards" ON public.day_cards FOR SELECT USING (true);


--
-- Name: documents Anyone can view documents; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);


--
-- Name: estimate_items Anyone can view estimate items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view estimate items" ON public.estimate_items FOR SELECT USING (true);


--
-- Name: estimates Anyone can view estimates; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view estimates" ON public.estimates FOR SELECT USING (true);


--
-- Name: invoice_items Anyone can view invoice items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view invoice items" ON public.invoice_items FOR SELECT USING (true);


--
-- Name: invoices Anyone can view invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);


--
-- Name: material_receipts Anyone can view material receipts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);


--
-- Name: project_budgets Anyone can view project budgets; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);


--
-- Name: project_subcontracts Anyone can view project subcontracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);


--
-- Name: proposal_line_groups Anyone can view proposal line groups; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);


--
-- Name: proposal_line_overrides Anyone can view proposal line overrides; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);


--
-- Name: proposal_section_items Anyone can view proposal section items; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);


--
-- Name: proposal_sections Anyone can view proposal sections; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);


--
-- Name: proposals Anyone can view proposals; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);


--
-- Name: sub_bids Anyone can view sub bids; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);


--
-- Name: sub_compliance_documents Anyone can view sub compliance; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub compliance" ON public.sub_compliance_documents FOR SELECT USING (true);


--
-- Name: sub_contracts Anyone can view sub contracts; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);


--
-- Name: sub_invoices Anyone can view sub invoices; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);


--
-- Name: sub_logs Anyone can view sub logs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);


--
-- Name: sub_payments Anyone can view sub payments; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub payments" ON public.sub_payments FOR SELECT USING (true);


--
-- Name: sub_scheduled_shifts Anyone can view sub schedules; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view sub schedules" ON public.sub_scheduled_shifts FOR SELECT USING (true);


--
-- Name: subs Anyone can view subs; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);


--
-- Name: time_log_allocations Anyone can view time log allocations; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view time log allocations" ON public.time_log_allocations FOR SELECT USING (true);


--
-- Name: project_todos Anyone can view todos; Type: POLICY; Schema: public; Owner: -

--

CREATE POLICY "Anyone can view todos" ON public.project_todos FOR SELECT USING (true);


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_invitations; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_packages; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: cost_codes; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: day_card_jobs; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: day_cards; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: estimate_items; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

--
-- Name: estimates; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: material_receipts; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budget_lines; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budgets; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: project_subcontracts; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_todos; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_line_groups; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_line_overrides; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_section_items; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_sections; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_bids; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_compliance_documents; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_contracts; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_invoices; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_logs; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_payments; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_scheduled_shifts; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: subs; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

--
-- Name: time_log_allocations; Type: ROW SECURITY; Schema: public; Owner: -

--

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- =============================================================================
-- STRICT RLS POLICIES FOR ALL TENANT TABLES
-- =============================================================================

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_policy ON public.projects;

CREATE POLICY projects_select_policy ON public.projects
  FOR SELECT
  USING (public.is_company_member(company_id));


-- RLS for day_cards
ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_cards FORCE ROW LEVEL SECURITY;


-- RLS for scheduled_shifts
ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_shifts FORCE ROW LEVEL SECURITY;


-- RLS for daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs FORCE ROW LEVEL SECURITY;


-- RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;


-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;


-- RLS for material_receipts
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;


-- RLS for sub_logs
ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_logs FORCE ROW LEVEL SECURITY;


-- RLS for subs
ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subs FORCE ROW LEVEL SECURITY;


-- RLS for workers
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers FORCE ROW LEVEL SECURITY;


-- RLS for cost_codes
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes FORCE ROW LEVEL SECURITY;


-- RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades FORCE ROW LEVEL SECURITY;


-- RLS for project_budget_lines
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_lines FORCE ROW LEVEL SECURITY;


-- RLS for estimates
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates FORCE ROW LEVEL SECURITY;


-- RLS for estimate_items
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items FORCE ROW LEVEL SECURITY;


-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;


-- RLS for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;


-- RLS for bid_packages
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_packages FORCE ROW LEVEL SECURITY;


-- RLS for bid_invitations
ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitations FORCE ROW LEVEL SECURITY;


-- RLS for project_budgets
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets FORCE ROW LEVEL SECURITY;


-- RLS for project_todos
ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todos FORCE ROW LEVEL SECURITY;


-- RLS for proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;


-- RLS for proposal_sections
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections FORCE ROW LEVEL SECURITY;


-- RLS for proposal_section_items
ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_section_items FORCE ROW LEVEL SECURITY;


-- RLS for sub_contracts
ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_contracts FORCE ROW LEVEL SECURITY;


-- RLS for sub_invoices
ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_invoices FORCE ROW LEVEL SECURITY;


-- RLS for sub_bids
ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_bids FORCE ROW LEVEL SECURITY;


-- RLS for time_log_allocations
ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_log_allocations FORCE ROW LEVEL SECURITY;


-- RLS for day_card_jobs
ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_card_jobs FORCE ROW LEVEL SECURITY;


-- RLS for archived_daily_logs
ALTER TABLE public.archived_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_daily_logs FORCE ROW LEVEL SECURITY;


-- RLS for schedule_modifications
ALTER TABLE public.schedule_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_modifications FORCE ROW LEVEL SECURITY;


-- RLS for sub_scheduled_shifts
ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_scheduled_shifts FORCE ROW LEVEL SECURITY;


-- RLS for sub_payments
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payments FORCE ROW LEVEL SECURITY;


-- RLS for sub_compliance_documents
ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_compliance_documents FORCE ROW LEVEL SECURITY;


-- RLS for material_receipts
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;
