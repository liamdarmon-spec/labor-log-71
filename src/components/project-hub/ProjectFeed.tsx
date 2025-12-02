import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, Clock, Plus, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectActivityFeed, ProjectActivityType } from '@/hooks/useProjectActivityFeed';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

export interface ProjectFeedProps {
  projectId: string;
}

const typeConfig: Record<ProjectActivityType, { icon: typeof Activity; color: string }> = {
  task_created: { icon: Plus, color: 'text-blue-500 bg-blue-500/10' },
  task_completed: { icon: CheckCircle2, color: 'text-green-500 bg-green-500/10' },
  task_updated: { icon: Activity, color: 'text-amber-500 bg-amber-500/10' },
  time_log_added: { icon: Clock, color: 'text-purple-500 bg-purple-500/10' },
  cost_added: { icon: DollarSign, color: 'text-slate-500 bg-slate-500/10' },
};

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "'Today at' h:mm a");
  if (isYesterday(date)) return format(date, "'Yesterday at' h:mm a");
  return format(date, 'MMM d, h:mm a');
}

export function ProjectFeed({ projectId }: ProjectFeedProps) {
  const { data: activity, isLoading, error } = useProjectActivityFeed(projectId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Project Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Unable to load activity feed.
          </p>
        ) : !activity || activity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent activity yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activity.slice(0, 15).map((item) => {
              const config = typeConfig[item.type];
              const IconComponent = config.icon;
              const [iconColor, bgColor] = config.color.split(' ');

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-md shrink-0 ${bgColor}`}>
                    <IconComponent className={`h-3.5 w-3.5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.title}</span>
                      {item.description && (
                        <span className="text-muted-foreground"> · {item.description}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeDate(item.occurredAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
