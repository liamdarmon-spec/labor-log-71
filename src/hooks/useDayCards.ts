import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DayCard, DayCardWithDetails, CreateDayCardInput, UpdateDayCardInput, DayCardJob } from '@/types/dayCard';
import { useCompany } from '@/company/CompanyProvider';

/**
 * Fetch day cards for a date range
 */
export function useDayCards(startDate?: string, endDate?: string, workerId?: string) {
  return useQuery({
    queryKey: ['day-cards', startDate, endDate, workerId],
    queryFn: async () => {
      let query = supabase
        .from('day_cards_with_details')
        .select('*');

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }
      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DayCardWithDetails[];
    },
    enabled: !!startDate || !!endDate || !!workerId,
  });
}

/**
 * Fetch a single day card for a worker on a specific date
 */
export function useDayCard(workerId: string, date: string) {
  return useQuery({
    queryKey: ['day-card', workerId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_cards_with_details')
        .select('*')
        .eq('worker_id', workerId)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DayCardWithDetails | null;
    },
    enabled: !!workerId && !!date,
  });
}

/**
 * Create or get a day card for a worker on a specific date
 */
export function useCreateOrGetDayCard() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({ workerId, date }: { workerId: string; date: string }) => {
      if (!activeCompanyId) throw new Error('No active company selected');
      // Try to fetch existing
      const { data: existing, error: fetchError } = await supabase
        .from('day_cards')
        .select('*')
        .eq('worker_id', workerId)
        .eq('date', date)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as DayCard;

      // Create new
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('hourly_rate')
        .eq('id', workerId)
        .single();

      if (workerError) throw workerError;

      const { data: newCard, error: createError } = await supabase
        .from('day_cards')
        .insert({
          company_id: activeCompanyId,
          worker_id: workerId,
          date,
          pay_rate: worker.hourly_rate,
          status: 'scheduled',
        })
        .select()
        .single();

      if (createError) throw createError;
      return newCard as DayCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      queryClient.invalidateQueries({ queryKey: ['day-card'] });
    },
  });
}

/**
 * Create a new day card
 */
export function useCreateDayCard() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateDayCardInput) => {
      if (!activeCompanyId) throw new Error('No active company selected');
      const { jobs, ...dayCardData } = input;

      // Create day card
      const { data: dayCard, error: cardError } = await supabase
        .from('day_cards')
        .insert({ ...(dayCardData as any), company_id: activeCompanyId })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create jobs if provided
      if (jobs && jobs.length > 0) {
        const jobsToInsert = jobs.map((job) => ({
          ...job,
          day_card_id: dayCard.id,
          company_id: activeCompanyId,
        }));

        const { error: jobsError } = await supabase
          .from('day_card_jobs')
          .insert(jobsToInsert);

        if (jobsError) throw jobsError;
      }

      return dayCard as DayCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      queryClient.invalidateQueries({ queryKey: ['day-card'] });
      toast.success('Day card created');
    },
    onError: (error) => {
      console.error('Error creating day card:', error);
      toast.error('Failed to create day card');
    },
  });
}

/**
 * Update a day card
 */
export function useUpdateDayCard() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDayCardInput }) => {
      const { jobs, ...dayCardData } = data;
      if (!activeCompanyId) throw new Error('No active company selected');

      // Update day card
      const { error: updateError } = await supabase
        .from('day_cards')
        .update(dayCardData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update jobs if provided
      if (jobs) {
        // Delete existing jobs
        await supabase.from('day_card_jobs').delete().eq('day_card_id', id);

        // Insert new jobs
        if (jobs.length > 0) {
          const jobsToInsert = jobs.map((job) => ({
            ...job,
            day_card_id: id,
            company_id: activeCompanyId,
          }));

          const { error: jobsError } = await supabase
            .from('day_card_jobs')
            .insert(jobsToInsert);

          if (jobsError) throw jobsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      queryClient.invalidateQueries({ queryKey: ['day-card'] });
      toast.success('Day card updated');
    },
    onError: (error) => {
      console.error('Error updating day card:', error);
      toast.error('Failed to update day card');
    },
  });
}

/**
 * Delete a day card
 */
export function useDeleteDayCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('day_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      queryClient.invalidateQueries({ queryKey: ['day-card'] });
      toast.success('Day card deleted');
    },
    onError: (error) => {
      console.error('Error deleting day card:', error);
      toast.error('Failed to delete day card');
    },
  });
}

/**
 * Bulk approve day cards
 */
export function useBulkApproveDayCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dayCardIds: string[]) => {
      const { error } = await supabase
        .from('day_cards')
        .update({ status: 'approved' })
        .in('id', dayCardIds);

      if (error) throw error;
    },
    onSuccess: (_, dayCardIds) => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      toast.success(`${dayCardIds.length} day card(s) approved`);
    },
    onError: (error) => {
      console.error('Error approving day cards:', error);
      toast.error('Failed to approve day cards');
    },
  });
}

/**
 * Bulk mark day cards as paid
 */
export function useBulkPayDayCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dayCardIds: string[]) => {
      const { error } = await supabase
        .from('day_cards')
        .update({
          status: 'paid',
          pay_status: 'paid',
          locked: true,
        })
        .in('id', dayCardIds);

      if (error) throw error;
    },
    onSuccess: (_, dayCardIds) => {
      queryClient.invalidateQueries({ queryKey: ['day-cards'] });
      toast.success(`${dayCardIds.length} day card(s) marked as paid`);
    },
    onError: (error) => {
      console.error('Error marking day cards as paid:', error);
      toast.error('Failed to mark day cards as paid');
    },
  });
}

/**
 * Copy day card to another date
 */
export function useCopyDayCard() {
  const createMutation = useCreateDayCard();

  return useMutation({
    mutationFn: async ({ dayCardId, targetDate }: { dayCardId: string; targetDate: string }) => {
      // Fetch the original day card with jobs
      const { data: original, error: fetchError } = await supabase
        .from('day_cards')
        .select('*, day_card_jobs(*)')
        .eq('id', dayCardId)
        .single();

      if (fetchError) throw fetchError;

      // Create the copy
      const { day_card_jobs, id, created_at, updated_at, ...cardData } = original;

      await createMutation.mutateAsync({
        ...cardData,
        date: targetDate,
        status: 'scheduled',
        logged_hours: 0,
        locked: false,
        jobs: day_card_jobs?.map(({ id, day_card_id, created_at, updated_at, ...job }: any) => job) || [],
      });
    },
    onSuccess: () => {
      toast.success('Day card copied');
    },
  });
}
