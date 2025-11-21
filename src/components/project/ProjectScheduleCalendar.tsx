import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';
import { useScheduleConflicts } from '@/hooks/useScheduleConflicts';

interface ScheduledShift {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  worker: { name: string } | null;
}

interface SubSchedule {
  id: string;
  sub_id: string;
  scheduled_date: string;
  scheduled_hours: number | null;
  subs?: { name: string } | null;
}

interface Meeting {
  id: string;
  title: string;
  due_date: string;
  task_type: string;
}

export const ProjectScheduleCalendar = ({ projectId }: { projectId: string }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewFilter, setViewFilter] = useState<'workers' | 'subs' | 'meetings' | 'all'>('workers');
  const [workerSchedules, setWorkerSchedules] = useState<ScheduledShift[]>([]);
  const [subSchedules, setSubSchedules] = useState<SubSchedule[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null);
  const [conflictWorkerId, setConflictWorkerId] = useState<string | null>(null);
  const [conflictDate, setConflictDate] = useState<string | null>(null);
  
  const { conflicts } = useScheduleConflicts(conflictWorkerId, conflictDate);

  useEffect(() => {
    fetchData();
  }, [currentMonth, projectId, viewFilter]);

  const fetchData = async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    if (viewFilter === 'workers' || viewFilter === 'all') {
      const { data } = await supabase
        .from('scheduled_shifts')
        .select('id, worker_id, scheduled_date, scheduled_hours, worker:workers(name)')
        .eq('project_id', projectId)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);
      setWorkerSchedules(data || []);
    }

    if (viewFilter === 'subs' || viewFilter === 'all') {
      const { data } = await supabase
        .from('sub_scheduled_shifts')
        .select('id, sub_id, scheduled_date, scheduled_hours, subs(name)')
        .eq('project_id', projectId)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);
      setSubSchedules(data || []);
    }

    if (viewFilter === 'meetings' || viewFilter === 'all') {
      const { data } = await supabase
        .from('project_todos')
        .select('id, title, due_date, task_type')
        .eq('project_id', projectId)
        .in('task_type', ['meeting', 'inspection'])
        .not('due_date', 'is', null)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);
      setMeetings(data || []);
    }

    setLoading(false);
  };

  const openDayDialog = (date: Date, workerId?: string) => {
    setDayDialogDate(date);
  };

  const handleScheduleAdded = async (workerId: string, date: string) => {
    setConflictWorkerId(workerId);
    setConflictDate(date);
    await fetchData();
  };

  const dismissConflict = () => {
    setConflictWorkerId(null);
    setConflictDate(null);
  };

  const openDayDialogForConflict = () => {
    if (conflictDate) {
      const [year, month, day] = conflictDate.split('-').map(Number);
      setDayDialogDate(new Date(year, month - 1, day));
      dismissConflict();
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getDataForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const workers = workerSchedules.filter(s => s.scheduled_date === dayStr);
    const subs = subSchedules.filter(s => s.scheduled_date === dayStr);
    const dayMeetings = meetings.filter(m => m.due_date === dayStr);
    
    const workerHours = workers.reduce((sum, s) => sum + s.scheduled_hours, 0);
    const subHours = subs.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);

    return { workers, subs, meetings: dayMeetings, workerHours, subHours };
  };

  return (
    <div className="space-y-4">
      {conflicts.hasConflicts && conflicts.scheduleCount > 1 && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Schedule Conflict Detected</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This worker has {conflicts.scheduleCount} schedules on {conflictDate ? format(new Date(conflictDate), 'MMM d, yyyy') : 'this date'} across multiple projects:
            <span className="font-medium"> {conflicts.projectNames.join(', ')}</span>.
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openDayDialogForConflict}
              >
                Open Day Schedule to Rebalance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissConflict}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
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

        <div className="flex items-center gap-2">
          <Select value={viewFilter} onValueChange={(v: any) => setViewFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workers">Workers</SelectItem>
              <SelectItem value="subs">Subs</SelectItem>
              <SelectItem value="meetings">Meetings</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      <Card className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2 text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const { workers, subs, meetings: dayMeetings, workerHours, subHours } = getDataForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const hasData = workers.length > 0 || subs.length > 0 || dayMeetings.length > 0;

            return (
              <Card
                key={day.toISOString()}
                className={`p-2 min-h-[100px] cursor-pointer transition-all hover:shadow-md ${
                  !isCurrentMonth ? 'opacity-40 bg-muted/20' : ''
                } ${isToday ? 'ring-2 ring-primary shadow-lg' : ''}`}
                onClick={() => openDayDialog(day)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${
                    isToday ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-full' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {hasData && (
                  <div className="space-y-1">
                    {(viewFilter === 'workers' || viewFilter === 'all') && workerHours > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                        <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">{workers.length}W</span>
                        <Clock className="h-3 w-3 ml-1 text-blue-600 dark:text-blue-400" />
                        <span>{workerHours}h</span>
                      </div>
                    )}

                    {(viewFilter === 'subs' || viewFilter === 'all') && subHours > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
                        <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="font-medium">{subs.length}S</span>
                        <Clock className="h-3 w-3 ml-1 text-green-600 dark:text-green-400" />
                        <span>{subHours}h</span>
                      </div>
                    )}

                    {(viewFilter === 'meetings' || viewFilter === 'all') && dayMeetings.length > 0 && (
                      <div className="space-y-0.5">
                        {dayMeetings.slice(0, 2).map((meeting) => (
                          <div key={meeting.id} className="text-xs bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded truncate">
                            <Badge variant="outline" className="h-4 text-[10px] mr-1">
                              {meeting.task_type === 'meeting' ? '📅' : '✓'}
                            </Badge>
                            <span className="text-purple-700 dark:text-purple-300">{meeting.title}</span>
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1.5">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      <UniversalDayDetailDialog
        open={!!dayDialogDate}
        onOpenChange={(open) => {
          if (!open) setDayDialogDate(null);
        }}
        date={dayDialogDate}
        onRefresh={fetchData}
        onAddSchedule={() => {
          if (dayDialogDate) {
            handleScheduleAdded('', format(dayDialogDate, 'yyyy-MM-dd'));
          }
        }}
        projectContext={projectId}
      />
    </div>
  );
};
