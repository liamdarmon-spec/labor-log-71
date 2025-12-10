/**
 * Loading State Components
 * 
 * Reusable loading skeletons and states for common UI patterns.
 * Provides consistent loading experiences across the app.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// SKELETON VARIANTS
// ============================================================================

/**
 * Card skeleton for dashboard cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table skeleton with header
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  showHeader = true,
}: { 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full overflow-auto">
      <table className="w-full">
        {showHeader && (
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ 
  showAvatar = true,
  showSubtitle = true,
}: { 
  showAvatar?: boolean;
  showSubtitle?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        {showSubtitle && <Skeleton className="h-3 w-1/2" />}
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * List skeleton
 */
export function ListSkeleton({ 
  items = 5,
  showAvatar = true,
  showSubtitle = true,
}: { 
  items?: number;
  showAvatar?: boolean;
  showSubtitle?: boolean;
}) {
  return (
    <div className="divide-y">
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} showAvatar={showAvatar} showSubtitle={showSubtitle} />
      ))}
    </div>
  );
}

/**
 * Grid skeleton for card grids
 */
export function GridSkeleton({ 
  items = 6,
  columns = 3,
}: { 
  items?: number;
  columns?: number;
}) {
  return (
    <div 
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Form skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Chart skeleton
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end gap-2 h-full p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Stats cards skeleton (for dashboard)
 */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Page header skeleton
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATES
// ============================================================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Generic error state component
 */
export function ErrorState({ 
  title = 'Something went wrong',
  message = 'We encountered an error loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Network error state
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
        <WifiOff className="h-6 w-6 text-orange-600" />
      </div>
      <h3 className="font-semibold text-lg mb-1">Connection Issue</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-md">
        Unable to connect. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATES
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({ 
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {message && (
        <p className="text-muted-foreground text-sm mb-4 max-w-md">{message}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// LOADING WRAPPER
// ============================================================================

interface LoadingWrapperProps {
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingComponent: React.ReactNode;
  emptyComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wrapper component for handling loading, error, and empty states
 * 
 * @example
 * <LoadingWrapper
 *   isLoading={isLoading}
 *   isError={isError}
 *   isEmpty={data?.length === 0}
 *   onRetry={refetch}
 *   loadingComponent={<TableSkeleton />}
 *   emptyComponent={<EmptyState title="No projects" />}
 * >
 *   <ProjectsTable data={data} />
 * </LoadingWrapper>
 */
export function LoadingWrapper({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingComponent,
  emptyComponent,
  errorComponent,
  children,
}: LoadingWrapperProps) {
  if (isLoading) {
    return <>{loadingComponent}</>;
  }
  
  if (isError) {
    return errorComponent ? (
      <>{errorComponent}</>
    ) : (
      <ErrorState 
        message={error?.message}
        onRetry={onRetry}
      />
    );
  }
  
  if (isEmpty && emptyComponent) {
    return <>{emptyComponent}</>;
  }
  
  return <>{children}</>;
}

// ============================================================================
// INLINE LOADING
// ============================================================================

/**
 * Small inline spinner for buttons and inline loading states
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin',
        className
      )}
    />
  );
}

/**
 * Loading button content
 */
export function LoadingButtonContent({ 
  isLoading, 
  children,
  loadingText = 'Loading...',
}: { 
  isLoading: boolean; 
  children: React.ReactNode;
  loadingText?: string;
}) {
  if (isLoading) {
    return (
      <>
        <InlineSpinner className="mr-2" />
        {loadingText}
      </>
    );
  }
  return <>{children}</>;
}
