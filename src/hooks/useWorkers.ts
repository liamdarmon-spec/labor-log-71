import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeArray } from '@/lib/utils/safeData';
import { toast } from 'sonner';

export interface Worker {
  id: string;
  name: string;
  trade_id: string | null;
  trades?: { name: string } | null;
  hourly_rate: number;
  phone: string | null;
  active: boolean;
  created_at?: string;
}

/**
 * Canonical hook for fetching workers
 * Used across: Admin, Workforce, Schedule, Time Logs, Payments
 * 
 * Features:
 * - Safe array return (never undefined)
 * - Automatic retry on failure
 * - Optimized caching
 */
export function useWorkers(includeInactive = false) {
  const query = useQuery({
    queryKey: ['workers', includeInactive],
    queryFn: async () => {
      let q = supabase
        .from('workers')
        .select('*, trades(name)')
        .order('name');
      
      if (!includeInactive) {
        q = q.eq('active', true);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return safeArray(data) as Worker[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    data: safeArray(query.data),
    isEmpty: safeArray(query.data).length === 0,
  };
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useWorkersSimple() {
  const query = useQuery({
    queryKey: ['workers-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return safeArray(data);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    data: safeArray(query.data),
  };
}

/**
 * Hook for creating a new worker
 */
export function useCreateWorker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (worker: Omit<Worker, 'id' | 'created_at' | 'trades'> & { trade?: string }) => {
      // Map Worker interface to database schema
      // Note: trade is required in DB schema, so provide a default if missing
      const insertData: any = {
        name: worker.name,
        trade: worker.trade || '', // Required field - use empty string as fallback
        trade_id: worker.trade_id || null,
        hourly_rate: worker.hourly_rate ?? 0,
        phone: worker.phone || null,
        active: worker.active ?? true,
      };
      
      const { data, error } = await supabase
        .from('workers')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['workers-simple'] });
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add worker');
      console.error('Create worker error:', error);
    },
  });
}

/**
 * Hook for updating a worker
 */
export function useUpdateWorker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Worker> & { id: string }) => {
      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['workers-simple'] });
      toast.success('Worker updated');
    },
    onError: (error) => {
      toast.error('Failed to update worker');
      console.error('Update worker error:', error);
    },
  });
}
