import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertTriangle, XCircle, 
  TrendingUp, TrendingDown, Clock, ListTodo 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface SnapshotBarProps {
  projectId: string;
  projectName: string;
  clientName: string;
  status: string;
}

export function SnapshotBar({ projectId, projectName, clientName, status }: SnapshotBarProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['snapshot-metrics', projectId],
    queryFn: async () => {
      const [scheduleRes, budgetRes, laborRes, tasksRes] = await Promise.all([
        // Schedule health
        supabase
          .from('work_schedules')
          .select('scheduled_date')
          .eq('project_id', projectId)
          .lt('scheduled_date', today),
        // Budget data
        supabase
          .from('project_budgets')
          .select('labor_budget, subs_budget, materials_budget, other_budget')
          .eq('project_id', projectId)
          .maybeSingle(),
        // Labor this week
        supabase
          .from('time_logs')
          .select('hours_worked, labor_cost')
          .eq('project_id', projectId)
          .gte('date', weekStart)
          .lte('date', weekEnd),
        // Open tasks
        supabase
          .from('project_todos')
          .select('id')
          .eq('project_id', projectId)
          .neq('status', 'done'),
      ]);

      // Schedule health calculation
      const scheduledDays = new Set(scheduleRes.data?.map(s => s.scheduled_date) || []).size;
      const { data: loggedDays } = await supabase
        .from('time_logs')
        .select('date')
        .eq('project_id', projectId)
        .lt('date', today);
      const uniqueLoggedDays = new Set(loggedDays?.map(l => l.date) || []).size;
      const scheduleCompletion = scheduledDays > 0 ? (uniqueLoggedDays / scheduledDays) * 100 : 100;
      
      // Budget variance
      const totalBudget = (budgetRes.data?.labor_budget || 0) + 
                          (budgetRes.data?.subs_budget || 0) + 
                          (budgetRes.data?.materials_budget || 0) + 
                          (budgetRes.data?.other_budget || 0);
      
      const { data: allCosts } = await supabase
        .from('costs')
        .select('amount')
        .eq('project_id', projectId);
      const nonLaborActual = allCosts?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      
      const { data: allLabor } = await supabase
        .from('time_logs')
        .select('labor_cost')
        .eq('project_id', projectId);
      const laborActual = allLabor?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0;
      
      const totalActual = laborActual + nonLaborActual;
      const budgetVariance = totalBudget - totalActual;

      // Labor hours this week
      const laborHours = laborRes.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      // Open tasks count
      const openTasks = tasksRes.data?.length || 0;

      return {
        scheduleHealth: scheduleCompletion >= 80 ? 'on-track' : scheduleCompletion >= 50 ? 'at-risk' : 'delayed',
        schedulePercent: scheduleCompletion,
        budgetStatus: budgetVariance >= 0 ? 'under' : 'over',
        budgetVariance,
        laborHours,
        openTasks,
      };
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'on-hold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScheduleIcon = () => {
    if (!metrics) return null;
    switch (metrics.scheduleHealth) {
      case 'on-track': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'at-risk': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'delayed': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 lg:p-5 bg-card border rounded-xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 lg:p-5 bg-card border rounded-xl shadow-sm">
      {/* Left: Project Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{projectName}</h1>
            <Badge variant="outline" className={getStatusColor(status)}>
              {status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Client: {clientName}</p>
        </div>
      </div>

      {/* Right: Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
        {/* Schedule Health */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          {getScheduleIcon()}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Schedule</p>
            <p className={`text-sm font-semibold capitalize ${
              metrics?.scheduleHealth === 'on-track' ? 'text-emerald-600' :
              metrics?.scheduleHealth === 'at-risk' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {metrics?.scheduleHealth?.replace('-', ' ')}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          {metrics?.budgetStatus === 'under' ? (
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 text-red-500" />
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget</p>
            <p className={`text-sm font-semibold ${
              metrics?.budgetStatus === 'under' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {metrics?.budgetStatus === 'under' ? '+' : '-'}${Math.abs(metrics?.budgetVariance || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Labor This Week */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Week</p>
            <p className="text-sm font-semibold">{metrics?.laborHours.toFixed(1)}h</p>
          </div>
        </div>

        {/* Open Tasks */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <ListTodo className="h-3.5 w-3.5 text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tasks</p>
            <p className="text-sm font-semibold">{metrics?.openTasks} open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
