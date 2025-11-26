import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Cost {
  id: string;
  project_id: string;
  company_id: string | null;
  vendor_type: 'sub' | 'supplier' | 'other' | null;
  vendor_id: string | null;
  description: string;
  cost_code_id: string | null;
  /**
   * Canonical non-labor cost categories.
   * Note: labor is generally tracked via time_logs,
   * but we keep 'labor' here for backward compatibility.
   */
  category: 'labor' | 'subs' | 'materials' | 'equipment' | 'misc';
  amount: number;
  date_incurred: string;
  status: 'unpaid' | 'paid';
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CostFilters {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  category?: string;
  vendorType?: string;
  projectId?: string;
  status?: string;
}

export function useCosts(filters?: CostFilters) {
  return useQuery({
    queryKey: ['costs', filters],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select(`
          *,
          projects (
            id,
            project_name,
            company_id,
            companies (
              id,
              name
            )
          ),
          cost_codes (
            id,
            code,
            name
          ),
          subs (
            id,
            company_name
          )
        `)
        .order('date_incurred', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date_incurred', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date_incurred', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.vendorType) {
        query = query.eq('vendor_type', filters.vendorType);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Company filter is applied in JS because company_id lives on projects
      let results = data || [];
      if (filters?.companyId) {
        results = results.filter((cost: any) =>
          cost.projects?.company_id === filters.companyId
        );
      }

      return results;
    },
  });
}

export function useCreateCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cost: Omit<Cost, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('costs')
        .insert(cost)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // AP-level views
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      queryClient.invalidateQueries({ queryKey: ['costs-summary'] });
      queryClient.invalidateQueries({ queryKey: ['job-costing'] });
      // Project-level financial views (ledger, summary, etc.)
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger'] });
    },
  });
}

export function useUpdateCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Cost> }) => {
      const { data, error } = await supabase
        .from('costs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      queryClient.invalidateQueries({ queryKey: ['costs-summary'] });
      queryClient.invalidateQueries({ queryKey: ['job-costing'] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger'] });
    },
  });
}

export function useDeleteCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      queryClient.invalidateQueries({ queryKey: ['costs-summary'] });
      queryClient.invalidateQueries({ queryKey: ['job-costing'] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger'] });
    },
  });
}

// Cost summary aggregations (for dashboards, filters, etc.)
export function useCostsSummary(filters?: CostFilters) {
  return useQuery({
    queryKey: ['costs-summary', filters],
    queryFn: async () => {
      // Build query with proper join for company filtering
      let query = supabase
        .from('costs')
        .select(
          `
          amount,
          status,
          category,
          date_incurred,
          project_id,
          projects!inner (
            company_id
          )
        `
        );

      if (filters?.startDate) {
        query = query.gte('date_incurred', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date_incurred', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.companyId) {
        query = query.eq('projects.company_id', filters.companyId);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const costs = data || [];

      // Single-pass aggregation
      let totalCosts = 0;
      let unpaidCosts = 0;
      let paidCosts = 0;
      const byCategory = {
        labor: 0,
        subs: 0,
        materials: 0,
        equipment: 0,
        misc: 0,
      };

      costs.forEach((c: any) => {
        const amount = c.amount || 0;
        totalCosts += amount;

        if (c.status === 'unpaid') unpaidCosts += amount;
        else if (c.status === 'paid') paidCosts += amount;

        if (c.category === 'labor') byCategory.labor += amount;
        else if (c.category === 'subs') byCategory.subs += amount;
        else if (c.category === 'materials') byCategory.materials += amount;
        else if (c.category === 'equipment') byCategory.equipment += amount;
        else if (c.category === 'misc') byCategory.misc += amount;
      });

      return {
        totalCosts,
        unpaidCosts,
        paidCosts,
        byCategory,
      };
    },
  });
}
