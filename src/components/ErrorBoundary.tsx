import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** If true, shows a minimal inline error instead of full-page */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** Key to force remount children on retry */
  retryKey: number;
  /** Track retry attempts to detect persistent errors */
  retryCount: number;
  /** Timestamp of last error for detecting rapid re-errors */
  lastErrorTime: number;
}

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 * 
 * Features:
 * - Prevents app-wide crashes from component errors
 * - Shows user-friendly error UI with retry option
 * - Logs errors for debugging
 * - Supports inline mode for partial UI recovery
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: 0,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, lastErrorTime: Date.now() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Call optional error handler (for external logging services)
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    const timeSinceLastError = Date.now() - this.state.lastErrorTime;
    const isRapidRetry = timeSinceLastError < 2000; // Error occurred less than 2 seconds ago
    
    // If we've already retried and the error keeps happening quickly, 
    // suggest going home instead
    if (this.state.retryCount >= 2 && isRapidRetry) {
      console.warn('Persistent error detected after multiple retries. Consider navigating away.');
    }
    
    // Increment retryKey to force a full remount of children
    // This ensures any bad state in child components is cleared
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: prevState.retryKey + 1,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Inline error mode - minimal display for partial UI failures
      if (this.props.inline) {
        return (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Something went wrong loading this section.</span>
            <button
              onClick={this.handleRetry}
              className="ml-auto text-sm underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        );
      }

      // Full-page error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                {this.state.retryCount >= 2 
                  ? "This error keeps occurring. Try going to the Dashboard or reloading the page."
                  : "We're sorry, but something unexpected happened. Don't worry, your data is safe."
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {this.state.retryCount >= 2 ? (
                // After multiple retries, emphasize navigation away
                <>
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again Anyway
                  </button>
                </>
              ) : (
                // First couple of retries, show normal order
                <>
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                  >
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </button>
                </>
              )}
            </div>

            {/* Error Details (collapsible for debugging) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-muted rounded-lg text-sm">
                <summary className="cursor-pointer flex items-center gap-2 text-muted-foreground font-medium">
                  <Bug className="h-4 w-4" />
                  Error Details (Development Only)
                </summary>
                <div className="mt-3 space-y-2">
                  <div>
                    <strong className="text-destructive">Error:</strong>
                    <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong className="text-muted-foreground">Stack:</strong>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong className="text-muted-foreground">Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Use key to force complete remount of children on retry
    // The key change forces React to unmount and remount the entire subtree
    return (
      <div key={this.state.retryKey} style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    );
  }
}

/**
 * RouteErrorBoundary - Specialized boundary for route-level errors
 * Includes navigation options and auto-logs route context
 */
export class RouteErrorBoundary extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Add route context to error logging
    const routeContext = {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
    
    console.error('Route Error:', {
      error: error.message,
      route: routeContext,
      stack: error.stack,
    });

    super.componentDidCatch(error, errorInfo);
  }
}

/**
 * QueryErrorBoundary - For data-fetching components
 * Shows inline error with refetch option
 */
export function QueryErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <ErrorBoundary
      inline
      onError={(error) => {
        console.error('Query component error:', error.message);
      }}
      fallback={
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">Failed to load data.</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-auto text-sm text-primary hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
