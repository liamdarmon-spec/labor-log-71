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
  // Contract
  base_contract_value: number;
  approved_change_orders: number;
  contract_value: number;
  has_base_proposal: boolean;
  change_order_count: number;
  
  // SOV
  sov_schedule_id: string | null;
  sov_schedule_status: string | null;
  sov_total: number;
  sov_item_count: number;
  sov_variance: number;
  
  // Billing
  invoiced_total: number;
  paid_total: number;
  outstanding_balance: number;
  balance_to_finish: number;
  retention_held: number;
  
  // Counts & Dates
  invoice_count: number;
  payment_count: number;
  last_invoice_date: string | null;
  last_payment_date: string | null;
}

export function useBillingSummary(projectId: string) {
  return useQuery({
    queryKey: ['billing-summary', projectId],
    enabled: !!projectId,
    staleTime: 30_000, // Cache for 30 seconds
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
// CHANGE ORDERS (proposals with parent_proposal_id)
// ============================================================

export interface ChangeOrder {
  id: string;
  project_id: string;
  company_id: string;
  parent_proposal_id: string;
  proposal_number: string | null;
  title: string;
  status: string;
  acceptance_status: 'pending' | 'accepted' | 'rejected';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  accepted_by_name: string | null;
  acceptance_date: string | null;
}

export function useChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['change-orders', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // COs are proposals where parent_proposal_id IS NOT NULL
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('project_id', projectId)
        .not('parent_proposal_id', 'is', null)
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
      parent_proposal_id: string;
      title: string;
      description?: string;
      subtotal_amount?: number;
      tax_amount?: number;
      total_amount?: number;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          project_id: co.project_id,
          parent_proposal_id: co.parent_proposal_id,
          title: co.title,
          proposal_kind: 'change_order',
          status: 'draft',
          acceptance_status: 'pending',
          company_id: activeCompanyId,
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

export function useAcceptChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: string;
      projectId: string;
      acceptedByName?: string;
      acceptedByEmail?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('accept_change_order', {
        p_proposal_id: params.proposalId,
        p_accepted_by_name: params.acceptedByName ?? null,
        p_accepted_by_email: params.acceptedByEmail ?? null,
        p_notes: params.notes ?? null,
      });

      if (error) throw error;
      return { ...data, projectId: params.projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.projectId] });
      toast.success('Change order accepted - contract value updated');
    },
    onError: (error) => {
      console.error('CO accept error:', error);
      toast.error(`Failed to accept change order: ${error.message}`);
    },
  });
}

export function useRejectChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: string;
      projectId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('reject_change_order', {
        p_proposal_id: params.proposalId,
        p_rejection_notes: params.notes ?? null,
      });

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
// SOV SCHEDULES
// ============================================================

export interface SOVSchedule {
  id: string;
  project_id: string;
  company_id: string;
  base_proposal_id: string | null;
  name: string;
  status: 'draft' | 'active' | 'locked' | 'archived';
  total_scheduled_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSOVSchedule(projectId: string) {
  return useQuery({
    queryKey: ['sov-schedule', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sov_schedules')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['active', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SOVSchedule | null;
    },
  });
}

export function useCreateSOVSchedule() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (schedule: {
      project_id: string;
      name?: string;
      base_proposal_id?: string;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      const { data, error } = await supabase
        .from('sov_schedules')
        .insert({
          project_id: schedule.project_id,
          name: schedule.name ?? 'Schedule of Values',
          base_proposal_id: emptyToNull(schedule.base_proposal_id),
          company_id: activeCompanyId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sov-schedule', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('SOV schedule created');
    },
    onError: (error) => {
      console.error('SOV schedule create error:', error);
      toast.error(`Failed to create SOV schedule: ${error.message}`);
    },
  });
}

// ============================================================
// SOV ITEMS
// ============================================================

export interface SOVItem {
  id: string;
  project_id: string;
  company_id: string;
  sov_schedule_id: string | null;
  proposal_id: string | null;
  change_order_id: string | null;
  cost_code_id: string | null;
  area_label: string | null;
  trade: string | null;
  description: string;
  scheduled_value: number;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  cost_codes?: { code: string; name: string } | null;
}

export function useSOVItems(projectId: string) {
  return useQuery({
    queryKey: ['sov-items', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sov_items')
        .select(`
          *,
          cost_codes(code, name)
        `)
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SOVItem[];
    },
  });
}

export function useCreateSOVItem() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (item: {
      project_id: string;
      description: string;
      scheduled_value?: number;
      sov_schedule_id?: string;
      cost_code_id?: string;
      trade?: string;
      area_label?: string;
      sort_order?: number;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      const { data, error } = await supabase
        .from('sov_items')
        .insert({
          ...item,
          sov_schedule_id: emptyToNull(item.sov_schedule_id),
          cost_code_id: emptyToNull(item.cost_code_id),
          scheduled_value: item.scheduled_value ?? 0,
          company_id: activeCompanyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['sov-schedule', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('SOV item created');
    },
    onError: (error) => {
      console.error('SOV create error:', error);
      toast.error(`Failed to create SOV item: ${error.message}`);
    },
  });
}

export function useUpdateSOVItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SOVItem> & { id: string }) => {
      const cleanedUpdates = {
        ...updates,
        sov_schedule_id: emptyToNull(updates.sov_schedule_id),
        cost_code_id: emptyToNull(updates.cost_code_id),
      };

      const { data, error } = await supabase
        .from('sov_items')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['sov-schedule', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
    },
    onError: (error) => {
      console.error('SOV update error:', error);
      toast.error(`Failed to update SOV item: ${error.message}`);
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

// ============================================================
// PAYMENT SCHEDULES / MILESTONES
// ============================================================

export interface PaymentMilestone {
  id: string;
  project_id: string;
  proposal_id: string | null;
  name: string;
  status: string;
  created_at: string;
  total_amount: number;
  item_count: number;
}

export function usePaymentMilestones(projectId: string) {
  return useQuery({
    queryKey: ['payment-milestones', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_billing_milestones')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data as PaymentMilestone[];
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
// BASE PROPOSAL (for linking COs)
// ============================================================

export function useBaseProposal(projectId: string) {
  return useQuery({
    queryKey: ['base-proposal', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // Base proposal = accepted proposal with no parent
      const { data, error } = await supabase
        .from('proposals')
        .select('id, title, total_amount, acceptance_status')
        .eq('project_id', projectId)
        .is('parent_proposal_id', null)
        .eq('acceptance_status', 'accepted')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
