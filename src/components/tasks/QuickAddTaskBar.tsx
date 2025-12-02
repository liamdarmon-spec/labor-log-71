import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/hooks/useTasks';
import { Plus, Loader2, Sparkles } from 'lucide-react';
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
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border-2 border-dashed bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-3 transition-all duration-300',
        isFocused 
          ? 'border-primary/40 bg-gradient-to-r from-primary/5 to-transparent shadow-lg shadow-primary/5' 
          : 'border-muted-foreground/20 hover:border-primary/20 hover:from-muted/40'
      )}
    >
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
        isFocused ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
      )}>
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
        placeholder="Add a new task..."
        className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto py-0 text-sm font-medium placeholder:text-muted-foreground/50 placeholder:font-normal"
        disabled={createTask.isPending}
      />
      
      {value.trim() ? (
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/80 rounded-md border">
            <span>↵</span> Enter
          </kbd>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Sparkles className="w-3 h-3" />
          <span>Quick add</span>
        </div>
      )}
    </div>
  );
}
