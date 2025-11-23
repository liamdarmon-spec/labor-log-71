import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized hook to fetch proposal with sections in a single query
 * Shared across all tabs to prevent redundant fetches
 */
export function useProposalWithSections(proposalId?: string) {
  return useQuery({
    queryKey: ['proposal-with-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;

      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (
            id,
            project_name,
            client_name,
            address
          ),
          estimates!primary_estimate_id (
            id,
            title,
            total_amount,
            estimate_items (*)
          ),
          proposal_sections (
            id,
            type,
            title,
            content_richtext,
            sort_order,
            config,
            group_type,
            is_visible,
            show_section_total,
            created_at,
            updated_at
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      
      // Sort sections by sort_order
      if (data?.proposal_sections) {
        data.proposal_sections.sort((a: any, b: any) => a.sort_order - b.sort_order);
      }

      return data;
    },
    enabled: !!proposalId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
