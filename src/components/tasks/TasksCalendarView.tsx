import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { useTasks, Task, TaskFilters as TaskFiltersType } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

interface TasksCalendarViewProps {
  projectId?: string;
  filters: TaskFiltersType;
}

export function TasksCalendarView({ projectId, filters }: TasksCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const queryFilters = {
    ...filters,
    projectId: projectId || filters.projectId,
  };

  const { data: tasks = [], isLoading } = useTasks(queryFilters);

  const showProject = !projectId;

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  // Calculate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate.get(dateKey) || [];
    if (dayTasks.length > 0) {
      setSelectedDate(date);
      setIsSheetOpen(true);
    }
  };

  const selectedDateTasks = selectedDate ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500';
      case 'inspection':
        return 'bg-purple-500';
      case 'milestone':
        return 'bg-amber-500';
      case 'punchlist':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="h-[400px] bg-muted rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={dateKey}
                onClick={() => handleDateClick(day)}
                className={cn(
                  'min-h-[80px] p-1 border rounded-md transition-colors',
                  !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                  isCurrentMonth && 'hover:bg-muted/50 cursor-pointer',
                  isSelected && 'ring-2 ring-primary',
                  isToday(day) && 'bg-primary/10',
                  dayTasks.length > 0 && 'cursor-pointer'
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday(day) && 'text-primary font-bold')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center gap-1 text-xs truncate">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getTaskTypeColor(task.task_type))} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      +{dayTasks.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {selectedDateTasks.map((task) => (
              <TaskCard key={task.id} task={task} showProject={showProject} />
            ))}
            {selectedDateTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks due this day</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
