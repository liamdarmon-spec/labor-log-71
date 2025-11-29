import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';

/**
 * VERY DEPRECATED – labor-only legacy hook.
 *
 * Kept only so old code doesn’t crash. New code should use
 * useUnifiedProjectBudget(projectId) instead.
 */
export function useProjectBudgetLines(projectId: string) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[useProjectBudgetLines] is deprecated. Use useUnifiedProjectBudget instead.'
    );
  }

  const { data, isLoading, isError, error, refetch } =
    useUnifiedProjectBudget(projectId);

  // If something expects "lines", give them everything for now.
  const lines = data?.costCodeLines ?? [];

  return {
    lines,
    isLoading,
    isError,
    error,
    refetch,
    raw: data,
  };
}
