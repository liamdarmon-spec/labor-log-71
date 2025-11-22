import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectFinancialsSnapshot {
  id: string;
  project_id: string;
  contract_amount: number;
  baseline_budget: number;
  revised_budget: number;
  actual_cost_labor: number;
  actual_cost_subs: number;
  actual_cost_materials: number;
  actual_cost_other: number;
  actual_cost_total: number;
  billed_to_date: number;
  paid_to_date: number;
  retention_held: number;
  open_ar: number;
  open_ap_labor: number;
  open_ap_subs: number;
  profit_amount: number;
  profit_percent: number;
  forecast_at_completion: number;
  last_calculated_at: string;
}

export function useProjectFinancialsSnapshot(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-snapshot', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_financials_snapshot')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProjectFinancialsSnapshot | null;
    },
    enabled: !!projectId,
  });
}

export function useRecalculateProjectFinancials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Fetch all cost data
      const { data: costEntries } = await supabase
        .from('cost_entries')
        .select('*')
        .eq('project_id', projectId);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId);

      const { data: payments } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('project_id', projectId);

      const { data: budget } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      // Calculate totals
      const actual_cost_labor = (costEntries || [])
        .filter(e => e.entry_type === 'labor')
        .reduce((sum, e) => sum + (e.total_cost || 0), 0);

      const actual_cost_subs = (costEntries || [])
        .filter(e => e.entry_type === 'sub')
        .reduce((sum, e) => sum + (e.total_cost || 0), 0);

      const actual_cost_materials = (costEntries || [])
        .filter(e => e.entry_type === 'material')
        .reduce((sum, e) => sum + (e.total_cost || 0), 0);

      const actual_cost_other = (costEntries || [])
        .filter(e => e.entry_type === 'other')
        .reduce((sum, e) => sum + (e.total_cost || 0), 0);

      const actual_cost_total = actual_cost_labor + actual_cost_subs + actual_cost_materials + actual_cost_other;

      const billed_to_date = (invoices || [])
        .filter(i => i.status !== 'draft')
        .reduce((sum, i) => sum + (i.total_amount || 0), 0);

      const paid_to_date = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      const retention_held = (invoices || [])
        .filter(i => i.status !== 'draft')
        .reduce((sum, i) => sum + (i.retention_amount || 0), 0);

      const open_ar = billed_to_date - paid_to_date;

      const baseline_budget = (budget?.labor_budget || 0) + (budget?.subs_budget || 0) + 
                             (budget?.materials_budget || 0) + (budget?.other_budget || 0);

      const revised_budget = baseline_budget; // TODO: Add change order logic

      const profit_amount = billed_to_date - actual_cost_total;
      const profit_percent = billed_to_date > 0 ? (profit_amount / billed_to_date) * 100 : 0;

      const snapshot = {
        project_id: projectId,
        contract_amount: billed_to_date, // TODO: Get from project
        baseline_budget,
        revised_budget,
        actual_cost_labor,
        actual_cost_subs,
        actual_cost_materials,
        actual_cost_other,
        actual_cost_total,
        billed_to_date,
        paid_to_date,
        retention_held,
        open_ar,
        open_ap_labor: 0, // TODO: Calculate from unpaid time logs
        open_ap_subs: 0, // TODO: Calculate from unpaid sub invoices
        profit_amount,
        profit_percent,
        forecast_at_completion: revised_budget,
        last_calculated_at: new Date().toISOString(),
      };

      // Upsert snapshot
      const { data, error } = await supabase
        .from('project_financials_snapshot')
        .upsert([snapshot], { onConflict: 'project_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-financials-snapshot', data.project_id] });
      toast.success('Financial snapshot updated');
    },
    onError: (error) => {
      console.error('Error recalculating financials:', error);
      toast.error('Failed to update financials');
    },
  });
}

export interface CostEntry {
  id: string;
  project_id: string;
  cost_code_id: string | null;
  entry_type: 'labor' | 'sub' | 'material' | 'other';
  entry_date: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  total_cost: number;
  source_type: 'daily_log' | 'sub_invoice' | 'material_receipt' | 'manual' | null;
  source_id: string | null;
  vendor_name: string | null;
  invoice_number: string | null;
  notes: string | null;
}

export function useCostEntries(projectId: string, filters?: {
  entry_type?: string;
  cost_code_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['cost-entries', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('cost_entries')
        .select(`
          *,
          cost_codes(code, name, category)
        `)
        .eq('project_id', projectId)
        .order('entry_date', { ascending: false });

      if (filters?.entry_type) {
        query = query.eq('entry_type', filters.entry_type);
      }
      if (filters?.cost_code_id) {
        query = query.eq('cost_code_id', filters.cost_code_id);
      }
      if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateCostEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Partial<CostEntry> & { project_id: string; entry_type: string; entry_date: string; total_cost: number }) => {
      const { data, error } = await supabase
        .from('cost_entries')
        .insert([entry as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cost-entries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-financials-snapshot', data.project_id] });
      toast.success('Cost entry created');
    },
    onError: (error) => {
      console.error('Error creating cost entry:', error);
      toast.error('Failed to create cost entry');
    },
  });
}

export function useCustomerPayments(projectId: string) {
  return useQuery({
    queryKey: ['customer-payments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*, invoices(invoice_number, total_amount)')
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
    mutationFn: async (payment: any) => {
      const { data, error } = await supabase
        .from('customer_payments')
        .insert([payment])
        .select()
        .single();
      if (error) throw error;
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
