import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectLaborSummary {
  project_id: string;
  project_name: string;
  worker_count: number;
  total_hours_logged: number;
  total_hours_scheduled: number;
  total_labor_cost: number;
  unpaid_labor_cost: number;
  paid_labor_cost: number;
  last_activity_date: string | null;
}

/**
 * Fetch project labor summaries
 */
export function useProjectLaborSummary(projectId?: string) {
  return useQuery({
    queryKey: ['project-labor-summary', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_labor_summary')
        .select('*');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProjectLaborSummary[];
    },
  });
}

/**
 * Fetch single project labor summary
 */
export function useProjectLaborSummaryById(projectId: string) {
  return useQuery({
    queryKey: ['project-labor-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_labor_summary')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as ProjectLaborSummary | null;
    },
    enabled: !!projectId,
  });
}
