/**
 * React Query Client Configuration
 * 
 * Centralized configuration for data fetching with:
 * - Intelligent retry logic with exponential backoff
 * - Global error handling
 * - Optimized caching defaults
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Determine if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('load failed') ||
      message.includes('networkerror') ||
      message.includes('timeout') ||
      message.includes('aborted')
    );
  }
  return false;
}

/**
 * Determine if an error is a server error (5xx)
 */
function isServerError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status >= 500 && status < 600;
  }
  return false;
}

/**
 * Determine if an error is an auth error (401/403)
 */
function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status === 401 || status === 403;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') || message.includes('forbidden');
  }
  return false;
}

/**
 * Extract a user-friendly error message
 */
function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection.';
  }
  
  if (isAuthError(error)) {
    return 'Your session has expired. Please sign in again.';
  }
  
  if (isServerError(error)) {
    return 'Server error. Our team has been notified.';
  }
  
  if (error instanceof Error) {
    // Don't expose raw error messages to users in production
    if (import.meta.env.PROD) {
      return 'Something went wrong. Please try again.';
    }
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Handle query errors globally
 */
function handleQueryError(error: unknown, queryKey: unknown): void {
  // Log all errors for debugging
  console.error('Query error:', { error, queryKey });
  
  // Don't show toast for background refetches or auth errors (handled elsewhere)
  if (isAuthError(error)) {
    // Auth errors should trigger a redirect to login
    // This is handled by the auth provider
    return;
  }
  
  // Show user-friendly toast for failures
  const message = getErrorMessage(error);
  toast.error(message, {
    duration: 5000,
    action: isNetworkError(error) ? {
      label: 'Retry',
      onClick: () => window.location.reload(),
    } : undefined,
  });
}

/**
 * Handle mutation errors globally
 */
function handleMutationError(error: unknown, variables: unknown, context: unknown, mutation: unknown): void {
  console.error('Mutation error:', { error, variables });
  
  const message = getErrorMessage(error);
  toast.error(message, {
    duration: 5000,
  });
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Smart retry function with exponential backoff
 * - Retries network errors more aggressively
 * - Doesn't retry auth errors
 * - Uses exponential backoff for server errors
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Never retry auth errors
  if (isAuthError(error)) {
    return false;
  }
  
  // Retry network errors up to 3 times
  if (isNetworkError(error)) {
    return failureCount < 3;
  }
  
  // Retry server errors up to 2 times
  if (isServerError(error)) {
    return failureCount < 2;
  }
  
  // Don't retry other errors (likely client-side bugs)
  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attemptIndex: number, error: unknown): number {
  // Base delay: 1 second
  const baseDelay = 1000;
  
  // For network errors, use shorter delays
  if (isNetworkError(error)) {
    return Math.min(baseDelay * Math.pow(1.5, attemptIndex), 5000);
  }
  
  // For server errors, use longer delays to give server time to recover
  if (isServerError(error)) {
    return Math.min(baseDelay * Math.pow(2, attemptIndex), 10000);
  }
  
  // Default exponential backoff
  return Math.min(baseDelay * Math.pow(2, attemptIndex), 30000);
}

// ============================================================================
// QUERY CLIENT
// ============================================================================

/**
 * Create a configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only show error toast if the query has already been fetched once
        // This prevents showing errors on initial load failures (handled by UI)
        if (query.state.data !== undefined) {
          handleQueryError(error, query.queryKey);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: handleMutationError,
    }),
    defaultOptions: {
      queries: {
        // Caching
        staleTime: 30 * 1000, // 30 seconds - balance freshness and performance
        gcTime: 5 * 60 * 1000, // 5 minutes cache retention
        
        // Refetching behavior
        refetchOnWindowFocus: false, // Prevent unnecessary refetches on tab switch
        refetchOnReconnect: true, // Refetch when network reconnects
        refetchOnMount: false, // Use cached data when component mounts
        
        // Retry logic
        retry: shouldRetry,
        retryDelay: getRetryDelay,
        
        // Network mode
        networkMode: 'offlineFirst', // Return cached data even when offline
      },
      mutations: {
        // Retry mutations that fail due to network issues
        retry: (failureCount, error) => {
          if (isNetworkError(error) && failureCount < 2) {
            return true;
          }
          return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
        
        // Network mode
        networkMode: 'online', // Only run mutations when online
      },
    },
  });
}

// Export a singleton instance for the app
export const queryClient = createQueryClient();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Invalidate all queries - useful after login/logout
 */
export function invalidateAllQueries(): void {
  queryClient.invalidateQueries();
}

/**
 * Clear all cached data - useful for logout
 */
export function clearQueryCache(): void {
  queryClient.clear();
}

/**
 * Prefetch common data for faster initial load
 */
export async function prefetchCommonData(): Promise<void> {
  // This can be extended to prefetch commonly used data
  // Example: await queryClient.prefetchQuery({ queryKey: ['user'], queryFn: fetchUser });
}
