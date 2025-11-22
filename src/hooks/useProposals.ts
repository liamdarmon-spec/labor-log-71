import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Proposal {
  id: string;
  project_id: string;
  primary_estimate_id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  proposal_date: string;
  validity_days: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  notes_internal: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  acceptance_method: 'manual' | 'e_signature' | 'imported' | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function useProposals(projectId?: string) {
  return useQuery({
    queryKey: ['proposals', projectId],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          projects (project_name),
          estimates!primary_estimate_id (title, total_amount)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProposal(proposalId: string) {
  return useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (project_name, client_name, address),
          estimates!primary_estimate_id (
            title,
            total_amount,
            estimate_items (*)
          )
        `)
        .eq('id', proposalId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: any) => {
      const { data, error } = await supabase
        .from('proposals')
        .insert([proposal])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created successfully');
    },
    onError: (error) => {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal');
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Proposal> & { id: string }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', data.id] });
      toast.success('Proposal updated successfully');
    },
    onError: (error) => {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
    },
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Proposal['status'];
    }) => {
      const updates: any = { status };

      // Set timestamps based on status
      if (status === 'sent' && !updates.sent_at) {
        updates.sent_at = new Date().toISOString();
      } else if (status === 'viewed' && !updates.viewed_at) {
        updates.viewed_at = new Date().toISOString();
      } else if (status === 'accepted' && !updates.accepted_at) {
        updates.accepted_at = new Date().toISOString();
        updates.acceptance_method = 'manual';
      } else if (status === 'rejected' && !updates.rejected_at) {
        updates.rejected_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', data.id] });
      toast.success(`Proposal marked as ${data.status}`);
    },
    onError: (error) => {
      console.error('Error updating proposal status:', error);
      toast.error('Failed to update proposal status');
    },
  });
}
