import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar, DollarSign, UserPlus, Edit, Split, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type ActivityEvent = {
  id: string;
  type: 'schedule' | 'log' | 'payment' | 'edit' | 'split';
  timestamp: string;
  description: string;
  workerName?: string;
  projectName?: string;
  amount?: number;
  metadata?: any;
};

export function ActivityTab() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['workforce-activity'],
    queryFn: async () => {
      const activities: ActivityEvent[] = [];

      // Fetch recent schedule events
      const { data: schedules } = await supabase
        .from('scheduled_shifts')
        .select('*, workers(name), projects(project_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      schedules?.forEach(schedule => {
        activities.push({
          id: schedule.id,
          type: 'schedule',
          timestamp: schedule.created_at,
          description: `Worker scheduled`,
          workerName: schedule.workers?.name,
          projectName: schedule.projects?.project_name,
          metadata: schedule,
        });
      });

      // Fetch recent time log events
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*, workers(name), projects(project_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      logs?.forEach(log => {
        activities.push({
          id: log.id,
          type: 'log',
          timestamp: log.created_at,
          description: `Time log created`,
          workerName: log.workers?.name,
          projectName: log.projects?.project_name,
          metadata: log,
        });
      });

      // Fetch recent payment events
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      payments?.forEach(payment => {
        activities.push({
          id: payment.id,
          type: 'payment',
          timestamp: payment.created_at,
          description: `Payment batch created`,
          amount: payment.amount,
          metadata: payment,
        });
      });

      // Sort all activities by timestamp
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 50);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'log':
        return <Clock className="h-5 w-5 text-green-600" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-purple-600" />;
      case 'edit':
        return <Edit className="h-5 w-5 text-orange-600" />;
      case 'split':
        return <Split className="h-5 w-5 text-pink-600" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getEventBadge = (type: ActivityEvent['type']) => {
    const badges = {
      schedule: { label: 'Scheduled', variant: 'default' as const },
      log: { label: 'Time Log', variant: 'default' as const },
      payment: { label: 'Payment', variant: 'secondary' as const },
      edit: { label: 'Edit', variant: 'outline' as const },
      split: { label: 'Split', variant: 'outline' as const },
    };
    return badges[type];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Activity Feed</h3>
        <p className="text-muted-foreground">
          Real-time feed of all workforce-related events
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-1">
              {events.map((event) => {
                const badge = getEventBadge(event.type);
                return (
                  <div 
                    key={event.id}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="mt-1 p-2 rounded-lg bg-muted">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {event.amount !== undefined && (
                          <span className="text-lg font-bold text-primary">
                            ${event.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {event.description}
                      </p>
                      {(event.workerName || event.projectName) && (
                        <p className="text-sm text-muted-foreground">
                          {event.workerName && <span>{event.workerName}</span>}
                          {event.workerName && event.projectName && <span> → </span>}
                          {event.projectName && <span>{event.projectName}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Workforce events will appear here as they occur
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
