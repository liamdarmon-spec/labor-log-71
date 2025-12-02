import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks, useUpdateTask, Task, TaskFilters as TaskFiltersType, useWorkers } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { format, parseISO } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface TasksKanbanBoardProps {
  projectId?: string;
  filters: TaskFiltersType;
}

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  showProject: boolean;
  onViewDetails: (task: Task) => void;
}

interface DraggableTaskProps {
  task: Task;
  showProject: boolean;
  onViewDetails: (task: Task) => void;
}

function DraggableTask({ task, showProject, onViewDetails }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} showProject={showProject} onViewDetails={onViewDetails} />
    </div>
  );
}

function DroppableColumn({ id, title, tasks, showProject, onViewDetails }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-2 min-h-[200px] p-2 rounded-lg transition-colors',
          isOver && 'bg-muted/50 ring-2 ring-primary/20'
        )}
      >
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} showProject={showProject} onViewDetails={onViewDetails} />
        ))}
        {tasks.length === 0 && (
          <Card className="p-4">
            <p className="text-xs text-center text-muted-foreground">No tasks</p>
          </Card>
        )}
      </div>
    </div>
  );
}

export function TasksKanbanBoard({ projectId, filters }: TasksKanbanBoardProps) {
  const queryFilters = {
    ...filters,
    projectId: projectId || filters.projectId,
    dateFrom: filters.dateRange?.from?.toISOString().split('T')[0],
    dateTo: filters.dateRange?.to?.toISOString().split('T')[0],
  };

  const { data: tasks = [], isLoading } = useTasks(queryFilters);
  const updateTask = useUpdateTask();
  const { data: workers = [] } = useWorkers();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const showProject = !projectId;

  const openTasks = tasks.filter((t) => t.status === 'open');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    updateTask.mutate({ id: taskId, updates: { status: newStatus } });
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DroppableColumn
            id="open"
            title="Open"
            tasks={openTasks}
            showProject={showProject}
            onViewDetails={handleViewDetails}
          />
          <DroppableColumn
            id="in_progress"
            title="In Progress"
            tasks={inProgressTasks}
            showProject={showProject}
            onViewDetails={handleViewDetails}
          />
          <DroppableColumn
            id="done"
            title="Done"
            tasks={doneTasks}
            showProject={showProject}
            onViewDetails={handleViewDetails}
          />
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} showProject={showProject} />}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Task Details</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <TaskDetailForm task={selectedTask} workers={workers} onClose={() => setIsDetailOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

interface TaskDetailFormProps {
  task: Task;
  workers: { id: string; name: string }[];
  onClose: () => void;
}

function TaskDetailForm({ task, workers, onClose }: TaskDetailFormProps) {
  const updateTask = useUpdateTask();
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    task_type: task.task_type,
    due_date: task.due_date || '',
    assigned_worker_id: task.assigned_worker_id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask.mutate(
      {
        id: task.id,
        updates: {
          ...formData,
          description: formData.description || null,
          assigned_worker_id: formData.assigned_worker_id || null,
          due_date: formData.due_date || null,
        },
      },
      {
        onSuccess: onClose,
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="task_type">Type</Label>
          <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To-Do</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="punchlist">Punchlist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="assigned_worker_id">Assignee</Label>
        <Select
          value={formData.assigned_worker_id || 'unassigned'}
          onValueChange={(value) => setFormData({ ...formData, assigned_worker_id: value === 'unassigned' ? '' : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id}>
                {worker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {task.projects?.project_name && (
        <div>
          <Label>Project</Label>
          <p className="text-sm text-muted-foreground">{task.projects.project_name}</p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={updateTask.isPending}>
          {updateTask.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
