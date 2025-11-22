import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  cost_code_id: string | null;
  workers: { 
    name: string; 
    trades: { name: string } | null;
  };
  projects: { project_name: string; client_name: string };
  cost_codes: { code: string; name: string } | null;
}

interface ViewLogsTabMobileProps {
  logs: LogEntry[];
  onLogClick?: (log: LogEntry) => void;
}

export function ViewLogsTabMobile({ logs, onLogClick }: ViewLogsTabMobileProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No logs found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card 
          key={log.id} 
          className="p-4 active:bg-accent transition-colors cursor-pointer"
          onClick={() => onLogClick?.(log)}
        >
          <div className="space-y-3">
            {/* Worker & Hours */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold truncate">{log.workers.name}</span>
                </div>
                {log.workers.trades && (
                  <Badge variant="secondary" className="text-xs">
                    {log.workers.trades.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full ml-2">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-bold text-sm">
                  {parseFloat(log.hours_worked.toString()).toFixed(1)}h
                </span>
              </div>
            </div>

            {/* Project & Client */}
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{log.projects.project_name}</p>
                <p className="text-xs text-muted-foreground truncate">{log.projects.client_name}</p>
              </div>
            </div>

            {/* Date & Cost Code */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{format(new Date(log.date), 'MMM d, yyyy')}</span>
              </div>
              {log.cost_codes && (
                <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded">
                  {log.cost_codes.code}
                </span>
              )}
            </div>

            {/* Notes */}
            {log.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground line-clamp-2">{log.notes}</p>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
