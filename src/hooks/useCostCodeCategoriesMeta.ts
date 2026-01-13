import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CostCodeCategoryMeta = {
  key: string;
  label: string;
  color: string;
  sort_order: number;
};

export function useCostCodeCategoriesMeta() {
  return useQuery({
    queryKey: ['cost-code-categories-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_code_categories_meta')
        .select('key,label,color,sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CostCodeCategoryMeta[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}


