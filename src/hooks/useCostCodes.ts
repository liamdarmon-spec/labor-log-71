import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/company/CompanyProvider";

export interface CostCode {
  id: string;
  code: string;
  name: string | null;
  category: 'labor' | 'material' | 'sub';
  trade_id: string | null;
  default_trade_id: string | null;
  is_active: boolean;
  is_legacy?: boolean;
}

export function useCostCodes(category?: CostCode['category']) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['cost_codes', activeCompanyId, category],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from('cost_codes')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .not('trade_id', 'is', null)
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
    retry: false,
    enabled: !!activeCompanyId,
  });
}

// Lightweight version for CostCodeSelect - just id, code, name, category
export function useCostCodesForSelect() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['cost-codes-select', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .not('trade_id', 'is', null)
        .neq('code', 'UNASSIGNED')
        .order('code');
      
      if (error) throw error;
      return data as Pick<CostCode, 'id' | 'code' | 'name' | 'category'>[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    enabled: !!activeCompanyId,
  });
}
