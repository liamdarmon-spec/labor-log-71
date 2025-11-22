import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface SubsScheduleSectionProps {
  projectId: string;
}

export function SubsScheduleSection({ projectId }: SubsScheduleSectionProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Fetch subs schedules for this project for the current week
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['sub-schedules', projectId, currentWeekStart],
    queryFn: async () => {
      const weekEnd = addDays(currentWeekStart, 6);
      const { data, error } = await supabase
        .from('sub_scheduled_shifts')
        .select(`
          *,
          subs(id, name, company_name, trades(name))
        `)
        .eq('project_id', projectId)
        .gte('scheduled_date', currentWeekStart.toISOString().split('T')[0])
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0])
        .order('scheduled_date');
      
      if (error) throw error;
      return data;
    },
  });

  // Get unique subs
  const uniqueSubs = schedules?.reduce((acc: any[], schedule: any) => {
    if (!acc.find(s => s.id === schedule.subs.id)) {
      acc.push(schedule.subs);
    }
    return acc;
  }, []) || [];

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getScheduleForSubAndDay = (subId: string, date: Date) => {
    return schedules?.filter(
      s => s.sub_id === subId && isSameDay(new Date(s.scheduled_date), date)
    ) || [];
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sub Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              ← Prev
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              Next →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
        ) : uniqueSubs.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-2 mb-2 pb-2 border-b">
                <div className="font-medium text-sm">Subcontractor</div>
                {weekDays.map(day => (
                  <div key={day.toISOString()} className="text-center">
                    <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                    <div className="text-sm font-medium">{format(day, 'M/d')}</div>
                  </div>
                ))}
              </div>

              {/* Sub Rows */}
              {uniqueSubs.map((sub: any) => (
                <div key={sub.id} className="grid grid-cols-8 gap-2 py-2 border-b last:border-b-0">
                  <div className="flex flex-col justify-center">
                    <div className="text-sm font-medium">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">{sub.trades?.name}</div>
                  </div>
                  {weekDays.map(day => {
                    const daySchedules = getScheduleForSubAndDay(sub.id, day);
                    const totalHours = daySchedules.reduce((sum, s) => sum + (s.scheduled_hours || 8), 0);

                    return (
                      <div key={day.toISOString()} className="flex items-center justify-center">
                        {daySchedules.length > 0 ? (
                          <Badge variant="secondary" className="w-full text-center justify-center">
                            {totalHours}h
                          </Badge>
                        ) : (
                          <div className="text-muted-foreground">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No subs scheduled this week</p>
            <p className="text-xs mt-1">Schedule subs from the main Scheduler</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
