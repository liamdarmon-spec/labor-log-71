import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubContractSummary {
  contract_id: string;
  project_id: string;
  sub_id: string;
  sub_name: string;
  company_name: string | null;
  trade: string | null;
  contract_value: number;
  retention_percentage: number;
  status: string | null;
  total_billed: number;
  total_paid: number;
  total_retention_held: number;
  total_retention_released: number;
  remaining_to_bill: number;
  outstanding_balance: number;
}

export function useSubContractSummary(projectId?: string) {
  return useQuery({
    queryKey: ['sub-contract-summary', projectId],
    queryFn: async () => {
      let query = supabase
        .from('sub_contract_summary')
        .select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubContractSummary[];
    },
  });
}
