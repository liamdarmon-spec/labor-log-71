/**
 * Hook to check if an estimate has been synced to budget
 * Returns sync status for one or more estimates
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EstimateSyncStatus = 'not_synced' | 'synced' | 'partially_synced';

interface EstimateSyncStatusResult {
  estimateId: string;
  status: EstimateSyncStatus;
  syncedAt: string | null;
  lineCount: number;
}

/**
 * Check sync status for a single estimate
 */
export function useEstimateSyncStatus(estimateId: string | undefined, projectId: string | undefined) {
  return useQuery<EstimateSyncStatusResult | null>({
    queryKey: ['estimate-sync-status', estimateId, projectId],
    enabled: !!estimateId && !!projectId,
    queryFn: async () => {
      if (!estimateId || !projectId) return null;

      // Get active budget for project
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (!budget) {
        return {
          estimateId,
          status: 'not_synced' as const,
          syncedAt: null,
          lineCount: 0,
        };
      }

      // Count lines from this estimate in the active budget
      const { data: lines, error } = await supabase
        .from('project_budget_lines')
        .select('id, created_at, updated_at')
        .eq('project_budget_id', budget.id)
        .eq('source_estimate_id', estimateId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const lineCount = lines?.length || 0;
      // Use most recent updated_at if available, otherwise created_at
      const syncedAt = lines && lines.length > 0 
        ? (lines[0].updated_at || lines[0].created_at) 
        : null;

      return {
        estimateId,
        status: lineCount > 0 ? ('synced' as const) : ('not_synced' as const),
        syncedAt,
        lineCount,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Check sync status for multiple estimates in a project
 */
export function useProjectEstimatesSyncStatus(projectId: string | undefined) {
  return useQuery<Record<string, EstimateSyncStatusResult>>({
    queryKey: ['project-estimates-sync-status', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return {};

      // Get active budget
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (!budget) {
        return {};
      }

      // Get all budget lines grouped by source_estimate_id
      const { data: lines, error } = await supabase
        .from('project_budget_lines')
        .select('source_estimate_id, id, created_at')
        .eq('project_budget_id', budget.id)
        .not('source_estimate_id', 'is', null);

      if (error) throw error;

      // Group by estimate_id
      const statusMap: Record<string, EstimateSyncStatusResult> = {};
      const estimateIds = new Set<string>();

      lines?.forEach((line) => {
        if (line.source_estimate_id) {
          estimateIds.add(line.source_estimate_id);
          if (!statusMap[line.source_estimate_id]) {
            statusMap[line.source_estimate_id] = {
              estimateId: line.source_estimate_id,
              status: 'synced',
              syncedAt: line.created_at,
              lineCount: 0,
            };
          }
          statusMap[line.source_estimate_id].lineCount++;
        }
      });

      return statusMap;
    },
    staleTime: 30000,
  });
}
