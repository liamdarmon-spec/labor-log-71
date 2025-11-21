import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Calendar, User, CheckSquare, Users, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectTasksCalendar } from './ProjectTasksCalendar';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  task_type: string;
  due_date: string | null;
  assigned_worker_id: string | null;
  created_at: string;
  workers?: { name: string } | null;
}

interface Worker {
  id: string;
  name: string;
}

export const ProjectTasks = ({ projectId, onUpdate }: { projectId: string; onUpdate?: () => void }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    task_type: 'todo',
    due_date: '',
    assigned_worker_id: 'unassigned',
  });

  useEffect(() => {
    fetchTodos();
    fetchWorkers();
  }, [projectId]);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('project_todos')
        .select('*, workers(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('project_todos').insert({
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        task_type: formData.task_type,
        due_date: formData.due_date || null,
        assigned_worker_id: formData.assigned_worker_id === 'unassigned' ? null : formData.assigned_worker_id,
      });

      if (error) throw error;

      toast.success('Task created successfully');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        task_type: 'todo',
        due_date: '',
        assigned_worker_id: 'unassigned',
      });
      fetchTodos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const quickAddTask = (type: string) => {
    setFormData({ ...formData, task_type: type, status: 'open' });
    setIsDialogOpen(true);
  };

  const handleStatusChange = async (todoId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) throw error;
      toast.success('Status updated');
      fetchTodos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-3 h-3" />;
      case 'inspection':
        return <CheckSquare className="w-3 h-3" />;
      case 'milestone':
        return <AlertTriangle className="w-3 h-3" />;
      case 'punchlist':
        return <Package className="w-3 h-3" />;
      default:
        return <CheckSquare className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  // Filter todos
  const filteredTodos = todos.filter(todo => {
    if (filterAssignee !== 'all' && todo.assigned_worker_id !== filterAssignee) return false;
    if (filterType !== 'all' && todo.task_type !== filterType) return false;
    return true;
  });

  const openTasks = filteredTodos.filter(t => t.status === 'open');
  const inProgressTasks = filteredTodos.filter(t => t.status === 'in_progress');
  const doneTasks = filteredTodos.filter(t => t.status === 'done');

  const TaskCard = ({ task }: { task: Todo }) => (
    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">{task.title}</h4>
          <Badge variant="outline" className="shrink-0 gap-1">
            {getTaskTypeIcon(task.task_type)}
            <span className="capitalize text-xs">{task.task_type}</span>
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {task.assigned_worker_id && (
            <Badge variant="secondary" className="text-xs gap-1">
              <User className="w-3 h-3" />
              {task.workers?.name || 'Assigned'}
            </Badge>
          )}

          {task.due_date && (
            <Badge 
              variant={isOverdue(task.due_date) ? "destructive" : "outline"} 
              className="text-xs gap-1"
            >
              {isOverdue(task.due_date) && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </Badge>
          )}

          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
        </div>

        {/* Status change buttons */}
        <div className="flex gap-1 pt-2 border-t">
          {task.status !== 'open' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(task.id, 'open');
              }}
            >
              Open
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(task.id, 'in_progress');
              }}
            >
              In Progress
            </Button>
          )}
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(task.id, 'done');
              }}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'board' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('board')}
          >
            Board
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <ProjectTasksCalendar projectId={projectId} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="todo">To-Do</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="punchlist">Punchlist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
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
                  <Label htmlFor="task_type">Type</Label>
                  <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
                    <SelectTrigger id="task_type">
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
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger id="priority">
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
                  <Label htmlFor="assigned_worker_id">Assignee</Label>
                  <Select value={formData.assigned_worker_id} onValueChange={(value) => setFormData({ ...formData, assigned_worker_id: value === 'unassigned' ? '' : value })}>
                    <SelectTrigger id="assigned_worker_id">
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

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      {filteredTodos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              No tasks yet. Start by adding today's priorities or upcoming inspections.
            </p>
            <p className="text-sm text-muted-foreground">
              Tasks due this week will appear here and on the Calendar view.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => quickAddTask('todo')}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Add To-Do
              </Button>
              <Button variant="outline" onClick={() => quickAddTask('meeting')}>
                <Users className="w-4 h-4 mr-2" />
                Add Meeting
              </Button>
              <Button variant="outline" onClick={() => quickAddTask('inspection')}>
                <Package className="w-4 h-4 mr-2" />
                Add Inspection
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Open Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Open</h3>
              <Badge variant="secondary" className="text-xs">{openTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {openTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {openTasks.length === 0 && (
                <Card className="p-4">
                  <p className="text-xs text-center text-muted-foreground">No open tasks</p>
                </Card>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold text-sm text-muted-foreground">In Progress</h3>
              <Badge variant="secondary" className="text-xs">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {inProgressTasks.length === 0 && (
                <Card className="p-4">
                  <p className="text-xs text-center text-muted-foreground">No tasks in progress</p>
                </Card>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Done</h3>
              <Badge variant="secondary" className="text-xs">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {doneTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {doneTasks.length === 0 && (
                <Card className="p-4">
                  <p className="text-xs text-center text-muted-foreground">No completed tasks</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};