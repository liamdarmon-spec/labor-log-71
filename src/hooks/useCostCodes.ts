import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCode {
  id: string;
  code: string;
  name: string | null;
  category: 'labor' | 'subs' | 'materials' | 'equipment' | 'other';
  trade_id: string | null;
  default_trade_id: string | null;
  is_active: boolean;
}

export function useCostCodes(category?: CostCode['category']) {
  return useQuery({
    queryKey: ['cost_codes', category],
    queryFn: async () => {
      let query = supabase
        .from('cost_codes')
        .select('*')
        .eq('is_active', true)
        .neq('code', 'UNASSIGNED')
        .order('code');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as CostCode[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - cost codes rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

// Lightweight version for CostCodeSelect - just id, code, name, category
export function useCostCodesForSelect() {
  return useQuery({
    queryKey: ['cost-codes-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('is_active', true)
        .neq('code', 'UNASSIGNED')
        .order('code');
      
      if (error) throw error;
      return data as Pick<CostCode, 'id' | 'code' | 'name' | 'category'>[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetch a single cost code by ID (including trade_id for context)
 * Used to get trade context from selected cost code for inline creation
 */
export function useCostCode(costCodeId: string | null) {
  return useQuery({
    queryKey: ['cost-code', costCodeId],
    queryFn: async () => {
      if (!costCodeId) return null;
      
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, category, trade_id')
        .eq('id', costCodeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Pick<CostCode, 'id' | 'code' | 'name' | 'category' | 'trade_id'> | null;
    },
    enabled: !!costCodeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
