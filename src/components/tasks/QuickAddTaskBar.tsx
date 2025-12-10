import { useState, useRef } from 'react';
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
        project_id: projectId ?? null,
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
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'group relative flex items-center rounded-lg border bg-background cursor-text transition-all duration-200',
        isFocused 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-border/60 hover:border-border'
      )}
    >
      {/* Icon - inline with input */}
      <div className={cn(
        'flex items-center justify-center w-10 h-10 flex-shrink-0 transition-colors',
        isFocused ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'
      )}>
        {createTask.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </div>
      
      {/* Input - no extra padding, text starts right after icon */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Add a new task..."
        disabled={createTask.isPending}
        className={cn(
          'flex-1 h-10 bg-transparent text-sm outline-none',
          'placeholder:text-muted-foreground/40',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />
      
      {/* Keyboard hint - always visible but subtle */}
      <div className={cn(
        'hidden sm:flex items-center gap-1 pr-3 transition-opacity',
        value.trim() ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'
      )}>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border/50">
          ↵
        </kbd>
      </div>
    </div>
  );
}
