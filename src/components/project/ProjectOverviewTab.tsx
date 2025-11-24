import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectOverviewTabProps {
  projectId: string;
}

export function ProjectOverviewTab({ projectId }: ProjectOverviewTabProps) {
  // Today's schedule
  const { data: todaySchedule, isLoading: loadingToday } = useQuery({
    queryKey: ['today-schedule', projectId],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('work_schedules')
        .select('*, workers(name, trade)')
        .eq('project_id', projectId)
        .eq('scheduled_date', today);
      return data || [];
    },
  });

  // This week's data
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  const { data: weekData, isLoading: loadingWeek } = useQuery({
    queryKey: ['week-data', projectId, weekStart],
    queryFn: async () => {
      const [scheduleRes, logsRes] = await Promise.all([
        supabase
          .from('work_schedules')
          .select('scheduled_hours')
          .eq('project_id', projectId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
        supabase
          .from('daily_logs')
          .select('hours_worked')
          .eq('project_id', projectId)
          .gte('date', weekStart)
          .lte('date', weekEnd),
      ]);

      const scheduledHours = scheduleRes.data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const loggedHours = logsRes.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      return { scheduledHours, loggedHours };
    },
  });

  // Budget snapshot
  const { data: budgetData, isLoading: loadingBudget } = useQuery({
    queryKey: ['budget-snapshot', projectId],
    queryFn: async () => {
      const [budgetRes, laborRes] = await Promise.all([
        supabase
          .from('project_budgets')
          .select('*')
          .eq('project_id', projectId)
          .single(),
        supabase
          .from('daily_logs')
          .select('hours_worked, worker_id')
          .eq('project_id', projectId),
      ]);

      const workerIds = [...new Set(laborRes.data?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);
      const laborActual = laborRes.data?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      return {
        labor: {
          budget: budgetRes.data?.labor_budget || 0,
          actual: laborActual,
          variance: (budgetRes.data?.labor_budget || 0) - laborActual,
        },
        subs: {
          budget: budgetRes.data?.subs_budget || 0,
          actual: 0, // Placeholder
          variance: budgetRes.data?.subs_budget || 0,
        },
        materials: {
          budget: budgetRes.data?.materials_budget || 0,
          actual: 0, // Placeholder
          variance: budgetRes.data?.materials_budget || 0,
        },
        misc: {
          budget: budgetRes.data?.other_budget || 0,
          actual: 0, // Placeholder
          variance: budgetRes.data?.other_budget || 0,
        },
      };
    },
  });

  // Open tasks
  const { data: openTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['open-tasks', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_todos')
        .select('*, workers(name)')
        .eq('project_id', projectId)
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  if (loadingToday || loadingWeek || loadingBudget || loadingTasks) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getBudgetVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600';
    if (variance > 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Today / This Week At A Glance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today & This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Workers Scheduled Today</p>
              <p className="text-2xl font-bold">{todaySchedule?.length || 0}</p>
              {todaySchedule && todaySchedule.length > 0 && (
                <div className="mt-2 space-y-1">
                  {todaySchedule.slice(0, 3).map((shift: any) => (
                    <p key={shift.id} className="text-xs text-muted-foreground">
                      {shift.workers?.name} ({shift.workers?.trade}) - {shift.scheduled_hours}h
                    </p>
                  ))}
                  {todaySchedule.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{todaySchedule.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Hours Scheduled This Week</p>
              <p className="text-2xl font-bold">{weekData?.scheduledHours.toFixed(1) || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Hours Logged This Week</p>
              <p className="text-2xl font-bold">{weekData?.loggedHours.toFixed(1) || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Actual Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['labor', 'subs', 'materials', 'misc'].map((category) => {
              const data = budgetData?.[category as keyof typeof budgetData];
              const percentUsed = data?.budget ? (data.actual / data.budget) * 100 : 0;
              const isOverBudget = percentUsed > 90;

              return (
                <Card key={category} className={isOverBudget ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium capitalize mb-2">{category}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">${data?.budget.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-medium">${data?.actual.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Variance:</span>
                        <span className={`font-medium ${getBudgetVarianceColor(data?.variance || 0)}`}>
                          ${Math.abs(data?.variance || 0).toLocaleString()}
                        </span>
                      </div>
                      {isOverBudget && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Over 90% used</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Open Issues / Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Open Tasks
          </CardTitle>
          <CardDescription>Top 5 pending tasks and issues</CardDescription>
        </CardHeader>
        <CardContent>
          {openTasks && openTasks.length > 0 ? (
            <div className="space-y-3">
              {openTasks.map((task: any) => (
                <div key={task.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {task.task_type}
                      </Badge>
                      {task.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                      )}
                      {task.workers?.name && (
                        <span>Assigned: {task.workers.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No open tasks</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
