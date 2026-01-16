import { AlertTriangle, CheckCircle2, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoreLawHealthcheck } from '@/hooks/useOutcomes';

/**
 * DEV ONLY:
 * Surface Core Law backend schema state in UI to eliminate PostgREST schema cache pain.
 */
export function CoreLawHealthcheckPanel({ className }: { className?: string }) {
  const { data, isLoading, error, refetch, isFetching } = useCoreLawHealthcheck(true);

  if (!import.meta.env.DEV) return null;

  const ok = data?.ok === true;
  const missing = data?.missing || [];

  return (
    <div className={cn('rounded-lg border bg-muted/20 p-3 space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Law Backend</span>
          {ok ? (
            <Badge variant="outline" className="text-[10px] gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              OK
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="w-3 h-3" />
              Missing
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="text-xs text-muted-foreground">
          Healthcheck RPC failed. This usually means the backend isn’t migrated yet or schema cache is stale.
        </div>
      ) : data ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Version: <span className="font-mono">{data.version}</span></div>
          <div>Server time: <span className="font-mono">{data.server_time}</span></div>
          {!ok && (
            <div className="mt-2 rounded-md border border-amber-300/30 bg-amber-50/30 p-2">
              <div className="font-semibold text-amber-900/80">Backend not migrated</div>
              <div className="mt-1 space-y-0.5">
                {missing.map((m) => (
                  <div key={m} className="font-mono text-[11px] text-amber-900/70">{m}</div>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-amber-900/70">
                Fix: run <span className="font-mono">supabase db push</span> then hard refresh.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Loading…</div>
      )}
    </div>
  );
}


