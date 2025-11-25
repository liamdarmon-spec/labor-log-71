// FILE: src/hooks/useGlobalFinancials.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalFinancials {
  totalRevenue: number;
  totalProfit: number;
  totalCosts: number;
  totalOutstanding: number;

  laborActual: number;
  laborUnpaid: number;

  subsActual: number;
  subsUnpaid: number;

  materialsActual: number;
  materialsUnpaid: number;

  miscActual: number;
  miscUnpaid: number;

  retentionHeld: number;
}

/**
 * GLOBAL FINANCIALS HOOK
 * Single-row summary across the whole company.
 * Reads directly from global_financial_summary_view.
 */
export function useGlobalFinancials() {
  return useQuery<GlobalFinancials>({
    queryKey: ['global-financials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_financial_summary_view')
        .select('*')
        .single();

      if (error) throw error;

      const result: GlobalFinancials = {
        totalRevenue: Number(data.revenue || 0),
        totalProfit: Number(data.profit || 0),
        totalCosts: Number(data.total_costs || 0),
        totalOutstanding: Number(data.total_outstanding || 0),

        laborActual: Number(data.labor_actual || 0),
        laborUnpaid: Number(data.labor_unpaid || 0),

        subsActual: Number(data.subs_actual || 0),
        subsUnpaid: Number(data.subs_unpaid || 0),

        materialsActual: Number(data.materials_actual || 0),
        materialsUnpaid: Number(data.materials_unpaid || 0),

        miscActual: Number(data.misc_actual || 0),
        miscUnpaid: Number(data.misc_unpaid || 0),

        retentionHeld: Number(data.retention_held || 0),
      };

      return result;
    },
  });
}
