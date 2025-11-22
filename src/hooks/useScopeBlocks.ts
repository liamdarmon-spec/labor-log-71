import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScopeBlockCostItem {
  id: string;
  scope_block_id: string;
  sort_order: number;
  category: 'labor' | 'materials' | 'subs' | 'other';
  cost_code_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  margin_percent: number;
  line_total: number;
  notes: string | null;
}

export interface ScopeBlock {
  id: string;
  parent_id: string | null;
  entity_type: 'estimate' | 'proposal';
  entity_id: string;
  sort_order: number;
  block_type: 'section' | 'cost_items' | 'text' | 'image' | 'nested';
  title: string | null;
  description: string | null;
  content_richtext: string | null;
  image_url: string | null;
  settings: any;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  scope_block_cost_items?: ScopeBlockCostItem[];
}

export function useScopeBlocks(entityType: 'estimate' | 'proposal', entityId: string) {
  return useQuery({
    queryKey: ['scope-blocks', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scope_blocks')
        .select(`
          *,
          scope_block_cost_items(*)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ScopeBlock[];
    },
    enabled: !!entityId,
  });
}

export function useCreateScopeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (block: Partial<ScopeBlock> & { entity_type: 'estimate' | 'proposal'; entity_id: string; block_type: string }) => {
      const { data, error } = await supabase
        .from('scope_blocks')
        .insert([block as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['scope-blocks', data.entity_type, data.entity_id],
      });
      toast.success('Scope block created');
    },
    onError: (error) => {
      console.error('Error creating scope block:', error);
      toast.error('Failed to create scope block');
    },
  });
}

export function useUpdateScopeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScopeBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('scope_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['scope-blocks', data.entity_type, data.entity_id],
      });
      toast.success('Scope block updated');
    },
    onError: (error) => {
      console.error('Error updating scope block:', error);
      toast.error('Failed to update scope block');
    },
  });
}

export function useDeleteScopeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
      const { error } = await supabase
        .from('scope_blocks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: ['scope-blocks', entityType, entityId],
      });
      toast.success('Scope block deleted');
    },
    onError: (error) => {
      console.error('Error deleting scope block:', error);
      toast.error('Failed to delete scope block');
    },
  });
}

export function useReorderScopeBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blocks,
      entityType,
      entityId,
    }: {
      blocks: { id: string; sort_order: number }[];
      entityType: string;
      entityId: string;
    }) => {
      const updates = blocks.map((block) =>
        supabase
          .from('scope_blocks')
          .update({ sort_order: block.sort_order })
          .eq('id', block.id)
      );
      await Promise.all(updates);
      return { entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: ['scope-blocks', entityType, entityId],
      });
    },
  });
}

export function useCreateCostItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scopeBlockId, item }: { scopeBlockId: string; item: Partial<ScopeBlockCostItem> & { category: string; description: string } }) => {
      const { data, error } = await supabase
        .from('scope_block_cost_items')
        .insert([{ ...item, scope_block_id: scopeBlockId } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-blocks'] });
      toast.success('Cost item added');
    },
    onError: (error) => {
      console.error('Error creating cost item:', error);
      toast.error('Failed to add cost item');
    },
  });
}

export function useUpdateCostItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScopeBlockCostItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('scope_block_cost_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-blocks'] });
    },
    onError: (error) => {
      console.error('Error updating cost item:', error);
      toast.error('Failed to update cost item');
    },
  });
}

export function useDeleteCostItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scope_block_cost_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-blocks'] });
      toast.success('Cost item deleted');
    },
    onError: (error) => {
      console.error('Error deleting cost item:', error);
      toast.error('Failed to delete cost item');
    },
  });
}
