import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTasks, useUpdateTask, Task, TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { QuickAddTaskBar } from './QuickAddTaskBar';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { parseISO, subDays, isAfter } from 'date-fns';
import { Clock, Eye, EyeOff } from 'lucide-react';

interface TasksKanbanBoardProps {
  projectId?: string;
  filters: TaskFiltersType;
}

function DraggableTask({ task, showProject, onViewDetails }: { task: Task; showProject: boolean; onViewDetails: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }} {...listeners} {...attributes}>
      <TaskCard task={task} showProject={showProject} onViewDetails={onViewDetails} />
    </div>
  );
}

function DroppableColumn({ id, title, tasks, showProject, onViewDetails, badge, headerExtra }: { id: string; title: string; tasks: Task[]; showProject: boolean; onViewDetails: (task: Task) => void; badge?: React.ReactNode; headerExtra?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="space-y-3 flex flex-col min-w-[280px] md:min-w-0">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        {badge}
      </div>
      {headerExtra}
      <div ref={setNodeRef} className={cn('space-y-2 min-h-[200px] p-2 rounded-lg transition-colors flex-1', isOver && 'bg-muted/50 ring-2 ring-primary/20')}>
        {tasks.map((task) => <DraggableTask key={task.id} task={task} showProject={showProject} onViewDetails={onViewDetails} />)}
        {tasks.length === 0 && <Card className="p-4"><p className="text-xs text-center text-muted-foreground">No tasks</p></Card>}
      </div>
    </div>
  );
}

export function TasksKanbanBoard({ projectId, filters }: TasksKanbanBoardProps) {
  const queryFilters = { ...filters, projectId: projectId || filters.projectId, dateFrom: filters.dateRange?.from?.toISOString().split('T')[0], dateTo: filters.dateRange?.to?.toISOString().split('T')[0] };
  const { data: tasks = [], isLoading } = useTasks(queryFilters);
  const updateTask = useUpdateTask();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showOlderDone, setShowOlderDone] = useState(false);
  const showProject = !projectId;
  const sevenDaysAgo = subDays(new Date(), 7);

  const { openTasks, inProgressTasks, recentDoneTasks, olderDoneTasks } = useMemo(() => {
    const open: Task[] = [], inProgress: Task[] = [], recentDone: Task[] = [], olderDone: Task[] = [];
    tasks.forEach((t) => {
      if (t.status === 'open') open.push(t);
      else if (t.status === 'in_progress') inProgress.push(t);
      else if (t.status === 'done') {
        const completedDate = t.completed_at ? parseISO(t.completed_at) : null;
        if (!completedDate || isAfter(completedDate, sevenDaysAgo)) recentDone.push(t);
        else olderDone.push(t);
      }
    });
    return { openTasks: open, inProgressTasks: inProgress, recentDoneTasks: recentDone, olderDoneTasks: olderDone };
  }, [tasks, sevenDaysAgo]);

  const doneTasks = showOlderDone ? [...recentDoneTasks, ...olderDoneTasks] : recentDoneTasks;
  const handleDragEnd = (event: DragEndEvent) => { const { active, over } = event; setActiveId(null); if (!over) return; const taskId = active.id as string; const newStatus = over.id as string; const task = tasks.find((t) => t.id === taskId); if (!task || task.status === newStatus) return; updateTask.mutate({ id: taskId, updates: { status: newStatus } }); };
  const handleViewDetails = (task: Task) => { setSelectedTask(task); setIsDetailOpen(true); };
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="space-y-3"><div className="h-6 bg-muted rounded animate-pulse" /><div className="h-32 bg-muted rounded animate-pulse" /></div>)}</div>;

  return (
    <>
      <div className="mb-4"><QuickAddTaskBar projectId={projectId} /></div>
      <DndContext collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto pb-4">
          <DroppableColumn id="open" title="Open" tasks={openTasks} showProject={showProject} onViewDetails={handleViewDetails} />
          <DroppableColumn id="in_progress" title="In Progress" tasks={inProgressTasks} showProject={showProject} onViewDetails={handleViewDetails} />
          <DroppableColumn id="done" title="Done" tasks={doneTasks} showProject={showProject} onViewDetails={handleViewDetails}
            badge={!showOlderDone && olderDoneTasks.length > 0 ? <Badge variant="outline" className="text-xs gap-1"><Clock className="w-3 h-3" />Last 7 days</Badge> : null}
            headerExtra={olderDoneTasks.length > 0 ? <Button variant="ghost" size="sm" className="mx-2 text-xs h-7 gap-1" onClick={() => setShowOlderDone(!showOlderDone)}>{showOlderDone ? <><EyeOff className="w-3 h-3" />Hide older ({olderDoneTasks.length})</> : <><Eye className="w-3 h-3" />Show older ({olderDoneTasks.length})</>}</Button> : null}
          />
        </div>
        <DragOverlay>{activeTask && <TaskCard task={activeTask} showProject={showProject} />}</DragOverlay>
      </DndContext>
      <TaskDetailDrawer task={selectedTask} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </>
  );
}
