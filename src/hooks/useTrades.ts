import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Trade {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  default_labor_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
}

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Trade[];
    },
  });
}

export function useTradeCostCodes(tradeId?: string) {
  return useQuery({
    queryKey: ['trade-cost-codes', tradeId],
    queryFn: async () => {
      let query = supabase
        .from('cost_codes')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (tradeId) {
        query = query.eq('trade_id', tradeId);
      } else {
        query = query.not('trade_id', 'is', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tradeId || tradeId === undefined,
  });
}

/**
 * Get the standard 3 cost codes for a trade
 */
export function getTradeStandardCodes(tradeName: string) {
  const prefix = tradeName.substring(0, 3).toUpperCase();
  return {
    labor: `${prefix}-L`,
    materials: `${prefix}-M`,
    subs: `${prefix}-S`,
  };
}
