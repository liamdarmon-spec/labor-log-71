import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubCost {
  id: string;
  project_id: string;
  date_incurred: string;
  description: string;
  cost_code_id: string | null;
  category: string;
  amount: number;
  status: 'paid' | 'unpaid';
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  projects?: {
    id: string;
    project_name: string;
    status: string;
  };
  cost_codes?: {
    id: string;
    code: string;
    name: string;
  };
}

export function useSubCosts(subId: string, projectId?: string) {
  return useQuery({
    queryKey: ['sub-costs', subId, projectId],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select(`
          *,
          projects (id, project_name, status),
          cost_codes (id, code, name)
        `)
        .eq('vendor_type', 'sub')
        .eq('vendor_id', subId)
        .order('date_incurred', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubCost[];
    },
  });
}

export function useSubCostsSummary(subId: string, projectId?: string) {
  return useQuery({
    queryKey: ['sub-costs-summary', subId, projectId],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select('amount, status, date_incurred, project_id')
        .eq('vendor_type', 'sub')
        .eq('vendor_id', subId);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const costs = data || [];
      
      let totalCost = 0;
      let paidCost = 0;
      let unpaidCost = 0;
      const byProject: Record<string, number> = {};

      costs.forEach(c => {
        const amount = c.amount || 0;
        totalCost += amount;
        
        if (c.status === 'paid') paidCost += amount;
        else if (c.status === 'unpaid') unpaidCost += amount;
        
        if (c.project_id) {
          byProject[c.project_id] = (byProject[c.project_id] || 0) + amount;
        }
      });

      return {
        totalCost,
        paidCost,
        unpaidCost,
        byProject,
      };
    },
  });
}
