import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';

/**
 * DEPRECATED INTERFACE – wrapper around useUnifiedProjectBudget
 *
 * Old code expects a "ledger" of cost code lines. We now compute everything
 * in useUnifiedProjectBudget and just adapt the shape here.
 *
 * New callers should import useUnifiedProjectBudget directly.
 */
export function useProjectBudgetLedger(projectId: string) {
  const { data, isLoading, isError, error, refetch } =
    useUnifiedProjectBudget(projectId);

  // Unified hook already returns { costCodeLines, summary, ... }
  const ledger = data?.costCodeLines ?? [];
  const summary = data?.summary;

  return {
    ledger,          // old name
    summary,         // expose summary so old UIs can start using it
    isLoading,
    isError,
    error,
    refetch,
    // keep raw data in case anything was poking it directly
    raw: data,
  };
}
