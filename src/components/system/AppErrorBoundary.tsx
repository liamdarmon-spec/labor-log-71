import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack });
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[AppErrorBoundary] crash', error, info);
    }
  }

  private buildCopyPayload() {
    return JSON.stringify(
      {
        message: this.state.error?.message ?? 'Unknown error',
        stack: import.meta.env.DEV ? this.state.error?.stack ?? null : null,
        componentStack: import.meta.env.DEV ? this.state.componentStack ?? null : null,
        location: {
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        },
        userAgent: navigator.userAgent,
        ts: new Date().toISOString(),
      },
      null,
      2
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message ?? 'Unknown error';

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">Page crashed</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Something went wrong while rendering this page. Your data is not necessarily lost.
                </p>

                <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Error</div>
                  <div className="mt-1 text-sm break-words">{msg}</div>
                </div>

                {import.meta.env.DEV && (this.state.error?.stack || this.state.componentStack) && (
                  <div className="mt-4 space-y-3">
                    {this.state.error?.stack && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-xs font-medium text-muted-foreground">Stack</div>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] opacity-80">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.componentStack && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-xs font-medium text-muted-foreground">Component stack</div>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] opacity-80">
                          {this.state.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    Reload
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(this.buildCopyPayload());
                        toast.success('Copied error');
                      } catch {
                        toast.error('Failed to copy');
                      }
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy error
                  </Button>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  If this keeps happening, copy the error and send it to engineering. URL: <code>{window.location.pathname}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}


