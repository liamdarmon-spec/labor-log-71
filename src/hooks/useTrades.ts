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

/**
 * Canonical hook for fetching trades
 * Used across: Admin, Workers, Subs, Materials, Cost Codes, Schedule
 */
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
    staleTime: 10 * 60 * 1000, // 10 minutes - trades rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useTradesSimple() {
  return useQuery({
    queryKey: ['trades-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
