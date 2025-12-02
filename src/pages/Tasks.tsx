import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskFilters, TaskFilterValue } from '@/components/tasks/TaskFilters';
import { TaskSummaryCards } from '@/components/tasks/TaskSummaryCards';
import { TasksKanbanBoard } from '@/components/tasks/TasksKanbanBoard';
import { TasksCalendarView } from '@/components/tasks/TasksCalendarView';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { CheckSquare } from 'lucide-react';

export default function Tasks() {
  const [filters, setFilters] = useState<TaskFilterValue>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Convert TaskFilterValue to TaskFilters format for hooks
  const hookFilters = {
    projectId: filters.projectId,
    assigneeId: filters.assigneeId,
    status: filters.status,
    taskType: filters.taskType,
    dateRange: filters.dateRange,
  };

  // For "My Tasks" tab, we would set assigneeId to current user
  const myTasksFilters = {
    ...hookFilters,
    // assigneeId: currentUserId, // TODO: Wire up with auth
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
              <p className="text-sm text-muted-foreground">Manage tasks across all projects</p>
            </div>
          </div>
          <CreateTaskDialog />
        </div>

        {/* Summary Cards */}
        <TaskSummaryCards filters={hookFilters} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="w-fit h-9">
              <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
              <TabsTrigger value="my-tasks" className="text-sm">My Tasks</TabsTrigger>
              <TabsTrigger value="calendar" className="text-sm">Calendar</TabsTrigger>
            </TabsList>

            {/* Filters inline with tabs */}
            <TaskFilters value={filters} onChange={setFilters} />
          </div>

          <TabsContent value="overview" className="mt-6">
            <TasksKanbanBoard filters={hookFilters} />
          </TabsContent>

          <TabsContent value="my-tasks" className="mt-6">
            <TasksKanbanBoard filters={myTasksFilters} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <TasksCalendarView filters={hookFilters} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
