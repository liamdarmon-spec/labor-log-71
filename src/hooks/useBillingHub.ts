// src/hooks/useBillingHub.ts
// Billing Hub hooks - CANONICAL data access layer
// Big 3 Aligned:
// 1. CANONICAL: All billing totals come from get_project_billing_summary
// 2. SECURITY: All queries respect RLS via authenticated session
// 3. PERFORMANCE: Single function call for summary, minimal queries

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { toast } from 'sonner';

/** Convert empty string to null for UUID fields */
function emptyToNull(val: string | undefined | null): string | null {
  return val && val.trim() !== '' ? val : null;
}

// ============================================================
// CANONICAL BILLING SUMMARY - Single Source of Truth
// Frontend does ZERO math - all from DB function
// ============================================================

export interface BillingSummary {
  // Contract baseline info
  has_contract_baseline: boolean;
  contract_baseline_id: string | null;
  billing_basis: 'payment_schedule' | 'sov' | null;
  
  // Contract totals
  base_contract_total: number;
  approved_change_order_total: number;
  current_contract_total: number;
  
  // Change order counts
  pending_change_order_count: number;
  approved_change_order_count: number;
  pending_change_order_value: number;
  
  // Billing progress
  billed_to_date: number;
  paid_to_date: number;
  open_ar: number;
  remaining_to_bill: number;
  retention_held: number;
  
  // Counts
  invoice_count: number;
  payment_count: number;
  
  // Proposal info
  has_base_proposal: boolean;
  base_proposal_id: string | null;
  base_proposal_total: number;
}

export function useBillingSummary(projectId: string) {
  return useQuery({
    queryKey: ['billing-summary', projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async (): Promise<BillingSummary | null> => {
      const { data, error } = await supabase
        .rpc('get_project_billing_summary', { p_project_id: projectId })
        .single();

      if (error) {
        console.error('Billing summary error:', error);
        throw error;
      }

      return data as BillingSummary;
    },
  });
}

// ============================================================
// BILLING LINES (Milestones or SOV)
// ============================================================

export interface BillingLine {
  billing_basis: 'payment_schedule' | 'sov';
  line_id: string;
  line_name: string;
  scheduled_amount: number;
  invoiced_amount: number;
  paid_amount: number;
  remaining_amount: number;
  percent_complete: number;
  sort_order: number;
}

export function useBillingLines(projectId: string) {
  return useQuery({
    queryKey: ['billing-lines', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_contract_billing_lines', { p_project_id: projectId });

      if (error) throw error;
      return (data || []) as BillingLine[];
    },
  });
}

// ============================================================
// CONTRACT BASELINE
// ============================================================

export interface ContractBaseline {
  id: string;
  company_id: string;
  project_id: string;
  accepted_proposal_id: string;
  billing_basis: 'payment_schedule' | 'sov';
  base_contract_total: number;
  approved_change_order_total: number;
  current_contract_total: number;
  created_at: string;
}

export function useContractBaseline(projectId: string) {
  return useQuery({
    queryKey: ['contract-baseline', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_baselines')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as ContractBaseline | null;
    },
  });
}

export function useAcceptProposalCreateBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: string;
      projectId: string;
      acceptedByName?: string;
      acceptedByEmail?: string;
    }) => {
      const { data, error } = await supabase.rpc('accept_proposal_create_baseline', {
        p_proposal_id: params.proposalId,
        p_accepted_by_name: params.acceptedByName ?? null,
        p_accepted_by_email: params.acceptedByEmail ?? null,
      });

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-baseline', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-lines', data.projectId] });
      toast.success(`Contract baseline created (${data.billing_basis})`);
    },
    onError: (error) => {
      console.error('Create baseline error:', error);
      toast.error(`Failed to create baseline: ${error.message}`);
    },
  });
}

// ============================================================
// CHANGE ORDERS
// ============================================================

export interface ChangeOrder {
  id: string;
  project_id: string;
  company_id: string;
  contract_baseline_id: string | null;
  change_order_number: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'void';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  sent_at: string | null;
  approved_at: string | null;
  pdf_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['change-orders', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangeOrder[];
    },
  });
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (co: {
      project_id: string;
      title: string;
      description?: string;
      subtotal_amount?: number;
      tax_amount?: number;
      total_amount?: number;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      const { data, error } = await supabase
        .from('change_orders')
        .insert({
          project_id: co.project_id,
          title: co.title,
          description: co.description ?? null,
          company_id: activeCompanyId,
          status: 'draft',
          subtotal_amount: co.subtotal_amount ?? 0,
          tax_amount: co.tax_amount ?? 0,
          total_amount: co.total_amount ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('Change order created');
    },
    onError: (error) => {
      console.error('CO create error:', error);
      toast.error(`Failed to create change order: ${error.message}`);
    },
  });
}

