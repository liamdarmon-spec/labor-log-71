import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TimeLogAllocation } from '@/types/dayCard';

/**
 * Fetch allocations for a day card
 */
export function useTimeLogAllocations(dayCardId?: string) {
  return useQuery({
    queryKey: ['time-log-allocations', dayCardId],
    queryFn: async () => {
      if (!dayCardId) return [];
      
      const { data, error } = await supabase
        .from('time_log_allocations')
        .select(`
          *,
          projects (project_name),
          trades (name),
          cost_codes (code, name)
        `)
        .eq('day_card_id', dayCardId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeLogAllocation[];
    },
    enabled: !!dayCardId,
  });
}

/**
 * Create allocation
 */
export function useCreateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocation: Omit<TimeLogAllocation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('time_log_allocations')
        .insert(allocation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-log-allocations', variables.day_card_id] });
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      queryClient.invalidateQueries({ queryKey: ['day-card'] });
      toast.success('Allocation created');
    },
    onError: (error) => {
      console.error('Error creating allocation:', error);
      toast.error('Failed to create allocation');
    },
  });
}

/**
 * Update allocation
 */
export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TimeLogAllocation> }) => {
      const { error } = await supabase
        .from('time_log_allocations')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-log-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      toast.success('Allocation updated');
    },
    onError: (error) => {
      console.error('Error updating allocation:', error);
      toast.error('Failed to update allocation');
    },
  });
}

/**
 * Delete allocation
 */
export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_log_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-log-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      toast.success('Allocation deleted');
    },
    onError: (error) => {
      console.error('Error deleting allocation:', error);
      toast.error('Failed to delete allocation');
    },
  });
}

/**
 * Sync allocations from jobs
 */
export function useSyncAllocationsFromJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dayCardId: string) => {
      // Get existing jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('day_card_jobs')
        .select('*')
        .eq('day_card_id', dayCardId);

      if (jobsError) throw jobsError;

      // Delete existing allocations
      await supabase
        .from('time_log_allocations')
        .delete()
        .eq('day_card_id', dayCardId);

      // Create new allocations from jobs
      if (jobs && jobs.length > 0) {
        const allocations = jobs.map(job => ({
          day_card_id: job.day_card_id,
          project_id: job.project_id,
          trade_id: job.trade_id,
          cost_code_id: job.cost_code_id,
          hours: job.hours,
          notes: job.notes,
        }));

        const { error: insertError } = await supabase
          .from('time_log_allocations')
          .insert(allocations);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-log-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      toast.success('Allocations synced from jobs');
    },
    onError: (error) => {
      console.error('Error syncing allocations:', error);
      toast.error('Failed to sync allocations');
    },
  });
}
