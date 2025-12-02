import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Clock, ClipboardCheck, CalendarCheck, 
  AlertCircle, Calendar 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklySummaryProps {
  projectId: string;
}

export function WeeklySummary({ projectId }: WeeklySummaryProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-summary', projectId, weekStart],
    queryFn: async () => {
      const [todayScheduleRes, weekScheduleRes, weekLogsRes, tasksRes] = await Promise.all([
        // Today's scheduled workers
        supabase
          .from('work_schedules')
          .select('worker_id, scheduled_hours, workers(name)')
          .eq('project_id', projectId)
          .eq('scheduled_date', today),
        // Week's scheduled hours
        supabase
          .from('work_schedules')
          .select('scheduled_hours')
          .eq('project_id', projectId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
        // Week's logged hours
        supabase
          .from('time_logs')
          .select('hours_worked')
          .eq('project_id', projectId)
          .gte('date', weekStart)
          .lte('date', weekEnd),
        // Overdue + today's tasks
        supabase
          .from('project_todos')
          .select('id, due_date, task_type, status')
          .eq('project_id', projectId)
          .neq('status', 'done'),
      ]);

      const workersToday = new Set(todayScheduleRes.data?.map(s => s.worker_id) || []).size;
      const scheduledHours = weekScheduleRes.data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const loggedHours = weekLogsRes.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;
      const variance = scheduledHours - loggedHours;

      // Tasks analysis
      const overdueTasks = tasksRes.data?.filter(t => t.due_date && t.due_date < today).length || 0;
      const todayMeetings = tasksRes.data?.filter(t => 
        t.due_date === today && (t.task_type === 'meeting' || t.task_type === 'inspection')
      ).length || 0;

      return {
        workersToday,
        scheduledHours,
        loggedHours,
        variance,
        overdueTasks,
        todayMeetings,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Workers Today',
      value: data?.workersToday || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Scheduled Hours',
      value: `${data?.scheduledHours.toFixed(1)}h`,
      icon: Calendar,
      color: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
    },
    {
      label: 'Logged Hours',
      value: `${data?.loggedHours.toFixed(1)}h`,
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Variance',
      value: `${data?.variance && data.variance > 0 ? '-' : '+'}${Math.abs(data?.variance || 0).toFixed(1)}h`,
      icon: ClipboardCheck,
      color: data?.variance && data.variance > 0 ? 'text-amber-600' : 'text-emerald-600',
      bgColor: data?.variance && data.variance > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
    {
      label: 'Overdue Tasks',
      value: data?.overdueTasks || 0,
      icon: AlertCircle,
      color: data?.overdueTasks ? 'text-red-600' : 'text-muted-foreground',
      bgColor: data?.overdueTasks ? 'bg-red-500/10' : 'bg-muted/50',
    },
    {
      label: 'Meetings Today',
      value: data?.todayMeetings || 0,
      icon: CalendarCheck,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  {metric.label}
                </p>
                <p className={`text-xl font-bold ${metric.color}`}>
                  {metric.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