export function useApproveChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      changeOrderId: string;
      projectId: string;
      approvedByName?: string;
    }) => {
      const { data, error } = await supabase.rpc('approve_change_order', {
        p_change_order_id: params.changeOrderId,
        p_approved_by_name: params.approvedByName ?? null,
      });

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['contract-baseline', data.projectId] });
      toast.success('Change order approved - contract value updated');
    },
    onError: (error) => {
      console.error('CO approve error:', error);
      toast.error(`Failed to approve change order: ${error.message}`);
    },
  });
}

export function useSendChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { changeOrderId: string; projectId: string }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', params.changeOrderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.projectId] });
      toast.success('Change order sent');
    },
    onError: (error) => {
      console.error('CO send error:', error);
      toast.error(`Failed to send change order: ${error.message}`);
    },
  });
}

export function useRejectChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { changeOrderId: string; projectId: string }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ status: 'rejected' })
        .eq('id', params.changeOrderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      toast.success('Change order rejected');
    },
    onError: (error) => {
      console.error('CO reject error:', error);
      toast.error(`Failed to reject change order: ${error.message}`);
    },
  });
}

// ============================================================
// INVOICES
// ============================================================

export interface Invoice {
  id: string;
  project_id: string;
  company_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void';
  issue_date: string;
  due_date: string | null;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  retention_percent: number;
  retention_amount: number;
  source_type: 'proposal' | 'payment_schedule' | 'manual' | null;
  sov_based: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvoices(projectId: string) {
  return useQuery({
    queryKey: ['invoices', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });
}

export function useCreateInvoiceFromMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      milestoneAllocations: Array<{ milestone_id: string; amount: number }>;
    }) => {
      const { data, error } = await supabase.rpc('create_invoice_from_milestones', {
        p_project_id: params.projectId,
        p_milestone_allocations: params.milestoneAllocations,
      });

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-lines', data.projectId] });
      toast.success('Invoice created from milestones');
    },
    onError: (error) => {
      console.error('Create invoice error:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

export function useCreateInvoiceFromSOV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      sovLines: Array<{ sov_line_id: string; this_period_amount: number }>;
    }) => {
      const { data, error } = await supabase.rpc('create_invoice_from_sov', {
        p_project_id: params.projectId,
        p_sov_lines: params.sovLines,
      });

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-lines', data.projectId] });
      toast.success('Pay application invoice created');
    },
    onError: (error) => {
      console.error('Create SOV invoice error:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

// ============================================================
// CUSTOMER PAYMENTS
// ============================================================

export function useCustomerPayments(projectId: string) {
  return useQuery({
    queryKey: ['customer-payments', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      project_id: string;
      amount: number;
      payment_method: string;
      reference_number?: string;
      notes?: string;
      payment_date: string;
      applied_to_retention?: number;
    }) => {
      const { data, error } = await supabase
        .from('customer_payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', variables.project_id] });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      console.error('Payment error:', error);
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

// ============================================================
// PROPOSALS (for baseline creation)
// ============================================================

export interface Proposal {
  id: string;
  project_id: string;
  company_id: string;
  title: string;
  status: string;
  acceptance_status: 'pending' | 'accepted' | 'rejected';
  billing_basis: 'payment_schedule' | 'sov' | null;
  total_amount: number;
  created_at: string;
}

export function useProposals(projectId: string) {
  return useQuery({
    queryKey: ['proposals', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, project_id, company_id, title, status, acceptance_status, billing_basis, total_amount, created_at')
        .eq('project_id', projectId)
        .is('parent_proposal_id', null)  // Only base proposals
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Proposal[];
    },
  });
}

export function useUpdateProposalBillingBasis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: string;
      projectId: string;
      billingBasis: 'payment_schedule' | 'sov';
    }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ billing_basis: params.billingBasis })
        .eq('id', params.proposalId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
      toast.success('Billing basis updated');
    },
    onError: (error) => {
      console.error('Update billing basis error:', error);
      toast.error(`Failed to update billing basis: ${error.message}`);
    },
  });
}
