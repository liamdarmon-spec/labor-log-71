import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EstimateV2 {
  id: string;
  project_id: string;
  title: string;
  status: 'draft' | 'pending' | 'accepted' | 'rejected';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  version: number;
  parent_estimate_id: string | null;
  change_log: any[];
  approved_at: string | null;
  approved_by: string | null;
  margin_percent: number;
  settings: any;
  project_type: string | null;
  is_budget_source: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useEstimatesV2(projectId?: string) {
  return useQuery({
    queryKey: ['estimates-v2', projectId],
    queryFn: async () => {
      let query = supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EstimateV2[];
    },
  });
}

export function useEstimateV2(estimateId: string) {
  return useQuery({
    queryKey: ['estimate-v2', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, projects(project_name, client_name, address)')
        .eq('id', estimateId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Estimate not found');
      }
      return data;
    },
  });
}

export function useCreateEstimateV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimate: Partial<EstimateV2> & { project_id: string; title: string }) => {
      const { data, error } = await supabase
        .from('estimates')
        .insert([estimate as any])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create estimate');
      }

      // Log creation
      await supabase.from('entity_change_log').insert({
        entity_type: 'estimate',
        entity_id: data.id,
        version: data.version || 1,
        change_type: 'created',
        change_summary: `Estimate "${estimate.title}" created`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates-v2'] });
      toast.success('Estimate created successfully');
    },
    onError: (error) => {
      console.error('Error creating estimate:', error);
      toast.error('Failed to create estimate');
    },
  });
}

export function useUpdateEstimateV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EstimateV2> & { id: string }) => {
      const { data, error } = await supabase
        .from('estimates')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Estimate not found');
      }

      // Log update
      await supabase.from('entity_change_log').insert({
        entity_type: 'estimate',
        entity_id: id,
        version: data.version || 1,
        change_type: 'updated',
        changes: updates,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estimates-v2'] });
      queryClient.invalidateQueries({ queryKey: ['estimate-v2', data.id] });
      toast.success('Estimate updated successfully');
    },
    onError: (error) => {
      console.error('Error updating estimate:', error);
      toast.error('Failed to update estimate');
    },
  });
}

export function useDuplicateEstimateV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      // Fetch original estimate
      const { data: original, error: fetchError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!original) {
        throw new Error('Estimate not found');
      }

      // Create new version
      const newVersion = (original.version || 1) + 1;
      const { data: newEstimate, error: createError } = await supabase
        .from('estimates')
        .insert({
          ...original,
          id: undefined,
          version: newVersion,
          parent_estimate_id: estimateId,
          title: `${original.title} (v${newVersion})`,
          status: 'draft',
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .maybeSingle();
      if (createError) throw createError;
      if (!newEstimate) {
        throw new Error('Failed to duplicate estimate');
      }

      // Duplicate scope blocks
      const { data: blocks } = await supabase
        .from('scope_blocks')
        .select('*, scope_block_cost_items(*)')
        .eq('entity_type', 'estimate')
        .eq('entity_id', estimateId);

      if (blocks) {
        for (const block of blocks) {
          const { data: newBlock } = await supabase
            .from('scope_blocks')
            .insert({
              ...block,
              id: undefined,
              entity_id: newEstimate.id,
              created_at: undefined,
              updated_at: undefined,
            })
            .select()
            .maybeSingle();

          if (newBlock && block.scope_block_cost_items?.length > 0) {
            await supabase.from('scope_block_cost_items').insert(
              block.scope_block_cost_items.map((item: any) => ({
                ...item,
                id: undefined,
                scope_block_id: newBlock.id,
                created_at: undefined,
                updated_at: undefined,
              }))
            );
          }
        }
      }

      // Log duplication
      await supabase.from('entity_change_log').insert({
        entity_type: 'estimate',
        entity_id: newEstimate.id,
        version: newVersion,
        change_type: 'duplicated',
        change_summary: `Duplicated from v${original.version}`,
      });

      return newEstimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates-v2'] });
      toast.success('Estimate duplicated successfully');
    },
    onError: (error) => {
      console.error('Error duplicating estimate:', error);
      toast.error('Failed to duplicate estimate');
    },
  });
}

export function useApproveEstimateV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase
        .from('estimates')
        .update({
          status: 'accepted',
          approved_at: new Date().toISOString(),
        })
        .eq('id', estimateId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Estimate not found');
      }

      // Log approval
      await supabase.from('entity_change_log').insert({
        entity_type: 'estimate',
        entity_id: estimateId,
        version: data.version || 1,
        change_type: 'approved',
        change_summary: 'Estimate approved',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates-v2'] });
      toast.success('Estimate approved and ready to sync to budget');
    },
    onError: (error) => {
      console.error('Error approving estimate:', error);
      toast.error('Failed to approve estimate');
    },
  });
}
