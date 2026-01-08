import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { CheckSquare, CalendarDays, Plus } from 'lucide-react';

import { ActionRow, ActionRowProps } from '@/components/project-hub/ActionRow';
import { WeeklySummary, WeeklySummaryProps } from '@/components/project-hub/WeeklySummary';
import { BudgetMiniOverview, BudgetMiniOverviewProps, BudgetCategorySummary } from '@/components/project-hub/BudgetMiniOverview';
import { WorkforceMiniTable, WorkforceMiniTableProps, WorkforceRow } from '@/components/project-hub/WorkforceMiniTable';
import { ProjectFeed } from '@/components/project-hub/ProjectFeed';
import { useProjectTaskCounts } from '@/hooks/useTasks';

import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { AddCostDialog } from '@/components/financials/AddCostDialog';

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

  // Schedule health + weekly data
  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['project-overview-schedule', projectId, weekStart],
    queryFn: async () => {
      const [pastSchedules, pastLogs, todaySchedule, weekSchedule, weekLogs] = await Promise.all([
        supabase
          .from('work_schedules')
          .select('scheduled_date')
          .eq('project_id', projectId)
          .lt('scheduled_date', today),
        supabase
          .from('time_logs')
          .select('date')
          .eq('project_id', projectId)
          .lt('date', today),
        supabase
          .from('work_schedules')
          .select('worker_id, scheduled_hours')
          .eq('project_id', projectId)
          .eq('scheduled_date', today),
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

      const scheduledDays = new Set(pastSchedules.data?.map(s => s.scheduled_date) || []).size;
      const loggedDays = new Set(pastLogs.data?.map(l => l.date) || []).size;
      const scheduleHealthPercent = scheduledDays > 0 ? (loggedDays / scheduledDays) * 100 : null;

      const workersToday = new Set(todaySchedule.data?.map(s => s.worker_id) || []).size;
      const hoursScheduledThisWeek = weekSchedule.data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const hoursLoggedThisWeek = weekLogs.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      return {
        scheduleHealthPercent,
        workersToday,
        hoursScheduledThisWeek,
        hoursLoggedThisWeek,
        varianceHoursThisWeek: hoursScheduledThisWeek - hoursLoggedThisWeek,
      };
    },
  });

  // Budget data
  const { data: budgetData, isLoading: loadingBudget } = useQuery({
    queryKey: ['project-overview-budget', projectId],
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

      const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
      const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);
      const budgetVariance = totalBudget - totalActual;

      return { categories, budgetVariance };
    },
  });

  // Tasks data - use the canonical hook
  const { data: taskCounts, isLoading: loadingTasks } = useProjectTaskCounts(projectId);

  // Workforce snapshot (last 7 days)
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
        trade: w.trades?.name || null,
        hours: workerStats.get(w.id)?.hours || 0,
        unpaidAmount: workerStats.get(w.id)?.unpaid || 0,
      })).sort((a, b) => (b.hours || 0) - (a.hours || 0)).slice(0, 6) || [];

      return rows;
    },
  });

  // ========== LOADING STATE ==========
  const isLoading = loadingSchedule || loadingBudget || loadingTasks || loadingWorkforce;

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

  // Canonical CO route: /app/change-orders
  // Passing projectId as query param filters the list to this project
  const actionHandlers: ActionRowProps = {
    onNewTask: undefined, // CreateTaskDialog uses trigger pattern below
    onScheduleWorkers: () => setShowScheduleDialog(true),
    onAddDocument: undefined, // Coming soon
    onLogCost: () => setShowCostDialog(true),
    onAddChangeOrder: () => navigate(`/app/change-orders?projectId=${projectId}`),
  };

  const weeklySummaryProps: WeeklySummaryProps = {
    workersScheduledToday: scheduleData?.workersToday,
    hoursScheduledThisWeek: scheduleData?.hoursScheduledThisWeek,
    hoursLoggedThisWeek: scheduleData?.hoursLoggedThisWeek,
    varianceHoursThisWeek: scheduleData?.varianceHoursThisWeek,
    openItemsCount: taskCounts?.open ?? 0,
    overdueTasksCount: taskCounts?.overdue ?? 0,
  };

  const budgetProps: BudgetMiniOverviewProps = {
    categories: budgetData?.categories || [],
    onOpenBudget: () => setSearchParams({ tab: 'budget' }),
  };

  const workforceProps: WorkforceMiniTableProps = {
    rows: workforceData || [],
    onViewAll: () => setSearchParams({ tab: 'labor' }),
  };

  // ========== RENDER ==========

  return (
    <div className="space-y-4 pb-6">
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
