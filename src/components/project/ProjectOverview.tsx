import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Users, Calendar, CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface OverviewData {
  estimateTotal: number;
  laborBudget: number;
  laborActual: number;
  laborVariance: number;
  subsBudget: number;
  subsActual: number;
  subsVariance: number;
  openTasks: number;
  upcomingShifts: number;
  hoursThisWeek: number;
}

export const ProjectOverview = ({ projectId }: { projectId: string }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, [projectId]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);

      // Get accepted estimate total
      const { data: estimates } = await supabase
        .from('estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1);

      // Get budget and cost data
      const { data: costData } = await supabase
        .from('project_costs_view')
        .select('labor_budget, labor_total_cost, labor_budget_variance, subs_budget')
        .eq('project_id', projectId)
        .single();

      // Get subs actual cost
      const { data: subLogs } = await supabase
        .from('sub_logs')
        .select('amount')
        .eq('project_id', projectId);

      const subsActual = subLogs?.reduce((sum, log) => sum + Number(log.amount), 0) || 0;

      // Get open tasks
      const { count: tasksCount } = await supabase
        .from('project_todos')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .not('status', 'eq', 'done');

      // Get upcoming shifts (next 30 days)
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysLater = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      const { count: shiftsCount } = await supabase
        .from('work_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('scheduled_date', today)
        .lte('scheduled_date', thirtyDaysLater);

      // Get hours scheduled this week
      const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const { data: weekShifts } = await supabase
        .from('work_schedules')
        .select('scheduled_hours')
        .eq('project_id', projectId)
        .gte('scheduled_date', today)
        .lte('scheduled_date', weekEnd);

      const hoursThisWeek = weekShifts?.reduce((sum, shift) => sum + Number(shift.scheduled_hours), 0) || 0;

      setData({
        estimateTotal: estimates?.[0]?.total_amount || 0,
        laborBudget: costData?.labor_budget || 0,
        laborActual: costData?.labor_total_cost || 0,
        laborVariance: costData?.labor_budget_variance || 0,
        subsBudget: costData?.subs_budget || 0,
        subsActual,
        subsVariance: (costData?.subs_budget || 0) - subsActual,
        openTasks: tasksCount || 0,
        upcomingShifts: shiftsCount || 0,
        hoursThisWeek,
      });
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const laborVarianceColor = data.laborVariance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const subsVarianceColor = data.subsVariance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              Estimate Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.estimateTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.estimateTotal > 0 ? 'Accepted estimate' : 'No accepted estimate'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Labor Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.laborActual.toFixed(2)}</p>
            <p className={`text-sm font-medium ${laborVarianceColor}`}>
              {data.laborVariance >= 0 ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <TrendingUp className="w-3 h-3 inline mr-1" />}
              {data.laborVariance >= 0 ? 'Under' : 'Over'} by ${Math.abs(data.laborVariance).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">of ${data.laborBudget.toFixed(2)} budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Subs Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${data.subsActual.toFixed(2)}</p>
            {data.subsBudget > 0 ? (
              <>
                <p className={`text-sm font-medium ${subsVarianceColor}`}>
                  {data.subsVariance >= 0 ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <TrendingUp className="w-3 h-3 inline mr-1" />}
                  {data.subsVariance >= 0 ? 'Under' : 'Over'} by ${Math.abs(data.subsVariance).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">of ${data.subsBudget.toFixed(2)} budget</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No budget set</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="w-4 h-4" />
              Tasks & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.openTasks}</p>
            <p className="text-xs text-muted-foreground">
              Open tasks · {data.upcomingShifts} upcoming shifts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Health Strip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Project Health:</span>
            <span className="text-muted-foreground">
              {data.openTasks} open task{data.openTasks !== 1 ? 's' : ''} · {data.hoursThisWeek.toFixed(1)} hours scheduled this week · Labor cost ${data.laborActual.toFixed(0)} of ${data.laborBudget.toFixed(0)} budget
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};