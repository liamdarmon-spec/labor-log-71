/**
 * Pagination Utilities
 * 
 * Helpers for paginated data fetching from Supabase.
 */

import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface InfiniteScrollParams {
  pageParam?: number;
  pageSize?: number;
}

// ============================================================================
// FETCH ALL PAGES
// ============================================================================

/**
 * Fetch all pages of data from a Supabase query.
 * Useful when you need the complete dataset (e.g., for exports, reports).
 * 
 * @param buildQuery - Function that builds the query (will be called for each page)
 * @param pageSize - Number of records per page (default: 1000)
 * @param maxPages - Maximum number of pages to fetch (default: 100)
 * 
 * @example
 * const allLogs = await fetchAllPages(
 *   (from, to) => supabase
 *     .from('time_logs')
 *     .select('*')
 *     .eq('status', 'unpaid')
 *     .range(from, to),
 *   1000
 * );
 */
export async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PostgrestFilterBuilder<any, any, any>,
  pageSize: number = 1000,
  maxPages: number = 100
): Promise<T[]> {
  const allData: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && page < maxPages) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await buildQuery(from, to);
    
    if (error) {
      throw error;
    }

    const pageData = (data || []) as T[];
    allData.push(...pageData);

    hasMore = pageData.length === pageSize;
    page++;
  }

  if (page >= maxPages) {
    console.warn(`fetchAllPages: Hit safety limit of ${maxPages * pageSize} records`);
  }

  return allData;
}

// ============================================================================
// PAGINATED FETCH
// ============================================================================

/**
 * Fetch a single page of data with pagination metadata.
 * 
 * @example
 * const result = await fetchPage(
 *   supabase
 *     .from('projects')
 *     .select('*', { count: 'exact' })
 *     .order('created_at', { ascending: false }),
 *   { page: 0, pageSize: 20 }
 * );
 */
export async function fetchPage<T>(
  query: PostgrestFilterBuilder<any, any, any>,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, pageSize } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: (data || []) as T[],
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages - 1,
    hasPrevPage: page > 0,
  };
}

// ============================================================================
// INFINITE SCROLL HELPERS
// ============================================================================

/**
 * Get pagination range for infinite scroll queries.
 * Use with React Query's useInfiniteQuery.
 * 
 * @example
 * useInfiniteQuery({
 *   queryKey: ['documents'],
 *   queryFn: ({ pageParam = 0 }) => {
 *     const { from, to } = getInfiniteRange(pageParam, 20);
 *     return supabase.from('documents').select('*').range(from, to);
 *   },
 *   getNextPageParam: (lastPage, pages) => getNextPageParam(lastPage, pages.length, 20),
 * });
 */
export function getInfiniteRange(pageParam: number, pageSize: number): { from: number; to: number } {
  const from = pageParam * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/**
 * Calculate the next page param for infinite scroll.
 * Returns undefined if there are no more pages.
 */
export function getNextPageParam<T>(
  lastPage: T[],
  allPagesCount: number,
  pageSize: number
): number | undefined {
  if (lastPage.length < pageSize) {
    return undefined; // No more pages
  }
  return allPagesCount; // Next page number
}

// ============================================================================
// CURSOR-BASED PAGINATION
// ============================================================================

export interface CursorPaginationParams<TCursor> {
  cursor?: TCursor;
  pageSize: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResult<T, TCursor> {
  data: T[];
  nextCursor?: TCursor;
  prevCursor?: TCursor;
  hasMore: boolean;
}

/**
 * Build a cursor-based pagination query.
 * More efficient than offset-based pagination for large datasets.
 * 
 * @example
 * const result = await fetchWithCursor(
 *   supabase.from('logs').select('*'),
 *   'created_at',
 *   { cursor: lastCreatedAt, pageSize: 50 }
 * );
 */
export async function fetchWithCursor<T extends Record<string, any>>(
  query: PostgrestFilterBuilder<any, any, any>,
  cursorColumn: keyof T,
  params: CursorPaginationParams<string | number>
): Promise<CursorPaginatedResult<T, string | number>> {
  const { cursor, pageSize, direction = 'forward' } = params;
  
  let paginatedQuery = query;
  
  if (cursor !== undefined) {
    if (direction === 'forward') {
      paginatedQuery = paginatedQuery.gt(cursorColumn as string, cursor);
    } else {
      paginatedQuery = paginatedQuery.lt(cursorColumn as string, cursor);
    }
  }

  // Fetch one extra to check if there are more
  const { data, error } = await paginatedQuery.limit(pageSize + 1);

  if (error) {
    throw error;
  }

  const allData = (data || []) as T[];
  const hasMore = allData.length > pageSize;
  const pageData = hasMore ? allData.slice(0, pageSize) : allData;

  return {
    data: pageData,
    nextCursor: pageData.length > 0 ? pageData[pageData.length - 1][cursorColumn] : undefined,
    prevCursor: cursor,
    hasMore,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total pages from total count and page size.
 */
export function calculateTotalPages(totalCount: number, pageSize: number): number {
  return Math.ceil(totalCount / pageSize);
}

/**
 * Check if a page number is valid.
 */
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 0 && page < totalPages;
}

/**
 * Clamp a page number to valid bounds.
 */
export function clampPage(page: number, totalPages: number): number {
  return Math.max(0, Math.min(page, totalPages - 1));
}
