import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SyncMode = 'merge' | 'replace';

interface SyncEstimateToBudgetOptions {
  projectId: string;
  estimateId: string;
  mode?: SyncMode;
}

/**
 * Thin wrapper around the canonical SQL function:
 *   sync_estimate_to_budget_v2(p_project_id, p_estimate_id, p_mode)
 *
 * This hook:
 * - calls the RPC
 * - invalidates relevant queries
 * - shows user feedback
 */
export function useSyncEstimateToBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SyncEstimateToBudgetOptions) => {
      const { projectId, estimateId, mode = 'merge' } = options;

      if (!projectId) {
        throw new Error('projectId is required for syncing estimate to budget');
      }
      if (!estimateId) {
        throw new Error('estimateId is required for syncing estimate to budget');
      }

      const { data, error } = await supabase.rpc(
        'sync_estimate_to_budget_v2' as any,
        {
          p_project_id: projectId,
          p_estimate_id: estimateId,
          p_mode: mode,
        }
      );

      if (error) {
        console.error('[estimate→budget sync] RPC error', {
          projectId,
          estimateId,
          mode,
          error,
        });
        throw error;
      }

      const result = data as { budget_id?: string; estimate_id?: string } | null;
      return {
        budgetId: result?.budget_id ?? null,
        estimateId: result?.estimate_id ?? estimateId,
        mode,
      };
    },
    onSuccess: (data, variables) => {
      const { projectId, estimateId } = variables;

      if (!projectId) {
        console.error(
          '[useSyncEstimateToBudget] onSuccess: projectId is missing from variables',
          variables
        );
        return;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['active-budget', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-structure', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-financials-v3', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimates', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimate-builder', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['project-estimates-sync-status', projectId] });

      // Dispatch event for any legacy listeners
      window.dispatchEvent(new Event('budget-updated'));

      toast.success(
        data.mode === 'replace'
          ? 'Estimate synced to budget (replaced existing)'
          : 'Estimate synced to budget (merged)'
      );
    },
    onError: (error: Error) => {
      console.error('Sync estimate to budget error:', error);
      toast.error(`Failed to sync estimate: ${error.message}`);
    },
  });
}
