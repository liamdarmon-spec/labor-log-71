import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCode {
  id: string;
  code: string;
  name: string;
  category: 'labor' | 'subs' | 'materials' | 'other';
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
        .order('code');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as CostCode[];
    },
  });
}
