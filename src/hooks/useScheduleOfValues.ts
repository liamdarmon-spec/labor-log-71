// NOTE: DEPRECATED — Schedule of Values (SOV) logic is being phased out. Do not build on this.
// Use Budget, Costs, and Billing modules for all financial workflows instead.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export interface SOVItem {
  id: string;
  project_id: string;
  item_number: string | null;
  description: string;
  scheduled_value: number;
  previously_completed: number;
  this_period_completed: number;
  materials_stored: number;
  total_completed: number;
  percent_complete: number;
  balance_to_finish: number;
  retention_percent: number;
  cost_code_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useSOVItems(projectId: string) {
  return useQuery({
    queryKey: ['sov-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_of_values')
        .select(`
          *,
          cost_codes(code, name)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSOVItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<SOVItem> & { project_id: string; description: string }) => {
      const { data, error } = await supabase
        .from('schedule_of_values')
        .insert([item as any])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create SOV item');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', data.project_id] });
      toast.success('SOV item created');
    },
    onError: (error) => {
      console.error('Error creating SOV item:', error);
      toast.error('Failed to create SOV item');
    },
  });
}

export function useUpdateSOVItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: Partial<SOVItem> & { id: string; projectId: string }) => {
      // Calculate derived fields
      const calculated: any = { ...updates };
      
      if (updates.this_period_completed !== undefined || updates.previously_completed !== undefined) {
        const prev = updates.previously_completed ?? 0;
        const current = updates.this_period_completed ?? 0;
        calculated.total_completed = prev + current;
      }

      if (calculated.total_completed !== undefined && updates.scheduled_value !== undefined) {
        calculated.percent_complete = updates.scheduled_value > 0 
          ? (calculated.total_completed / updates.scheduled_value) * 100 
          : 0;
        calculated.balance_to_finish = updates.scheduled_value - calculated.total_completed;
      }

      const { data, error } = await supabase
        .from('schedule_of_values')
        .update(calculated)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('SOV item not found');
      }
      return { data, projectId };
    },
    onSuccess: ({ data, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
    },
    onError: (error) => {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    },
  });
}

export function useGenerateSOVFromEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, estimateId }: { projectId: string; estimateId: string }) => {
      // Fetch estimate items
      const { data: estimateItems, error: estimateError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimateId);

      if (estimateError) throw estimateError;

      // Create SOV items from estimate
      const sovItems = estimateItems.map((item, index) => ({
        project_id: projectId,
        item_number: String(index + 1),
        description: item.description,
        scheduled_value: item.line_total,
        previously_completed: 0,
        this_period_completed: 0,
        materials_stored: 0,
        total_completed: 0,
        percent_complete: 0,
        balance_to_finish: item.line_total,
        retention_percent: 10,
        cost_code_id: item.cost_code_id,
        sort_order: index,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from('schedule_of_values')
        .insert(sovItems)
        .select();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
      toast.success('SOV generated from estimate');
    },
    onError: (error) => {
      console.error('Error generating SOV:', error);
      toast.error('Failed to generate SOV');
    },
  });
}

export interface CustomerPayment {
  id: string;
  project_id: string;
  invoice_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  applied_to_retention: number;
}

export function useCustomerPayments(projectId: string) {
  return useQuery({
    queryKey: ['customer-payments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          invoices(invoice_number, total_amount)
        `)
        .eq('project_id', projectId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Partial<CustomerPayment> & { project_id: string; amount: number }) => {
      const { data, error } = await supabase
        .from('customer_payments')
        .insert([payment as any])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create customer payment');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-financials-snapshot', data.project_id] });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    },
  });
}
