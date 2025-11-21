import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, CheckSquare, Package } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  task_type: string;
  priority: string;
  due_date: string | null;
}

export const ProjectTasksCalendar = ({ projectId }: { projectId: string }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, [currentMonth, projectId]);

  const fetchTodos = async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('project_todos')
      .select('id, title, task_type, priority, due_date')
      .eq('project_id', projectId)
      .not('due_date', 'is', null)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd);

    setTodos(data || []);
    setLoading(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTodosForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return todos.filter(t => t.due_date === dayStr);
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-3 h-3" />;
      case 'inspection':
        return <CheckSquare className="w-3 h-3" />;
      case 'delivery':
        return <Package className="w-3 h-3" />;
      default:
        return <CheckSquare className="w-3 h-3" />;
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300';
      case 'inspection':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300';
      case 'delivery':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2 text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dayTodos = getTodosForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <Card
                key={day.toISOString()}
                className={`p-2 min-h-[100px] ${
                  !isCurrentMonth ? 'opacity-40 bg-muted/20' : ''
                } ${isToday ? 'ring-2 ring-primary shadow-lg' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${
                    isToday ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-full' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayTodos.slice(0, 3).map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-1 p-1.5 rounded text-xs border ${getTaskTypeColor(todo.task_type)}`}
                    >
                      <div className="shrink-0 mt-0.5">{getTaskTypeIcon(todo.task_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(todo.priority)}`} />
                          <span className="truncate font-medium">{todo.title}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayTodos.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center py-1">
                      +{dayTodos.length - 3} more
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
