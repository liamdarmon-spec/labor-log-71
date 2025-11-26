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
 * Global financial summary – single source of truth.
 * Reads from global_financial_summary_view (1 row).
 *
 * NOTE: filters param is kept for API compatibility,
 * but the current view is global-only, so filters
 * are not yet applied.
 */
export function useGlobalFinancials(filters?: {
  companyId?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}) {
  return useQuery<GlobalFinancials>({
    queryKey: ['global-financials', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_financial_summary_view')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      const row: any = data || {};

      const result: GlobalFinancials = {
        totalRevenue: row.revenue || 0,
        totalProfit: row.profit || 0,
        totalCosts: row.total_costs || 0,
        totalOutstanding: row.total_outstanding || 0,

        laborActual: row.labor_actual || 0,
        laborUnpaid: row.labor_unpaid || 0,

        subsActual: row.subs_actual || 0,
        subsUnpaid: row.subs_unpaid || 0,

        materialsActual: row.materials_actual || 0,
        materialsUnpaid: row.materials_unpaid || 0,

        miscActual: row.misc_actual || 0,
        miscUnpaid: row.misc_unpaid || 0,

        retentionHeld: row.retention_held || 0,
      };

      return result;
    },
  });
}
