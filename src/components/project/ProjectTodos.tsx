import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Calendar, User, Trash2, CheckSquare, Users, Package } from 'lucide-react';
import { format } from 'date-fns';

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

export const ProjectTodos = ({ projectId, onUpdate }: { projectId: string; onUpdate?: () => void }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    task_type: 'todo',
    due_date: '',
    assigned_worker_id: '',
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
      console.error('Error fetching todos:', error);
      toast.error('Failed to load todos');
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
        assigned_worker_id: formData.assigned_worker_id || null,
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
        assigned_worker_id: '',
      });
      fetchTodos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const quickAddTask = (type: string) => {
    setFormData({ ...formData, task_type: type });
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

  const handleDelete = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('project_todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      toast.success('Task deleted');
      fetchTodos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'low': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'open': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'inspection': return <CheckSquare className="w-4 h-4" />;
      case 'delivery': return <Package className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filterStatus !== 'all' && todo.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && todo.assigned_worker_id !== filterAssignee) return false;
    if (filterType !== 'all' && todo.task_type !== filterType) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Tasks</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="task_type">Type</Label>
                    <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assigned_worker">Assign To</Label>
                    <Select value={formData.assigned_worker_id} onValueChange={(value) => setFormData({ ...formData, assigned_worker_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">Create Task</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Assignee" />
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            todos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">
                  No tasks yet. Start by adding today's priorities or upcoming inspections.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => quickAddTask('todo')} className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Add Todo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => quickAddTask('meeting')} className="gap-2">
                    <Users className="w-4 h-4" />
                    Add Meeting
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => quickAddTask('inspection')} className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Add Inspection
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No tasks match the current filters.
              </p>
            )
          ) : (
            filteredTodos.map((todo) => (
              <Card key={todo.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getTaskTypeIcon(todo.task_type)}
                      <h4 className="font-semibold">{todo.title}</h4>
                      <Badge className={getPriorityColor(todo.priority)} variant="outline">
                        {todo.priority}
                      </Badge>
                      <Badge className={getStatusColor(todo.status)} variant="outline">
                        {todo.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground">{todo.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {todo.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(todo.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {todo.workers && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {todo.workers.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={todo.status} onValueChange={(value) => handleStatusChange(todo.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(todo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
