import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Sub {
  id: string;
  name: string;
  company_name: string | null;
  trade_id: string | null;
  trade: string | null;
  trades?: { id: string; name: string } | null;
  phone: string | null;
  email: string | null;
  default_rate: number | null;
  compliance_coi_expiration: string | null;
  compliance_license_expiration: string | null;
  compliance_w9_received: boolean | null;
  compliance_notes: string | null;
  notes: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Canonical hook for fetching subcontractors
 * Used across: Admin, Project Subs, Workforce Subs, Schedule
 */
export function useSubs(includeInactive = false) {
  return useQuery({
    queryKey: ['subs', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('subs')
        .select('*, trades(id, name)')
        .order('name');
      
      if (!includeInactive) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Sub[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useSubsSimple() {
  return useQuery({
    queryKey: ['subs-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
