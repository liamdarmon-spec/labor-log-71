import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnpaidLaborBill {
  company_id: string | null;
  company_name: string | null;
  project_id: string;
  project_name: string;
  period_start: string;
  period_end: string;
  log_count: number;
  total_hours: number;
  total_amount: number;
}

export function useUnpaidLaborBills(projectId?: string) {
  return useQuery({
    queryKey: ['unpaid_labor_bills', projectId],
    queryFn: async () => {
      let query = supabase
        .from('unpaid_labor_bills')
        .select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as UnpaidLaborBill[];
    },
  });
}
