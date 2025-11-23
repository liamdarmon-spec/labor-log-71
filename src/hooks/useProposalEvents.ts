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
    mutationFn: async (event: {
      proposal_id: string;
      event_type: ProposalEvent['event_type'];
      actor_name?: string;
      actor_email?: string;
      actor_ip?: string;
      metadata?: any;
    }) => {
      // Use backend function with deduplication
      const { data, error } = await supabase.rpc('log_proposal_event', {
        p_proposal_id: event.proposal_id,
        p_event_type: event.event_type,
        p_actor_name: event.actor_name || null,
        p_actor_email: event.actor_email || null,
        p_actor_ip: event.actor_ip || null,
        p_metadata: event.metadata || {},
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-events', variables.proposal_id] });
    },
  });
}

// Helper to get client IP (best effort, non-blocking)
export async function getClientIP(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return 'unknown';
    
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}
