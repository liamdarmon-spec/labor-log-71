import { useState } from 'react';
import { TaskFilters, TaskFilterValue } from '@/components/tasks/TaskFilters';
import { TaskSummaryCards } from '@/components/tasks/TaskSummaryCards';
import { TasksKanbanBoard } from '@/components/tasks/TasksKanbanBoard';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';

interface ProjectTasksTabProps {
  projectId: string;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const [filters, setFilters] = useState<TaskFilterValue>({
    projectId, // Locked to this project
  });

  // Convert TaskFilterValue to TaskFilters format for hooks
  const hookFilters = {
    projectId,
    assigneeId: filters.assigneeId,
    status: filters.status,
    taskType: filters.taskType,
    dateRange: filters.dateRange,
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Project Tasks</h2>
          <p className="text-sm text-muted-foreground">Manage tasks for this project</p>
        </div>
        <CreateTaskDialog projectId={projectId} />
      </div>

      {/* Summary Cards */}
      <TaskSummaryCards filters={hookFilters} />

      {/* Filters */}
      <TaskFilters projectId={projectId} value={filters} onChange={setFilters} />

      {/* Kanban Board */}
      <TasksKanbanBoard projectId={projectId} filters={hookFilters} />
    </div>
  );
}
