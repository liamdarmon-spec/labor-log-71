import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';

import { SnapshotBar, SnapshotBarProps } from '@/components/project-hub/SnapshotBar';
import { ActionRow, ActionRowProps } from '@/components/project-hub/ActionRow';
import { WeeklySummary, WeeklySummaryProps } from '@/components/project-hub/WeeklySummary';
import { BudgetMiniOverview, BudgetMiniOverviewProps, BudgetCategorySummary } from '@/components/project-hub/BudgetMiniOverview';
import { WorkforceMiniTable, WorkforceMiniTableProps, WorkforceRow } from '@/components/project-hub/WorkforceMiniTable';
import { ProjectFeed } from '@/components/project-hub/ProjectFeed';

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

  // Project details
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project-overview-details', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name, client_name, status')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

  // Tasks data
  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['project-overview-tasks', projectId],
    queryFn: async () => {
      const [openRes, overdueRes] = await Promise.all([
        supabase
          .from('project_todos')
          .select('id')
          .eq('project_id', projectId)
          .neq('status', 'done'),
        supabase
          .from('project_todos')
          .select('id')
          .eq('project_id', projectId)
          .neq('status', 'done')
          .lt('due_date', today),
      ]);

      return {
        openTasksCount: openRes.data?.length || 0,
        overdueTasksCount: overdueRes.data?.length || 0,
      };
    },
  });

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
  const isLoading = loadingProject || loadingSchedule || loadingBudget || loadingTasks || loadingWorkforce;

  if (isLoading) {
    return (
      <div className="space-y-8 px-2 md:px-4 lg:px-8 pt-4 pb-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ========== DERIVE PROPS ==========

  const snapshotProps: SnapshotBarProps = {
    projectName: project?.project_name || 'Project',
    projectStatus: project?.status,
    clientName: project?.client_name,
    scheduleHealthPercent: scheduleData?.scheduleHealthPercent,
    budgetVariance: budgetData?.budgetVariance,
    weeklyLaborHours: scheduleData?.hoursLoggedThisWeek,
    openTasksCount: tasksData?.openTasksCount,
  };

  const actionHandlers: ActionRowProps = {
    onNewTask: undefined, // CreateTaskDialog uses trigger pattern below
    onScheduleWorkers: () => setShowScheduleDialog(true),
    onAddDocument: undefined, // Coming soon
    onLogCost: () => setShowCostDialog(true),
    onAddChangeOrder: undefined, // Coming soon
  };

  const weeklySummaryProps: WeeklySummaryProps = {
    workersScheduledToday: scheduleData?.workersToday,
    hoursScheduledThisWeek: scheduleData?.hoursScheduledThisWeek,
    hoursLoggedThisWeek: scheduleData?.hoursLoggedThisWeek,
    varianceHoursThisWeek: scheduleData?.varianceHoursThisWeek,
    openItemsCount: tasksData?.openTasksCount,
    overdueTasksCount: tasksData?.overdueTasksCount,
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
    <div className="space-y-8 px-2 md:px-4 lg:px-8 pt-4 pb-8">
      <SnapshotBar {...snapshotProps} />
      
      {/* Custom ActionRow with CreateTaskDialog trigger */}
      <div className="overflow-x-auto -mx-2 px-2 pb-1">
        <div className="flex gap-2 min-w-max">
          <CreateTaskDialog
            projectId={projectId}
            trigger={
              <button className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs h-8 px-3 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                New Task
              </button>
            }
          />
          <ActionRow {...actionHandlers} />
        </div>
      </div>

      <WeeklySummary {...weeklySummaryProps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <BudgetMiniOverview {...budgetProps} />
        <WorkforceMiniTable {...workforceProps} />
      </div>

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
