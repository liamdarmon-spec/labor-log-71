import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, CheckCircle2, Clock, Plus, DollarSign, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectActivityFeed, ProjectActivityType } from '@/hooks/useProjectActivityFeed';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ProjectFeedProps {
  projectId: string;
}

const typeConfig: Record<ProjectActivityType, { icon: typeof Activity; color: string; bg: string }> = {
  task_created: { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  task_updated: { icon: Pencil, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  time_log_added: { icon: Clock, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  cost_added: { icon: DollarSign, color: 'text-slate-500', bg: 'bg-slate-500/10' },
};

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "'Today,' h:mm a");
  if (isYesterday(date)) return format(date, "'Yesterday,' h:mm a");
  return format(date, 'MMM d, h:mm a');
}

export function ProjectFeed({ projectId }: ProjectFeedProps) {
  const { data: activity, isLoading, error } = useProjectActivityFeed(projectId);

  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Unable to load activity feed.
          </p>
        ) : !activity || activity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No recent activity yet.
          </p>
        ) : (
          <TooltipProvider delayDuration={300}>
            <div className="relative max-h-72 overflow-y-auto pr-1">
              {/* Timeline line */}
              <div className="absolute left-3 top-3 bottom-3 w-px bg-border/50" />
              
              <div className="space-y-0.5">
                {activity.slice(0, 12).map((item, index) => {
                  const config = typeConfig[item.type];
                  const IconComponent = config.icon;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 py-2 pl-0.5 relative",
                        "hover:bg-muted/30 rounded-lg transition-colors -ml-1 px-1"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0 relative z-10",
                        config.bg
                      )}>
                        <IconComponent className={cn("h-3 w-3", config.color)} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm leading-snug">
                              <span className="font-medium">{item.title}</span>
                              {item.description && (
                                <span className="text-muted-foreground line-clamp-1">
                                  {' '}· {item.description}
                                </span>
                              )}
                            </p>
                          </TooltipTrigger>
                          {item.description && item.description.length > 50 && (
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              {item.description}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatRelativeDate(item.occurredAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
