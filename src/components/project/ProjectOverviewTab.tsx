import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { CheckSquare, CalendarDays, Plus, AlertTriangle, HardHat, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { ActionRow, ActionRowProps } from '@/components/project-hub/ActionRow';
import { WeeklySummary, WeeklySummaryProps } from '@/components/project-hub/WeeklySummary';
import { BudgetMiniOverview, BudgetMiniOverviewProps, BudgetCategorySummary } from '@/components/project-hub/BudgetMiniOverview';
import { WorkforceMiniTable, WorkforceMiniTableProps, WorkforceRow } from '@/components/project-hub/WorkforceMiniTable';
import { ProjectFeed } from '@/components/project-hub/ProjectFeed';
import { useProjectStats } from '@/hooks/useProjectStats';

import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { AddCostDialog } from '@/components/financials/AddCostDialog';

// Alert Banner Component for budget issues
interface AlertBannerProps {
  type: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function AlertBanner({ type, title, description, action }: AlertBannerProps) {
  const styles = {
    critical: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50',
    warning: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
  };
  
  const iconStyles = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-orange-600 dark:text-orange-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className={cn("border rounded-xl", styles[type])}>
      <CardContent className="p-3 flex items-center gap-3">
        <AlertTriangle className={cn("w-5 h-5 flex-shrink-0", iconStyles[type])} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {action && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={action.onClick}
            className="gap-1 text-xs h-7 flex-shrink-0"
          >
            {action.label}
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Today's Crew Component
interface TodayCrewMember {
  id: string;
  name: string;
  trade: string | null;
  scheduledHours: number;
}

function TodaysCrewSection({ 
  crew, 
  onViewSchedule 
}: { 
  crew: TodayCrewMember[]; 
  onViewSchedule: () => void;
}) {
  if (crew.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 rounded-xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">On Site Today</span>
            <span className="text-xs text-muted-foreground">
              ({crew.reduce((sum, c) => sum + c.scheduledHours, 0)}h scheduled)
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewSchedule}
            className="text-xs h-6 px-2"
          >
            View Schedule
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {crew.map((member) => (
            <div 
              key={member.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border text-sm"
            >
              <span className="font-medium">{member.name}</span>
              {member.trade && (
                <span className="text-xs text-muted-foreground">
                  {member.trade}
                </span>
              )}
              <span className="text-xs text-primary font-medium">
                {member.scheduledHours}h
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectOverviewTabProps {
  projectId: string;
}

export function ProjectOverviewTab({ projectId }: ProjectOverviewTabProps) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  
  // Dialog states
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // ========== DATA QUERIES ==========

  // Use the RPC-based hook for project stats
  const { data: stats, isLoading: loadingStats } = useProjectStats(projectId);

  // Schedule hours for this week (RPC doesn't include this breakdown)
  const { data: weeklyScheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['project-overview-weekly-schedule', projectId, weekStart],
    queryFn: async () => {
      const [weekSchedule, weekLogs] = await Promise.all([
        supabase
          .from('work_schedules')
          .select('scheduled_hours')
          .eq('project_id', projectId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
        supabase
          .from('time_logs')
          .select('hours_worked')
          .eq('project_id', projectId)
          .gte('date', weekStart)
          .lte('date', weekEnd),
      ]);

      const hoursScheduledThisWeek = weekSchedule.data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const hoursLoggedThisWeek = weekLogs.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      return {
        hoursScheduledThisWeek,
        hoursLoggedThisWeek,
        varianceHoursThisWeek: hoursScheduledThisWeek - hoursLoggedThisWeek,
      };
    },
  });

  // Budget categories breakdown (RPC only has totals)
  const { data: budgetCategories, isLoading: loadingBudgetCategories } = useQuery({
    queryKey: ['project-overview-budget-categories', projectId],
    queryFn: async () => {
      const [budgetRes, laborRes, costsRes] = await Promise.all([
        supabase
          .from('project_budgets')
          .select('labor_budget, subs_budget, materials_budget, other_budget')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('time_logs')
          .select('labor_cost')
          .eq('project_id', projectId),
        supabase
          .from('costs')
          .select('amount, category')
          .eq('project_id', projectId),
      ]);

      const laborActual = laborRes.data?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0;
      const subsActual = costsRes.data?.filter(c => c.category === 'subs').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const materialsActual = costsRes.data?.filter(c => c.category === 'materials').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const otherActual = costsRes.data?.filter(c => 
        c.category === 'misc' || c.category === 'equipment' || c.category === 'other' || !c.category
      ).reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      const categories: BudgetCategorySummary[] = [
        { label: 'Labor', budget: budgetRes.data?.labor_budget || 0, actual: laborActual },
        { label: 'Subs', budget: budgetRes.data?.subs_budget || 0, actual: subsActual },
        { label: 'Materials', budget: budgetRes.data?.materials_budget || 0, actual: materialsActual },
        { label: 'Other', budget: budgetRes.data?.other_budget || 0, actual: otherActual },
      ];

      return categories;
    },
  });

  // Today's crew with names (need worker names for display)
  const { data: todayCrew, isLoading: loadingTodayCrew } = useQuery({
    queryKey: ['project-overview-today-crew', projectId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_schedules')
        .select('worker_id, scheduled_hours, workers(id, name, trades(name))')
        .eq('project_id', projectId)
        .eq('scheduled_date', today);

      const crewMap = new Map<string, TodayCrewMember>();
      data?.forEach((s: any) => {
        if (s.worker_id && s.workers) {
          const existing = crewMap.get(s.worker_id);
          if (existing) {
            existing.scheduledHours += s.scheduled_hours || 0;
          } else {
            crewMap.set(s.worker_id, {
              id: s.worker_id,
              name: s.workers.name || 'Unknown',
              trade: s.workers.trades?.name || null,
              scheduledHours: s.scheduled_hours || 0,
            });
          }
        }
      });
      return Array.from(crewMap.values()).sort((a, b) => b.scheduledHours - a.scheduledHours);
    },
  });

  // Workforce snapshot (last 7 days) - need worker names for display
  const { data: workforceData, isLoading: loadingWorkforce } = useQuery({
    queryKey: ['project-overview-workforce', projectId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from('time_logs')
        .select('worker_id, hours_worked, labor_cost, payment_status')
        .eq('project_id', projectId)
        .gte('date', sevenDaysAgo);

      const workerStats = new Map<string, { hours: number; unpaid: number }>();
      logs?.forEach(log => {
        const current = workerStats.get(log.worker_id) || { hours: 0, unpaid: 0 };
        current.hours += log.hours_worked || 0;
        if (log.payment_status !== 'paid') {
          current.unpaid += log.labor_cost || 0;
        }
        workerStats.set(log.worker_id, current);
      });

      if (workerStats.size === 0) return [];

      const workerIds = Array.from(workerStats.keys());
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, trades(name)')
        .in('id', workerIds);

      const rows: WorkforceRow[] = workers?.map(w => ({
        id: w.id,
        name: w.name,
        trade: (w.trades as any)?.name || null,
        hours: workerStats.get(w.id)?.hours || 0,
        unpaidAmount: workerStats.get(w.id)?.unpaid || 0,
      })).sort((a, b) => (b.hours || 0) - (a.hours || 0)).slice(0, 6) || [];

      return rows;
    },
  });

  // ========== LOADING STATE ==========
  const isLoading = loadingStats || loadingSchedule || loadingBudgetCategories || loadingTodayCrew || loadingWorkforce;

  if (isLoading) {
    return (
      <div className="space-y-4 pt-2 pb-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  // ========== DERIVE PROPS ==========

  const actionHandlers: ActionRowProps = {
    onNewTask: undefined, // CreateTaskDialog uses trigger pattern below
    onScheduleWorkers: () => setShowScheduleDialog(true),
    onAddDocument: undefined, // Coming soon
    onLogCost: () => setShowCostDialog(true),
    onAddChangeOrder: undefined, // Coming soon
  };

  const weeklySummaryProps: WeeklySummaryProps = {
    workersScheduledToday: stats?.todayCrewCount ?? 0,
    hoursScheduledThisWeek: weeklyScheduleData?.hoursScheduledThisWeek ?? 0,
    hoursLoggedThisWeek: weeklyScheduleData?.hoursLoggedThisWeek ?? 0,
    varianceHoursThisWeek: weeklyScheduleData?.varianceHoursThisWeek ?? 0,
    openItemsCount: stats?.openTasks ?? 0,
    overdueTasksCount: stats?.overdueTasks ?? 0,
  };

  const budgetProps: BudgetMiniOverviewProps = {
    categories: budgetCategories || [],
    onOpenBudget: () => setSearchParams({ tab: 'budget' }),
  };

  const workforceProps: WorkforceMiniTableProps = {
    rows: workforceData || [],
    onViewAll: () => setSearchParams({ tab: 'labor' }),
  };

  // ========== ALERT BANNERS ==========
  const alerts: AlertBannerProps[] = [];
  
  // No budget set but has spending
  if (!stats?.hasBudget && stats?.actualTotal && stats.actualTotal > 0) {
    alerts.push({
      type: 'warning',
      title: 'No budget set',
      description: `$${stats.actualTotal.toLocaleString()} spent with no budget tracking`,
      action: {
        label: 'Set Budget',
        onClick: () => setSearchParams({ tab: 'budget' }),
      },
    });
  }
  
  // Over budget
  if (stats?.isOverBudget) {
    const overAmount = stats.actualTotal - stats.budgetTotal;
    alerts.push({
      type: 'critical',
      title: `$${overAmount.toLocaleString()} over budget`,
      description: `${Math.round(stats.percentUsed)}% of budget used`,
      action: {
        label: 'View Budget',
        onClick: () => setSearchParams({ tab: 'budget' }),
      },
    });
  }
  
  // Approaching budget (>85%)
  if (stats?.hasBudget && !stats?.isOverBudget && stats.percentUsed >= 85) {
    alerts.push({
      type: 'warning',
      title: `${Math.round(stats.percentUsed)}% of budget used`,
      description: `$${stats.variance.toLocaleString()} remaining`,
    });
  }

  // Overdue tasks
  if (stats?.overdueTasks && stats.overdueTasks > 0) {
    alerts.push({
      type: 'warning',
      title: `${stats.overdueTasks} overdue task${stats.overdueTasks > 1 ? 's' : ''}`,
      description: 'Tasks past their due date need attention',
      action: {
        label: 'View Tasks',
        onClick: () => setSearchParams({ tab: 'tasks' }),
      },
    });
  }

  // ========== RENDER ==========

  return (
    <div className="space-y-4 pb-6">
      {/* Alert Banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 2).map((alert, i) => (
            <AlertBanner key={i} {...alert} />
          ))}
        </div>
      )}

      {/* Today's Crew - if anyone scheduled */}
      {todayCrew && todayCrew.length > 0 && (
        <TodaysCrewSection 
          crew={todayCrew} 
          onViewSchedule={() => setSearchParams({ tab: 'schedule' })}
        />
      )}

      {/* Action Row - Horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-2 px-2 pb-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {/* Primary action: New Task */}
          <CreateTaskDialog
            projectId={projectId}
            trigger={
              <Button
                size="sm"
                className="gap-1.5 text-xs h-7 px-3 rounded-full"
              >
                <Plus className="h-3 w-3" />
                Task
              </Button>
            }
          />
          
          {/* Secondary actions */}
          <ActionRow {...actionHandlers} />
          
          {/* Separator */}
          <div className="h-5 w-px bg-border/60 mx-1" />
          
          {/* Deep links to global views */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/tasks?projectId=${projectId}`)}
            className="gap-1.5 text-xs h-7 px-2.5 rounded-full text-muted-foreground hover:text-foreground"
          >
            <CheckSquare className="h-3 w-3" />
            All Tasks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/schedule?projectId=${projectId}`)}
            className="gap-1.5 text-xs h-7 px-2.5 rounded-full text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="h-3 w-3" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Weekly Summary KPIs */}
      <WeeklySummary {...weeklySummaryProps} />

      {/* Budget + Workforce Grid */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <BudgetMiniOverview {...budgetProps} />
        <WorkforceMiniTable {...workforceProps} />
      </div>

      {/* Activity Feed */}
      <ProjectFeed projectId={projectId} />

      {/* Dialogs */}
      <AddToScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        defaultProjectId={projectId}
        onScheduleCreated={() => setShowScheduleDialog(false)}
      />

      <AddCostDialog
        open={showCostDialog}
        onOpenChange={setShowCostDialog}
      />
    </div>
  );
}
