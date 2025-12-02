import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProjectActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'time_log_added'
  | 'cost_added';

export interface ProjectActivityItem {
  id: string;
  projectId: string;
  type: ProjectActivityType;
  occurredAt: string;
  title: string;
  description?: string;
  meta?: Record<string, any>;
}

export function useProjectActivityFeed(projectId: string | null | undefined): {
  data: ProjectActivityItem[] | undefined;
  isLoading: boolean;
  error: unknown;
} {
  return useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: async (): Promise<ProjectActivityItem[]> => {
      if (!projectId) return [];

      const activities: ProjectActivityItem[] = [];

      // Fetch tasks (for created and completed events)
      const { data: tasks } = await supabase
        .from('project_todos')
        .select('id, title, status, created_at, completed_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (tasks) {
        tasks.forEach((task) => {
          // Task created event
          activities.push({
            id: `todo-created-${task.id}`,
            projectId,
            type: 'task_created',
            occurredAt: task.created_at,
            title: 'Task created',
            description: task.title,
          });

          // Task completed event (if completed)
          if (task.status === 'done' && task.completed_at) {
            activities.push({
              id: `todo-completed-${task.id}`,
              projectId,
              type: 'task_completed',
              occurredAt: task.completed_at,
              title: 'Task completed',
              description: task.title,
            });
          }
        });
      }

      // Fetch time logs
      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('id, hours_worked, created_at, workers(name), trades(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (timeLogs) {
        timeLogs.forEach((log) => {
          const workerName = log.workers?.name || 'Worker';
          const tradeName = log.trades?.name;
          const desc = tradeName
            ? `${log.hours_worked}h - ${workerName} (${tradeName})`
            : `${log.hours_worked}h - ${workerName}`;

          activities.push({
            id: `time-${log.id}`,
            projectId,
            type: 'time_log_added',
            occurredAt: log.created_at || new Date().toISOString(),
            title: 'Time logged',
            description: desc,
            meta: { hours: log.hours_worked },
          });
        });
      }

      // Fetch costs
      const { data: costs } = await supabase
        .from('costs')
        .select('id, amount, description, category, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (costs) {
        costs.forEach((cost) => {
          const amount = cost.amount?.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }) || '$0';
          const category = cost.category ? ` - ${cost.category}` : '';
          const desc = cost.description
            ? `${amount}${category} - ${cost.description}`
            : `${amount}${category}`;

          activities.push({
            id: `cost-${cost.id}`,
            projectId,
            type: 'cost_added',
            occurredAt: cost.created_at || new Date().toISOString(),
            title: 'Cost added',
            description: desc,
            meta: { amount: cost.amount },
          });
        });
      }

      // Sort all activities by occurredAt DESC and limit to 50
      return activities
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 50);
    },
    enabled: !!projectId,
  });
}
