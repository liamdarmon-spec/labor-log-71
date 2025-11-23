import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposalTemplate {
  id: string;
  title: string;
  description: string | null;
  template_data: any;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProposalTemplates() {
  return useQuery({
    queryKey: ['proposal-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProposalTemplate[];
    },
  });
}

export function useCreateProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await supabase
        .from('proposal_templates')
        .insert([template])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      toast.success('Template saved');
    },
    onError: () => {
      toast.error('Failed to save template');
    },
  });
}

export function useDeleteProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });
}
