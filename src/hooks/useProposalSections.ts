import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposalSection {
  id: string;
  proposal_id: string;
  type: string;
  title: string;
  content_richtext: string;
  sort_order: number;
  config: any;
  group_type: string;
  is_lump_sum: boolean;
  is_visible: boolean;
  show_section_total: boolean;
  created_at: string;
  updated_at: string;
}

export function useProposalSections(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      
      const { data, error } = await supabase
        .from('proposal_sections')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ProposalSection[];
    },
    enabled: !!proposalId,
  });
}

export function useCreateProposalSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (section: any) => {
      const { data, error } = await supabase
        .from('proposal_sections')
        .insert([section])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', data.proposal_id] });
      toast.success('Section added');
    },
    onError: () => {
      toast.error('Failed to add section');
    },
  });
}

export function useUpdateProposalSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('proposal_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', data.proposal_id] });
      toast.success('Section updated');
    },
    onError: () => {
      toast.error('Failed to update section');
    },
  });
}

export function useDeleteProposalSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, proposalId }: { id: string; proposalId: string }) => {
      const { error } = await supabase
        .from('proposal_sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { proposalId };
    },
    onSuccess: ({ proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
      toast.success('Section deleted');
    },
    onError: () => {
      toast.error('Failed to delete section');
    },
  });
}

export function useReorderProposalSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, sections }: { proposalId: string; sections: { id: string; sort_order: number }[] }) => {
      // Update all sections with new sort order
      const promises = sections.map(({ id, sort_order }) =>
        supabase
          .from('proposal_sections')
          .update({ sort_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      
      return proposalId;
    },
    onSuccess: (proposalId) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
    },
  });
}
