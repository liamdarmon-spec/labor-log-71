import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWorkers } from '@/hooks/useTasks';
import { createSingleTaskFromChecklist, ChecklistTaskPayload } from '@/lib/checklists/taskPromotion';
import { toast } from 'sonner';

interface PromoteToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  checklistItemId: string;
  itemLabel: string;
  areaKey?: string;
  trade?: string;
  phase?: string;
  tags?: string[];
  defaultAssigneeRole?: string;
  onSuccess?: (taskId: string) => void;
}

export function PromoteToTaskDialog({
  open,
  onOpenChange,
  projectId,
  checklistItemId,
  itemLabel,
  areaKey,
  trade,
  phase,
  tags,
  defaultAssigneeRole,
  onSuccess,
}: PromoteToTaskDialogProps) {
  const [title, setTitle] = useState(itemLabel);
  const [notes, setNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: workers = [] } = useWorkers();
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    
    setIsSubmitting(true);
    
    const payload: ChecklistTaskPayload = {
      projectId,
      checklistItemId,
      title: title.trim(),
      areaKey,
      trade,
      phase,
      tags,
      defaultAssigneeRole,
      notes: notes.trim() || undefined,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
    };
    
    const result = await createSingleTaskFromChecklist(payload);
    
    setIsSubmitting(false);
    
    if (result.success && result.taskId) {
      toast.success('Task created successfully');
      onSuccess?.(result.taskId);
      onOpenChange(false);
      
      // Reset form
      setTitle(itemLabel);
      setNotes('');
      setAssigneeId('');
      setDueDate(undefined);
    } else {
      toast.error(result.error || 'Failed to create task');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Promote to Task
          </DialogTitle>
          <DialogDescription>
            Create a task from this checklist item
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
            />
          </div>
          
          {/* Context badges */}
          {(areaKey || trade || phase) && (
            <div className="flex flex-wrap gap-2">
              {areaKey && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {areaKey}
                </span>
              )}
              {trade && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {trade}
                </span>
              )}
              {phase && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {phase}
                </span>
              )}
            </div>
          )}
          
          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assign to</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder="Select assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {defaultAssigneeRole && (
              <p className="text-xs text-muted-foreground">
                Suggested role: {defaultAssigneeRole}
              </p>
            )}
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
