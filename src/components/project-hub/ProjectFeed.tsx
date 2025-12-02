import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, CheckCircle2, Clock, FileText, Receipt, 
  CalendarPlus, Users, DollarSign 
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectFeedProps {
  projectId: string;
}

interface FeedItem {
  id: string;
  type: 'task' | 'schedule' | 'time_log' | 'cost' | 'document';
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function ProjectFeed({ projectId }: ProjectFeedProps) {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data: feedItems, isLoading } = useQuery({
    queryKey: ['project-feed', projectId],
    queryFn: async () => {
      const items: FeedItem[] = [];

      // Fetch recent tasks
      const { data: tasks } = await supabase
        .from('project_todos')
        .select('id, title, status, created_at, completed_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      tasks?.forEach(task => {
        items.push({
          id: `task-created-${task.id}`,
          type: 'task',
          action: 'Task created',
          description: task.title,
          timestamp: task.created_at,
        });
        if (task.completed_at) {
          items.push({
            id: `task-completed-${task.id}`,
            type: 'task',
            action: 'Task completed',
            description: task.title,
            timestamp: task.completed_at,
          });
        }
      });

      // Fetch recent schedules
      const { data: schedules } = await supabase
        .from('work_schedules')
        .select('id, scheduled_date, scheduled_hours, workers(name), created_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      schedules?.forEach(schedule => {
        items.push({
          id: `schedule-${schedule.id}`,
          type: 'schedule',
          action: 'Worker scheduled',
          description: `${schedule.workers?.name || 'Worker'} for ${schedule.scheduled_hours}h on ${format(parseISO(schedule.scheduled_date), 'MMM d')}`,
          timestamp: schedule.created_at,
        });
      });

      // Fetch recent time logs
      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('id, date, hours_worked, workers(name), created_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      timeLogs?.forEach(log => {
        items.push({
          id: `time-${log.id}`,
          type: 'time_log',
          action: 'Time logged',
          description: `${log.workers?.name || 'Worker'} logged ${log.hours_worked}h`,
          timestamp: log.created_at,
        });
      });

      // Fetch recent costs
      const { data: costs } = await supabase
        .from('costs')
        .select('id, description, amount, category, created_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      costs?.forEach(cost => {
        items.push({
          id: `cost-${cost.id}`,
          type: 'cost',
          action: `${cost.category || 'Cost'} added`,
          description: `${cost.description} - $${cost.amount?.toLocaleString()}`,
          timestamp: cost.created_at,
        });
      });

      // Fetch recent documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, file_name, document_type, created_at')
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      documents?.forEach(doc => {
        items.push({
          id: `doc-${doc.id}`,
          type: 'document',
          action: 'Document uploaded',
          description: doc.file_name,
          timestamp: doc.created_at,
        });
      });

      // Sort all items by timestamp descending
      return items.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 20);
    },
  });

  const getIcon = (type: FeedItem['type'], action: string) => {
    if (action.includes('completed')) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    switch (type) {
      case 'task':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'schedule':
        return <CalendarPlus className="h-4 w-4 text-violet-500" />;
      case 'time_log':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'cost':
        return <Receipt className="h-4 w-4 text-emerald-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {feedItems && feedItems.length > 0 ? (
          <ScrollArea className="h-[320px]">
            <div className="px-6 pb-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                
                <div className="space-y-4">
                  {feedItems.map((item, index) => (
                    <div key={item.id} className="relative flex items-start gap-4 pl-1">
                      {/* Icon */}
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border">
                        {getIcon(item.type, item.action)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="px-6 pb-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
