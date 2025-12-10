/**
 * Robust Query Hooks
 * 
 * Enhanced data fetching hooks with:
 * - Automatic retry with exponential backoff
 * - Error state management
 * - Loading state helpers
 * - Refresh capabilities
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  isRefreshing: boolean;
  refresh: () => void;
  retry: () => void;
}

export interface MutationState<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// ENHANCED QUERY HOOK
// ============================================================================

/**
 * Enhanced useQuery with better state management and helpers
 * 
 * @example
 * const { data, isLoading, isEmpty, refresh, retry } = useRobustQuery({
 *   queryKey: ['projects'],
 *   queryFn: fetchProjects,
 *   emptyCheck: (data) => data.length === 0,
 * });
 */
export function useRobustQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError, TData, QueryKey> & {
    /** Custom function to determine if data is "empty" */
    emptyCheck?: (data: TData) => boolean;
  }
): QueryState<TData> {
  const queryClient = useQueryClient();
  const { emptyCheck, ...queryOptions } = options;
  
  const query = useQuery(queryOptions);
  
  const isEmpty = useMemo(() => {
    if (!query.data) return true;
    if (emptyCheck) return emptyCheck(query.data);
    if (Array.isArray(query.data)) return query.data.length === 0;
    return false;
  }, [query.data, emptyCheck]);
  
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: options.queryKey });
  }, [queryClient, options.queryKey]);
  
  const retry = useCallback(() => {
    query.refetch();
  }, [query]);
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isEmpty,
    isRefreshing: query.isFetching && !query.isLoading,
    refresh,
    retry,
  };
}

// ============================================================================
// ENHANCED MUTATION HOOK
// ============================================================================

/**
 * Enhanced useMutation with automatic toast notifications
 * 
 * @example
 * const { mutate, isPending } = useRobustMutation({
 *   mutationFn: createProject,
 *   successMessage: 'Project created!',
 *   errorMessage: 'Failed to create project',
 *   invalidateKeys: [['projects']],
 * });
 */
export function useRobustMutation<TData, TVariables, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    /** Toast message on success */
    successMessage?: string;
    /** Toast message on error (default: 'Something went wrong') */
    errorMessage?: string;
    /** Query keys to invalidate on success */
    invalidateKeys?: QueryKey[];
    /** Show error toast (default: true) */
    showErrorToast?: boolean;
    /** Show success toast (default: true if successMessage provided) */
    showSuccessToast?: boolean;
  }
): MutationState<TData, TVariables> {
  const queryClient = useQueryClient();
  const {
    successMessage,
    errorMessage = 'Something went wrong',
    invalidateKeys,
    showErrorToast = true,
    showSuccessToast = !!successMessage,
    ...mutationOptions
  } = options;
  
  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      
      // Show success toast
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }
      
      // Call original onSuccess if provided
      mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Show error toast
      if (showErrorToast) {
        const message = error instanceof Error ? error.message : errorMessage;
        toast.error(import.meta.env.PROD ? errorMessage : message);
      }
      
      // Call original onError if provided
      mutationOptions.onError?.(error, variables, context);
    },
  });
  
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}

// ============================================================================
// OPTIMISTIC UPDATE HELPERS
// ============================================================================

/**
 * Helper for optimistic updates with automatic rollback
 * 
 * @example
 * const mutation = useOptimisticMutation({
 *   queryKey: ['todos'],
 *   mutationFn: updateTodo,
 *   updateFn: (old, newTodo) => old.map(t => t.id === newTodo.id ? newTodo : t),
 * });
 */
export function useOptimisticMutation<TData, TVariables, TQueryData = TData[]>(
  options: {
    queryKey: QueryKey;
    mutationFn: (variables: TVariables) => Promise<TData>;
    /** Function to update cached data optimistically */
    updateFn: (oldData: TQueryData | undefined, variables: TVariables) => TQueryData;
    /** Toast message on success */
    successMessage?: string;
    /** Toast message on error */
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { queryKey, mutationFn, updateFn, successMessage, errorMessage } = options;
  
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TQueryData>(queryKey);
      
      // Optimistically update
      queryClient.setQueryData<TQueryData>(queryKey, (old) => updateFn(old, variables));
      
      // Return context with snapshot
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      // Show error toast
      if (errorMessage) {
        toast.error(errorMessage);
      }
    },
    onSuccess: () => {
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ============================================================================
// POLLING HOOK
// ============================================================================

/**
 * Query with automatic polling
 * Useful for real-time data that doesn't use WebSockets
 * 
 * @example
 * const { data } = usePollingQuery({
 *   queryKey: ['notifications'],
 *   queryFn: fetchNotifications,
 *   pollInterval: 30000, // Poll every 30 seconds
 * });
 */
export function usePollingQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError, TData, QueryKey> & {
    /** Polling interval in milliseconds */
    pollInterval: number;
    /** Only poll when this condition is true */
    pollWhen?: boolean;
  }
) {
  const { pollInterval, pollWhen = true, ...queryOptions } = options;
  
  return useQuery({
    ...queryOptions,
    refetchInterval: pollWhen ? pollInterval : false,
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
  });
}

// ============================================================================
// DEPENDENT QUERY HOOK
// ============================================================================

/**
 * Query that depends on another value being present
 * Automatically handles the enabled state
 * 
 * @example
 * const { data: user } = useQuery(['user']);
 * const { data: projects } = useDependentQuery({
 *   queryKey: ['projects', user?.id],
 *   queryFn: () => fetchProjects(user!.id),
 *   dependsOn: user?.id,
 * });
 */
export function useDependentQuery<TData, TError = Error, TDep = unknown>(
  options: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'enabled'> & {
    /** The value this query depends on */
    dependsOn: TDep | undefined | null;
  }
) {
  const { dependsOn, ...queryOptions } = options;
  
  return useQuery({
    ...queryOptions,
    enabled: dependsOn !== undefined && dependsOn !== null,
  });
}

// ============================================================================
// BATCH INVALIDATION
// ============================================================================

/**
 * Hook for batch invalidating multiple query keys
 * 
 * @example
 * const invalidate = useBatchInvalidate();
 * invalidate(['projects'], ['tasks'], ['workers']);
 */
export function useBatchInvalidate() {
  const queryClient = useQueryClient();
  
  return useCallback((...keys: QueryKey[]) => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);
}
