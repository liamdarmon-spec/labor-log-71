import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Users, Calendar, CheckSquare, TrendingUp, TrendingDown, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ProjectStats {
  laborTotalHours: number;
  laborActualCost: number;
  laborBudget: number;
  laborVariance: number;
  workerCount: number;
}

interface TodayItem {
  type: 'worker' | 'sub' | 'task';
  title: string;
  subtitle?: string;
  hours?: number;
  id: string;
}

interface UpcomingItem {
  date: string;
  type: 'shift' | 'meeting' | 'inspection';
  title: string;
  subtitle?: string;
}

interface OpenIssue {
  type: 'task' | 'estimate' | 'conflict';
  count: number;
  message: string;
  action: string;
}

export const ProjectOverviewEnhanced = ({ projectId }: { projectId: string }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [openIssues, setOpenIssues] = useState<OpenIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [projectId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysLater = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      // Fetch project stats
      const { data: costData } = await supabase
        .from('project_costs_view')
        .select('labor_total_hours, labor_total_cost, labor_budget, labor_budget_variance')
        .eq('project_id', projectId)
        .single();

      const { data: dashboardData } = await supabase
        .from('project_dashboard_view')
        .select('worker_count')
        .eq('project_id', projectId)
        .single();

      if (costData) {
        setStats({
          laborTotalHours: costData.labor_total_hours || 0,
          laborActualCost: costData.labor_total_cost || 0,
          laborBudget: costData.labor_budget || 0,
          laborVariance: costData.labor_budget_variance || 0,
          workerCount: dashboardData?.worker_count || 0,
        });
      }

      // Fetch today's workers
      const { data: todayWorkers } = await supabase
        .from('scheduled_shifts')
        .select('id, scheduled_hours, worker:workers(name, trade)')
        .eq('project_id', projectId)
        .eq('scheduled_date', today);

      // Fetch today's subs
      const { data: todaySubs } = await supabase
        .from('sub_scheduled_shifts')
        .select('id, scheduled_hours, subs(name, trade)')
        .eq('project_id', projectId)
        .eq('scheduled_date', today);

      // Fetch today's tasks
      const { data: todayTasks } = await supabase
        .from('project_todos')
        .select('id, title, task_type')
        .eq('project_id', projectId)
        .eq('due_date', today)
        .not('status', 'eq', 'done');

      const todayData: TodayItem[] = [
        ...(todayWorkers || []).map(w => ({
          type: 'worker' as const,
          title: w.worker?.name || 'Unknown Worker',
          subtitle: w.worker?.trade,
          hours: w.scheduled_hours,
          id: w.id,
        })),
        ...(todaySubs || []).map(s => ({
          type: 'sub' as const,
          title: s.subs?.name || 'Unknown Sub',
          subtitle: s.subs?.trade,
          hours: s.scheduled_hours || undefined,
          id: s.id,
        })),
        ...(todayTasks || []).map(t => ({
          type: 'task' as const,
          title: t.title,
          subtitle: t.task_type,
          id: t.id,
        })),
      ];
      setTodayItems(todayData);

      // Fetch upcoming shifts and tasks
      const { data: upcomingShifts } = await supabase
        .from('scheduled_shifts')
        .select('scheduled_date, scheduled_hours, worker:workers(name)')
        .eq('project_id', projectId)
        .gt('scheduled_date', today)
        .lte('scheduled_date', sevenDaysLater)
        .order('scheduled_date', { ascending: true });

      const { data: upcomingTasks } = await supabase
        .from('project_todos')
        .select('due_date, title, task_type')
        .eq('project_id', projectId)
        .not('due_date', 'is', null)
        .gt('due_date', today)
        .lte('due_date', sevenDaysLater)
        .in('task_type', ['meeting', 'inspection'])
        .order('due_date', { ascending: true });

      const upcomingData: UpcomingItem[] = [
        ...(upcomingShifts || []).map(s => ({
          date: s.scheduled_date,
          type: 'shift' as const,
          title: s.worker?.name || 'Worker shift',
          subtitle: `${s.scheduled_hours}h`,
        })),
        ...(upcomingTasks || []).map(t => ({
          date: t.due_date!,
          type: t.task_type === 'meeting' ? 'meeting' as const : 'inspection' as const,
          title: t.title,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      setUpcomingItems(upcomingData);

      // Fetch open issues
      const issues: OpenIssue[] = [];

      const { count: openTaskCount } = await supabase
        .from('project_todos')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .not('status', 'eq', 'done');

      if (openTaskCount && openTaskCount > 0) {
        issues.push({
          type: 'task',
          count: openTaskCount,
          message: `${openTaskCount} open task${openTaskCount > 1 ? 's' : ''}`,
          action: 'Review tasks',
        });
      }

      const { count: draftEstimateCount } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', ['draft', 'sent']);

      if (draftEstimateCount && draftEstimateCount > 0) {
        issues.push({
          type: 'estimate',
          count: draftEstimateCount,
          message: `${draftEstimateCount} estimate${draftEstimateCount > 1 ? 's' : ''} not accepted`,
          action: 'Review estimates',
        });
      }

      setOpenIssues(issues);
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

  if (!stats) return null;

  const laborVarianceColor = stats.laborVariance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Total Labor Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.laborTotalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.workerCount} worker{stats.workerCount !== 1 ? 's' : ''} logged time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Labor Actual Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${stats.laborActualCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ${stats.laborBudget > 0 ? stats.laborBudget.toFixed(0) : '0'} budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              {stats.laborVariance >= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              Labor Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.laborBudget > 0 ? (
              <>
                <p className={`text-2xl font-bold ${laborVarianceColor}`}>
                  {stats.laborVariance >= 0 ? 'Under' : 'Over'} by ${Math.abs(stats.laborVariance).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((Math.abs(stats.laborVariance) / stats.laborBudget) * 100).toFixed(1)}% variance
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">$0</p>
                <p className="text-xs text-muted-foreground mt-1">No budget set</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="w-4 h-4" />
              Open Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openIssues.reduce((sum, i) => sum + i.count, 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {openIssues.length} type{openIssues.length !== 1 ? 's' : ''} of issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today on This Project */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today on This Project
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`, { state: { tab: 'schedule' } })}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nothing scheduled for today</p>
          ) : (
            <div className="space-y-2">
              {todayItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {item.type === 'worker' && <Users className="w-4 h-4 text-blue-500" />}
                    {item.type === 'sub' && <Users className="w-4 h-4 text-green-500" />}
                    {item.type === 'task' && <CheckSquare className="w-4 h-4 text-purple-500" />}
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                    </div>
                  </div>
                  {item.hours && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.hours}h
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next 7 Days */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Next 7 Days</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`, { state: { tab: 'tasks' } })}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Tasks
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nothing scheduled for the next week</p>
          ) : (
            <div className="space-y-3">
              {upcomingItems.slice(0, 7).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{format(new Date(item.date), 'MMM')}</p>
                    <p className="text-lg font-bold">{format(new Date(item.date), 'd')}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <p className="font-medium text-sm">{item.title}</p>
                    </div>
                    {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Issues */}
      {openIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Open Items Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openIssues.map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{issue.count}</Badge>
                    <p className="text-sm font-medium">{issue.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const tabMap = { task: 'tasks', estimate: 'estimates', conflict: 'schedule' };
                      navigate(`/projects/${projectId}`, { state: { tab: tabMap[issue.type] } });
                    }}
                  >
                    {issue.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};