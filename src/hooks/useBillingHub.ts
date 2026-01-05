// src/hooks/useBillingHub.ts
// Billing Hub hooks for Contract, Change Orders, SOV, Invoices, Payments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { toast } from 'sonner';

/** Convert empty string to null for UUID fields */
function emptyToNull(val: string | undefined | null): string | null {
  return val && val.trim() !== '' ? val : null;
}

// ============================================================
// BILLING SUMMARY (uses DB function)
// ============================================================

export interface BillingSummary {
  base_contract_value: number;
  approved_change_orders: number;
  contract_value: number;
  invoiced_total: number;
  paid_total: number;
  outstanding_balance: number;
  balance_to_finish: number;
  retention_held: number;
  has_base_proposal: boolean;
  change_order_count: number;
  invoice_count: number;
  payment_count: number;
  last_invoice_date: string | null;
  last_payment_date: string | null;
}

export function useBillingSummary(projectId: string) {
  return useQuery({
    queryKey: ['billing-summary', projectId],
    enabled: !!projectId,
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
// SOV ITEMS
// ============================================================

export interface SOVItem {
  id: string;
  project_id: string;
  company_id: string;
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
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
    },
    onError: (error) => {
      console.error('SOV update error:', error);
      toast.error(`Failed to update SOV item: ${error.message}`);
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
  change_order_number: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_at: string | null;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
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
          ...co,
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
      console.error('Change order create error:', error);
      toast.error(`Failed to create change order: ${error.message}`);
    },
  });
}

export function useUpdateChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('Change order updated');
    },
    onError: (error) => {
      console.error('Change order update error:', error);
      toast.error(`Failed to update change order: ${error.message}`);
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

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (invoice: {
      project_id: string;
      invoice_number?: string;
      issue_date?: string;
      due_date?: string;
      subtotal_amount?: number;
      tax_amount?: number;
      total_amount?: number;
      retention_percent?: number;
      notes?: string;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          company_id: activeCompanyId,
          invoice_number: invoice.invoice_number ?? '',
          issue_date: invoice.issue_date ?? new Date().toISOString().split('T')[0],
          subtotal_amount: invoice.subtotal_amount ?? 0,
          tax_amount: invoice.tax_amount ?? 0,
          total_amount: invoice.total_amount ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('Invoice created');
    },
    onError: (error) => {
      console.error('Invoice create error:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

// ============================================================
// PAYMENT APPLICATIONS (PAY APPS)
// ============================================================

export interface PaymentApplication {
  id: string;
  project_id: string;
  company_id: string;
  application_number: number;
  application_date: string;
  period_from: string | null;
  period_to: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  scheduled_value: number;
  previous_applications: number;
  this_period: number;
  materials_stored: number;
  total_completed: number;
  percent_complete: number;
  balance_to_finish: number;
  retention_percent: number;
  retention_held: number;
  retention_released: number;
  gross_amount: number;
  less_retention: number;
  less_previous_certificates: number;
  current_payment_due: number;
  invoice_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentApplications(projectId: string) {
  return useQuery({
    queryKey: ['payment-applications', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false });

      if (error) throw error;
      return data as PaymentApplication[];
    },
  });
}

export function useCreatePaymentApplication() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (payApp: {
      project_id: string;
      application_date?: string;
      period_from?: string;
      period_to?: string;
      scheduled_value?: number;
      previous_applications?: number;
      this_period?: number;
      materials_stored?: number;
      retention_percent?: number;
    }) => {
      if (!activeCompanyId) throw new Error('No active company selected');

      // Calculate derived fields
      const scheduled = payApp.scheduled_value ?? 0;
      const previous = payApp.previous_applications ?? 0;
      const thisPeriod = payApp.this_period ?? 0;
      const stored = payApp.materials_stored ?? 0;
      const retentionPct = payApp.retention_percent ?? 10;

      const totalCompleted = previous + thisPeriod + stored;
      const percentComplete = scheduled > 0 ? (totalCompleted / scheduled) * 100 : 0;
      const balanceToFinish = scheduled - totalCompleted;
      const grossAmount = thisPeriod + stored;
      const lessRetention = grossAmount * (retentionPct / 100);
      const currentPaymentDue = grossAmount - lessRetention;

      const { data, error } = await supabase
        .from('payment_applications')
        .insert({
          project_id: payApp.project_id,
          company_id: activeCompanyId,
          application_date: payApp.application_date ?? new Date().toISOString().split('T')[0],
          period_from: payApp.period_from ?? null,
          period_to: payApp.period_to ?? null,
          scheduled_value: scheduled,
          previous_applications: previous,
          this_period: thisPeriod,
          materials_stored: stored,
          total_completed: totalCompleted,
          percent_complete: percentComplete,
          balance_to_finish: balanceToFinish,
          retention_percent: retentionPct,
          retention_held: lessRetention,
          gross_amount: grossAmount,
          less_retention: lessRetention,
          less_previous_certificates: previous,
          current_payment_due: currentPaymentDue,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-applications', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary', data.project_id] });
      toast.success('Payment application created');
    },
    onError: (error) => {
      console.error('Pay app create error:', error);
      toast.error(`Failed to create payment application: ${error.message}`);
    },
  });
}

// ============================================================
// CUSTOMER PAYMENTS (re-export from project financials)
// ============================================================

export { useCustomerPayments, useCreateCustomerPayment } from './useProjectFinancials';

