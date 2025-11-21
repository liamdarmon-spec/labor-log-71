import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';
import { useSchedulerData } from '@/lib/scheduler/useSchedulerData';
import type { SchedulerFilterMode } from '@/lib/scheduler/types';

export const ProjectScheduleCalendar = ({ projectId }: { projectId: string }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewFilter, setViewFilter] = useState<'workers' | 'subs' | 'meetings' | 'all'>('workers');
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: 'month',
    filter: viewFilter as SchedulerFilterMode,
    startDate: monthStart,
    endDate: monthEnd,
    projectId,
  });

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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
            const dayStr = format(day, 'yyyy-MM-dd');
            const daySummary = days.find(d => d.date === dayStr);
            const assignments = assignmentsByDay[dayStr] || [];
            
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isWeekendDay = isWeekend(day);

            const totalWorkers = daySummary?.totalWorkers || 0;
            const totalSubs = daySummary?.totalSubs || 0;
            const totalMeetings = daySummary?.totalMeetings || 0;
            const totalHours = daySummary?.totalHours || 0;
            const hasConflicts = daySummary?.hasConflicts || false;

            return (
              <Card
                key={day.toISOString()}
                className={`p-2 min-h-[100px] cursor-pointer transition-all hover:shadow-md ${
                  !isCurrentMonth ? 'opacity-40 bg-muted/20' : ''
                } ${isToday ? 'ring-2 ring-primary shadow-lg' : ''} ${
                  isWeekendDay ? 'bg-muted/30' : ''
                } ${hasConflicts ? 'border-orange-400' : ''}`}
                onClick={() => setDayDialogDate(day)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${
                    isToday ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-full' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {totalHours > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs bg-primary/5 px-2 py-1 rounded">
                      {totalWorkers > 0 && (
                        <>
                          <User className="h-3 w-3 text-primary" />
                          <span className="font-medium">{totalWorkers}</span>
                        </>
                      )}
                      {totalSubs > 0 && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="font-medium">{totalSubs}S</span>
                        </>
                      )}
                      {totalMeetings > 0 && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="font-medium">{totalMeetings}M</span>
                        </>
                      )}
                      <span className="mx-1">·</span>
                      <Clock className="h-3 w-3" />
                      <span>{totalHours}h</span>
                    </div>

                    {/* Assignment Preview Pills */}
                    {assignments.slice(0, 2).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded truncate"
                      >
                        {assignment.type === 'worker' && '👷 '}
                        {assignment.type === 'sub' && '🔧 '}
                        {assignment.type === 'meeting' && '📅 '}
                        {assignment.label}
                      </div>
                    ))}
                    {assignments.length > 2 && (
                      <div className="text-[9px] text-muted-foreground text-center">
                        +{assignments.length - 2} more
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
        onRefresh={() => {}}
        onAddSchedule={() => {}}
        projectContext={projectId}
      />
    </div>
  );
};
