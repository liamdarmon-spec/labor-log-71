import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/hooks/useTasks';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickAddTaskBarProps {
  projectId?: string;
  defaultType?: string;
  onCreated?: (taskId: string) => void;
}

export function QuickAddTaskBar({ projectId, defaultType = 'todo', onCreated }: QuickAddTaskBarProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    createTask.mutate(
      {
        project_id: projectId || '',
        title: trimmed,
        status: 'open',
        priority: 'medium',
        task_type: defaultType,
      },
      {
        onSuccess: (data) => {
          setValue('');
          onCreated?.(data?.id);
        },
        onError: () => {
          toast.error('Failed to create task');
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-lg border bg-background transition-all',
        isFocused ? 'ring-2 ring-primary/20 border-primary/50' : 'border-border'
      )}
    >
      <div className="pl-3 text-muted-foreground">
        {createTask.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={projectId ? 'Quick add task…' : 'Quick add task (no project)…'}
        className="border-0 shadow-none focus-visible:ring-0 px-0"
        disabled={createTask.isPending}
      />
      {value.trim() && (
        <div className="pr-3 text-xs text-muted-foreground">
          Press Enter
        </div>
      )}
    </div>
  );
}
