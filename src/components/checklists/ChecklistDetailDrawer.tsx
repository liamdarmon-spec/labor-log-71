import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProjectChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  ProjectChecklistItem,
} from '@/hooks/useChecklists';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

interface ChecklistDetailDrawerProps {
  checklistId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChecklistDetailDrawer({
  checklistId,
  open,
  onOpenChange,
}: ChecklistDetailDrawerProps) {
  const [newItemLabel, setNewItemLabel] = useState('');
  
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

  return (
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
                    onToggle={() => handleToggle(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    isToggling={toggleItem.isPending}
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
  );
}

// Checklist Item Row
function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  isToggling,
}: {
  item: ProjectChecklistItem;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  const isCompleted = !!item.completed_at;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        isCompleted ? 'bg-muted/50 border-muted' : 'bg-card hover:bg-muted/30'
      )}
    >
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
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
