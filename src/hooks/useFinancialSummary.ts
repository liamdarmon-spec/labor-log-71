import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialSummary {
  revenue: number;
  profit: number;
  laborActual: number;
  laborUnpaid: number;
  subsActual: number;
  subsUnpaid: number;
  materialsActual: number;
  materialsUnpaid: number;
  retentionHeld: number;
  retentionPayable: number;
  totalOutstanding: number;
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_financial_summary_view')
        .select('*')
        .single();

      if (error) throw error;

      const summary: FinancialSummary = {
        revenue: data?.revenue || 0,
        profit: data?.profit || 0,
        laborActual: data?.labor_actual || 0,
        laborUnpaid: data?.labor_unpaid || 0,
        subsActual: data?.subs_actual || 0,
        subsUnpaid: data?.subs_unpaid || 0,
        materialsActual: data?.materials_actual || 0,
        materialsUnpaid: data?.materials_unpaid || 0,
        retentionHeld: data?.retention_held || 0,
        retentionPayable: data?.retention_held || 0,
        totalOutstanding: data?.total_outstanding || 0,
      };

      return summary;
    },
  });
}
