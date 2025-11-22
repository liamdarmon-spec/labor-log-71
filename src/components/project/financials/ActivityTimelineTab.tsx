import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, DollarSign, FileText, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityTimelineTabProps {
  projectId: string;
}

type ActivityEvent = {
  id: string;
  type: 'time_log' | 'payment' | 'budget_sync' | 'estimate';
  date: string;
  description: string;
  amount?: number;
  metadata?: any;
};

export function ActivityTimelineTab({ projectId }: ActivityTimelineTabProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['project-activity-timeline', projectId],
    queryFn: async () => {
      const activities: ActivityEvent[] = [];

      // Fetch recent time logs
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*, workers(name, hourly_rate)')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(20);

      logs?.forEach(log => {
        const cost = (log.hours_worked || 0) * (log.workers?.hourly_rate || 0);
        activities.push({
          id: log.id,
          type: 'time_log',
          date: log.date,
          description: `${log.workers?.name} logged ${log.hours_worked}h`,
          amount: cost,
          metadata: log,
        });
      });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, daily_logs!inner(project_id)')
        .eq('daily_logs.project_id', projectId)
        .order('payment_date', { ascending: false })
        .limit(10);

      payments?.forEach(payment => {
        activities.push({
          id: payment.id,
          type: 'payment',
          date: payment.payment_date,
          description: `Payment recorded: ${payment.paid_by}`,
          amount: payment.amount,
          metadata: payment,
        });
      });

      // Fetch estimate syncs
      const { data: estimates } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_budget_source', true)
        .order('updated_at', { ascending: false });

      estimates?.forEach(estimate => {
        activities.push({
          id: estimate.id,
          type: 'budget_sync',
          date: estimate.updated_at || estimate.created_at || '',
          description: `Budget baseline synced from "${estimate.title}"`,
          amount: estimate.total_amount || 0,
          metadata: estimate,
        });
      });

      // Sort all activities by date
      return activities.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
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
      case 'time_log':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'budget_sync':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'estimate':
        return <Calendar className="h-5 w-5 text-orange-600" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getEventBadge = (type: ActivityEvent['type']) => {
    const badges = {
      time_log: { label: 'Time Log', variant: 'default' as const },
      payment: { label: 'Payment', variant: 'default' as const },
      budget_sync: { label: 'Budget Sync', variant: 'secondary' as const },
      estimate: { label: 'Estimate', variant: 'outline' as const },
    };
    return badges[type];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Activity Timeline</h3>
        <p className="text-muted-foreground">
          Chronological feed of all financial events for this project
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {events?.length || 0} financial event{events?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-1">
              {events.map((event, index) => {
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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm font-medium">
                            {event.description}
                          </p>
                        </div>
                        {event.amount !== undefined && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              ${event.amount.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Financial events will appear here as they occur
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
