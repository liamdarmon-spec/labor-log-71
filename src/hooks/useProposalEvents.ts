import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  event_type: 'created' | 'sent' | 'viewed' | 'pdf_downloaded' | 'accepted' | 'changes_requested' | 'rejected' | 'updated';
  actor_name: string | null;
  actor_email: string | null;
  actor_ip: string | null;
  metadata: any;
  created_at: string;
}

export function useProposalEvents(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal-events', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      
      const { data, error } = await supabase
        .from('proposal_events')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProposalEvent[];
    },
    enabled: !!proposalId,
  });
}

export function useLogProposalEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: any) => {
      const { data, error} = await supabase
        .from('proposal_events')
        .insert([event])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-events', data.proposal_id] });
    },
  });
}

// Helper to get client IP (best effort)
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}
