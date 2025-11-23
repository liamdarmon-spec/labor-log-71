import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Company {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Canonical hook for fetching companies
 * Used across: Dashboard, Workforce, Payments, Projects
 */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Company[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - companies rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useCompaniesSimple() {
  return useQuery({
    queryKey: ['companies-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
