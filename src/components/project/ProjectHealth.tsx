import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface HealthData {
  hasUpcomingShifts: boolean;
  nextShiftDate: string | null;
  overdueTasks: number;
  openTasks: number;
  isOverBudget: boolean;
  budgetVariance: number;
  hasBudget: boolean;
}

export const ProjectHealth = ({ projectId }: { projectId: string }) => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, [projectId]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);

      // Check upcoming shifts
      const { data: upcomingShifts } = await supabase
        .from('scheduled_shifts')
        .select('scheduled_date')
        .eq('project_id', projectId)
        .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true })
        .limit(1);

      // Check tasks
      const { data: tasks } = await supabase
        .from('project_todos')
        .select('due_date, status')
        .eq('project_id', projectId)
        .neq('status', 'done');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdueTasks = tasks?.filter(t => 
        t.due_date && new Date(t.due_date) < today
      ).length || 0;

      // Check budget
      const { data: costData } = await supabase
        .from('project_costs_view')
        .select('labor_budget, labor_total_cost, labor_budget_variance')
        .eq('project_id', projectId)
        .single();

      setHealth({
        hasUpcomingShifts: (upcomingShifts?.length || 0) > 0,
        nextShiftDate: upcomingShifts?.[0]?.scheduled_date || null,
        overdueTasks,
        openTasks: tasks?.length || 0,
        isOverBudget: costData ? costData.labor_budget_variance < 0 : false,
        budgetVariance: costData?.labor_budget_variance || 0,
        hasBudget: costData ? costData.labor_budget > 0 : false,
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Health Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Labor Status */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-lg ${health.hasUpcomingShifts ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
              <Calendar className={`w-5 h-5 ${health.hasUpcomingShifts ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Labor Status</p>
              <p className={`text-sm font-semibold truncate ${health.hasUpcomingShifts ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {health.hasUpcomingShifts ? 'On Schedule' : 'No upcoming workers'}
              </p>
              {health.nextShiftDate && (
                <p className="text-xs text-muted-foreground">
                  Next: {format(new Date(health.nextShiftDate), 'MMM d')}
                </p>
              )}
            </div>
          </div>

          {/* Task Status */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-lg ${health.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              {health.overdueTasks > 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Task Status</p>
              {health.overdueTasks > 0 ? (
                <>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {health.overdueTasks} Overdue
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.openTasks} total open
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {health.openTasks === 0 ? 'All Clear' : `${health.openTasks} on track`}
                </p>
              )}
            </div>
          </div>

          {/* Cost Status */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-lg ${health.isOverBudget ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <DollarSign className={`w-5 h-5 ${health.isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Cost Status</p>
              {health.hasBudget ? (
                <>
                  <p className={`text-sm font-semibold ${health.isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {health.isOverBudget ? 'Over Budget' : 'Within Budget'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.isOverBudget ? 'Over' : 'Under'} by ${Math.abs(health.budgetVariance).toFixed(0)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">No budget set</p>
              )}
            </div>
          </div>

          {/* Next Scheduled Shift */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Next Scheduled</p>
              {health.nextShiftDate ? (
                <>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {format(new Date(health.nextShiftDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.ceil((new Date(health.nextShiftDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">No shifts scheduled</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};