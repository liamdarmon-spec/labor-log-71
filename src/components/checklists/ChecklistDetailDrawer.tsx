import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, CheckCircle2, ListTodo, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useProjectChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  ProjectChecklistItem,
} from '@/hooks/useChecklists';
import { PromoteToTaskDialog } from './PromoteToTaskDialog';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

interface ChecklistDetailDrawerProps {
  checklistId: string | null;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChecklistDetailDrawer({
  checklistId,
  projectId,
  open,
  onOpenChange,
}: ChecklistDetailDrawerProps) {
  const [newItemLabel, setNewItemLabel] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [promoteDialogItem, setPromoteDialogItem] = useState<ProjectChecklistItem | null>(null);
  const [itemsWithTasks, setItemsWithTasks] = useState<Set<string>>(new Set());
  
  const { data: checklist, isLoading } = useProjectChecklist(checklistId || undefined);
  const toggleItem = useToggleChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const items = checklist?.items || [];
  const completedCount = items.filter((item) => item.completed_at).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Sort items: incomplete first, then completed
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed_at && !b.completed_at) return 1;
    if (!a.completed_at && b.completed_at) return -1;
    return a.sort_order - b.sort_order;
  });

  const handleToggle = (item: ProjectChecklistItem) => {
    toggleItem.mutate({
      itemId: item.id,
      completed: !item.completed_at,
    });
  };

  const handleAddItem = () => {
    if (!newItemLabel.trim() || !checklistId) return;
    
    addItem.mutate(
      { checklistId, label: newItemLabel.trim() },
      { onSuccess: () => setNewItemLabel('') }
    );
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Delete this item?')) {
      deleteItem.mutate(itemId);
    }
  };
  
  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };
  
  const handleBulkPromote = () => {
    // For bulk, we'd open a different dialog or iterate
    // For now, promote first selected item
    if (selectedItems.size === 0) return;
    const firstId = Array.from(selectedItems)[0];
    const item = items.find(i => i.id === firstId);
    if (item) {
      setPromoteDialogItem(item);
    }
  };
  
  const handleTaskCreated = (taskId: string, itemId: string) => {
    setItemsWithTasks(prev => new Set(prev).add(itemId));
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const effectiveProjectId = projectId || checklist?.project_id;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading || !checklist ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <SheetTitle className="text-xl">{checklist.title}</SheetTitle>
                  <Badge className={cn('capitalize', STATUS_COLORS[checklist.status])}>
                    {checklist.status.replace('_', ' ')}
                  </Badge>
                </div>
                <SheetDescription className="sr-only">
                  Checklist details and items
                </SheetDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedCount} of {totalCount} complete
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {checklist.phase} phase
                  </Badge>
                  {checklist.project_type && (
                    <Badge variant="secondary" className="capitalize">
                      {checklist.project_type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Bulk actions */}
                {selectedItems.size > 0 && effectiveProjectId && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-sm font-medium">
                      {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                    </span>
                    <Button size="sm" onClick={handleBulkPromote}>
                      <ListTodo className="h-4 w-4 mr-1" />
                      Create Task{selectedItems.size > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
                
                {/* Add new item */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new item..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddItem}
                    disabled={!newItemLabel.trim() || addItem.isPending}
                  >
                    {addItem.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {sortedItems.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      projectId={effectiveProjectId}
                      onToggle={() => handleToggle(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onPromote={() => setPromoteDialogItem(item)}
                      isToggling={toggleItem.isPending}
                      isSelected={selectedItems.has(item.id)}
                      onSelectChange={(selected) => handleItemSelect(item.id, selected)}
                      hasTask={itemsWithTasks.has(item.id)}
                    />
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items yet. Add one above.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Promote to Task Dialog */}
      {promoteDialogItem && effectiveProjectId && (
        <PromoteToTaskDialog
          open={!!promoteDialogItem}
          onOpenChange={(open) => !open && setPromoteDialogItem(null)}
          projectId={effectiveProjectId}
          checklistItemId={promoteDialogItem.id}
          itemLabel={promoteDialogItem.label}
          phase={checklist?.phase}
          onSuccess={(taskId) => handleTaskCreated(taskId, promoteDialogItem.id)}
        />
      )}
    </>
  );
}

// Checklist Item Row
function ChecklistItemRow({
  item,
  projectId,
  onToggle,
  onDelete,
  onPromote,
  isToggling,
  isSelected,
  onSelectChange,
  hasTask,
}: {
  item: ProjectChecklistItem;
  projectId?: string;
  onToggle: () => void;
  onDelete: () => void;
  onPromote: () => void;
  isToggling: boolean;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  hasTask: boolean;
}) {
  const isCompleted = !!item.completed_at;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors group',
        isCompleted ? 'bg-muted/50 border-muted' : 'bg-card hover:bg-muted/30',
        isSelected && 'ring-2 ring-primary/30'
      )}
    >
      {/* Selection checkbox (for bulk actions) */}
      {projectId && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
          className="mt-0.5 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
        />
      )}
      
      {/* Completion checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={onToggle}
        disabled={isToggling}
        className="mt-0.5"
      />
      
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {item.label}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {item.required && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
          {isCompleted && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Done
            </span>
          )}
          {hasTask && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              Task created
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {projectId && !hasTask && (
            <DropdownMenuItem onClick={onPromote}>
              <ListTodo className="h-4 w-4 mr-2" />
              Promote to Task
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
