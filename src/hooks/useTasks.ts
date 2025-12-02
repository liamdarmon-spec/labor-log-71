import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  task_type: string;
  due_date: string | null;
  assigned_worker_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  projects?: { project_name: string } | null;
  workers?: { name: string } | null;
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  status?: string[];
  taskType?: string[];
  dateFrom?: string;
  dateTo?: string;
  dateRange?: { from?: Date; to?: Date };
}

export interface TaskSummary {
  openTasks: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
}

// Canonical tasks hook
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('project_todos')
        .select('*, projects(project_name), workers(name)')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.assigneeId) {
        query = query.eq('assigned_worker_id', filters.assigneeId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.taskType && filters.taskType.length > 0) {
        query = query.in('task_type', filters.taskType);
      }

      if (filters.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Task[];
    },
  });
}

// Task summary hook for KPI cards
export function useTaskSummary(filters: TaskFilters = {}) {
  const { data: tasks = [], isLoading } = useTasks(filters);

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const summary: TaskSummary = {
    openTasks: 0,
    dueToday: 0,
    overdue: 0,
    completedThisWeek: 0,
  };

  tasks.forEach((task) => {
    // Count open tasks (not done)
    if (task.status !== 'done') {
      summary.openTasks++;
    }

    // Count tasks due today (exclude done tasks)
    if (task.due_date && task.status !== 'done') {
      const dueDate = parseISO(task.due_date);
      if (!isBefore(dueDate, todayStart) && !isAfter(dueDate, todayEnd)) {
        summary.dueToday++;
      }

      // Count overdue tasks (due before today and not done)
      if (isBefore(dueDate, todayStart)) {
        summary.overdue++;
      }
    }

    // Count completed this week
    if (task.completed_at) {
      const completedDate = parseISO(task.completed_at);
      if (!isBefore(completedDate, weekStart) && !isAfter(completedDate, weekEnd)) {
        summary.completedThisWeek++;
      }
    }
  });

  return { summary, isLoading };
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      project_id: string | null;
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      task_type?: string;
      due_date?: string;
      assigned_worker_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('project_todos')
        .insert({
          project_id: task.project_id,
          title: task.title,
          description: task.description || null,
          status: task.status || 'open',
          priority: task.priority || 'medium',
          task_type: task.task_type || 'todo',
          due_date: task.due_date || null,
          assigned_worker_id: task.assigned_worker_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        title: string;
        description: string | null;
        status: string;
        priority: string;
        task_type: string;
        due_date: string | null;
        assigned_worker_id: string | null;
        completed_at: string | null;
      }>;
    }) => {
      // If status is being set to 'done', set completed_at
      const updateData = { ...updates };
      if (updates.status === 'done' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'done') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('project_todos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });
}

// Delete task mutation
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_todos').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });
}

// Fetch workers for assignee dropdown
export function useWorkers() {
  return useQuery({
    queryKey: ['workers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch projects for project dropdown
export function useProjectsList() {
  return useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');

      if (error) throw error;
      return data || [];
    },
  });
}

// Project-specific task counts for Project Hub
export interface ProjectTaskCounts {
  open: number;
  overdue: number;
  dueToday: number;
}

export function useProjectTaskCounts(projectId: string | null | undefined): {
  data: ProjectTaskCounts | undefined;
  isLoading: boolean;
  error: unknown;
} {
  return useQuery({
    queryKey: ['project-task-counts', projectId],
    queryFn: async (): Promise<ProjectTaskCounts> => {
      if (!projectId) {
        return { open: 0, overdue: 0, dueToday: 0 };
      }

      const { data, error } = await supabase
        .from('project_todos')
        .select('id, status, due_date')
        .eq('project_id', projectId);

      if (error) throw error;

      const today = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      let open = 0;
      let overdue = 0;
      let dueToday = 0;

      (data || []).forEach((task) => {
        const isDone = task.status === 'done';
        
        // Count open tasks (open or in_progress)
        if (task.status === 'open' || task.status === 'in_progress') {
          open++;
        }

        // Check due date conditions only for non-done tasks
        if (task.due_date && !isDone) {
          const dueDate = parseISO(task.due_date);
          
          // Overdue: due_date < today
          if (isBefore(dueDate, today)) {
            overdue++;
          }
          
          // Due today: due_date is today
          if (!isBefore(dueDate, today) && !isAfter(dueDate, todayEnd)) {
            dueToday++;
          }
        }
      });

      return { open, overdue, dueToday };
    },
    enabled: !!projectId,
  });
}
