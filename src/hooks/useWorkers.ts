import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  name: string;
  trade_id: string | null;
  trades?: { name: string } | null;
  hourly_rate: number | null;
  phone: string | null;
  active: boolean | null;
  created_at?: string;
}

/**
 * Canonical hook for fetching workers
 * Used across: Admin, Workforce, Schedule, Time Logs, Payments
 */
export function useWorkers(includeInactive = false) {
  return useQuery({
    queryKey: ['workers', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('*, trades(name)')
        .order('name');
      
      if (!includeInactive) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Worker[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useWorkersSimple() {
  return useQuery({
    queryKey: ['workers-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
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
