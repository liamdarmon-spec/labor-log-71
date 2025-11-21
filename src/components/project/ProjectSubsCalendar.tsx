import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';

interface SubSchedule {
  id: string;
  sub_id: string;
  scheduled_date: string;
  scheduled_hours: number | null;
  subs?: { name: string } | null;
}

export const ProjectSubsCalendar = ({ projectId }: { projectId: string }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [subSchedules, setSubSchedules] = useState<SubSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubSchedules();
  }, [currentMonth, projectId]);

  const fetchSubSchedules = async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('sub_scheduled_shifts')
      .select('id, sub_id, scheduled_date, scheduled_hours, subs(name)')
      .eq('project_id', projectId)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd);

    setSubSchedules(data || []);
    setLoading(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSubSchedulesForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return subSchedules.filter(s => s.scheduled_date === dayStr);
  };

  const getTotalHoursForDay = (day: Date) => {
    return getSubSchedulesForDay(day).reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);
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
            const daySubs = getSubSchedulesForDay(day);
            const totalHours = getTotalHoursForDay(day);
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

                {totalHours > 0 && (
                  <div className="flex items-center gap-1 mb-2 bg-green-50 dark:bg-green-950/30 rounded px-2 py-1">
                    <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      {totalHours}h
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  {daySubs.slice(0, 3).map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-1 p-1.5 rounded text-xs bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Users className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="truncate font-medium text-green-700 dark:text-green-300">
                          {sub.subs?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-green-600 dark:text-green-400 font-semibold shrink-0">
                        {sub.scheduled_hours || 0}h
                      </span>
                    </div>
                  ))}
                  {daySubs.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center py-1">
                      +{daySubs.length - 3} more
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
