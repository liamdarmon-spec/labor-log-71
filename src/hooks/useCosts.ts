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
  category: 'labor' | 'subs' | 'materials' | 'misc';
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
          projects (id, project_name, company_id, companies (id, name)),
          cost_codes (id, code, name),
          subs (id, company_name)
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

      // Apply company filter in JS if needed (since company_id is on projects)
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
      queryClient.invalidateQueries({ queryKey: ['costs'] });
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
    },
  });
}

// Cost summary aggregations
export function useCostsSummary(filters?: CostFilters) {
  return useQuery({
    queryKey: ['costs-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select('amount, status, category, date_incurred, projects!inner(company_id)');

      if (filters?.startDate) {
        query = query.gte('date_incurred', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date_incurred', filters.endDate);
      }
      if (filters?.companyId) {
        query = query.eq('projects.company_id', filters.companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const costs = data || [];
      
      const totalCosts = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
      const unpaidCosts = costs.filter(c => c.status === 'unpaid').reduce((sum, c) => sum + (c.amount || 0), 0);
      const paidCosts = costs.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const byCategory = {
        labor: costs.filter(c => c.category === 'labor').reduce((sum, c) => sum + (c.amount || 0), 0),
        subs: costs.filter(c => c.category === 'subs').reduce((sum, c) => sum + (c.amount || 0), 0),
        materials: costs.filter(c => c.category === 'materials').reduce((sum, c) => sum + (c.amount || 0), 0),
        misc: costs.filter(c => c.category === 'misc').reduce((sum, c) => sum + (c.amount || 0), 0),
      };

      return {
        totalCosts,
        unpaidCosts,
        paidCosts,
        byCategory,
      };
    },
  });
}
