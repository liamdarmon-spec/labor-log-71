import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkOrder } from '@/types/workOrders';

export function useProjectWorkOrders(projectId?: string) {
  return useQuery({
    queryKey: ['work_orders', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return [] as WorkOrder[];

      // Type assertion needed until work_orders table is added to generated Supabase types
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as WorkOrder[];
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      budget_item_id?: string;
      sub_company_id?: string;
      title: string;
      scope_summary?: string;
      original_amount?: number;
      approved_amount?: number;
      due_date?: string;
      scheduled_start?: string;
      scheduled_end?: string;
      notes?: string;
    }) => {
      // Type assertion needed until work_orders table is added to generated Supabase types
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .insert({
          project_id: input.project_id,
          budget_item_id: input.budget_item_id || null,
          sub_company_id: input.sub_company_id || null,
          title: input.title,
          scope_summary: input.scope_summary || null,
          original_amount: input.original_amount || null,
          approved_amount: input.approved_amount || null,
          due_date: input.due_date || null,
          scheduled_start: input.scheduled_start || null,
          scheduled_end: input.scheduled_end || null,
          notes: input.notes || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Work order creation error:', error);
        throw error;
      }
      return data as WorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['projects_hub'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      payload,
    }: {
      id: string;
      project_id: string;
      payload: Partial<WorkOrder>;
    }) => {
      // Type assertion needed until work_orders table is added to generated Supabase types
      // Clean payload to only include defined values
      const cleanPayload: Record<string, any> = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanPayload[key] = value;
        }
      });

      const { data, error } = await (supabase as any)
        .from('work_orders')
        .update(cleanPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Work order update error:', error);
        throw error;
      }
      return data as WorkOrder;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders', variables.project_id] });
    },
  });
}