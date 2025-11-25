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
  retentionHeld: number;
  miscActual: number;
  miscUnpaid: number;
}

/**
 * Global financial snapshot (one row) from global_financial_summary_view.
 * This is the canonical "all projects" view.
 */
export function useGlobalFinancials() {
  return useQuery({
    queryKey: ['global-financials-v3'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_financial_summary_view')
        .select('*')
        .single();

      if (error) throw error;

      const summary = data || {};

      const result: GlobalFinancials = {
        totalRevenue: summary.revenue ?? 0,
        totalProfit: summary.profit ?? 0,
        totalCosts: summary.total_costs ?? 0,
        totalOutstanding: summary.total_outstanding ?? 0,
        laborActual: summary.labor_actual ?? 0,
        laborUnpaid: summary.labor_unpaid ?? 0,
        subsActual: summary.subs_actual ?? 0,
        subsUnpaid: summary.subs_unpaid ?? 0,
        materialsActual: summary.materials_actual ?? 0,
        retentionHeld: summary.retention_held ?? 0,
        miscActual: summary.misc_actual ?? 0,
        miscUnpaid: summary.misc_unpaid ?? 0,
      };

      return result;
    },
  });
}
