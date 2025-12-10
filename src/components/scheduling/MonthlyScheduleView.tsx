import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, AlertTriangle } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, startOfWeek, endOfWeek, isWeekend } from "date-fns";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import type { SchedulerFilterMode } from "@/lib/scheduler/types";
import { getProjectColor } from "@/lib/utils/projectColors";
import { cn } from "@/lib/utils";

interface MonthlyScheduleViewProps {
  onDayClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
  currentMonth?: Date;
}

export function MonthlyScheduleView({ 
  onDayClick, 
  refreshTrigger, 
  scheduleType,
  currentMonth: externalMonth 
}: MonthlyScheduleViewProps) {
  const currentMonth = externalMonth || new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Handle clicking a meeting - opens the day dialog with meeting highlighted
  const handleMeetingClick = (meetingId: string, meetingDate: Date) => {
    setSelectedMeetingId(meetingId);
    setSelectedDate(meetingDate);
  };

  // Handle clicking the day card background - opens day dialog without specific meeting
  const handleDayClick = (day: Date) => {
    setSelectedMeetingId(null);
    setSelectedDate(day);
  };

  // Reset meeting ID when dialog closes
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedDate(null);
      setSelectedMeetingId(null);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: "month",
    filter: scheduleType as SchedulerFilterMode,
    startDate: monthStart,
    endDate: monthEnd,
    refreshTrigger,
  });

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-3">
      {loading ? (
        <Card className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-[80px] sm:h-[120px]" />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-2 sm:p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
              <div 
                key={day} 
                className={cn(
                  "text-center font-semibold text-[10px] sm:text-sm p-1 sm:p-2",
                  idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
                )}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day[0]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
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
              const hasContent = totalWorkers > 0 || totalSubs > 0 || totalMeetings > 0;

              return (
                <Card
                  key={day.toISOString()}
                  className={cn(
                    "p-1 sm:p-2 min-h-[70px] sm:min-h-[120px] cursor-pointer transition-all hover:shadow-md relative",
                    !isCurrentMonth && "opacity-40 bg-muted/20",
                    isToday && "ring-2 ring-primary shadow-lg",
                    isWeekendDay && isCurrentMonth && "bg-muted/20",
                    hasConflicts && "border-orange-400 border-2"
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day Number and Today Badge */}
                  <div className="flex items-start justify-between mb-1 sm:mb-2">
                    <span className={cn(
                      "text-xs sm:text-sm font-semibold",
                      isToday && "bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded-full",
                      isWeekendDay && !isToday && "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {hasConflicts && (
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                      )}
                      {isToday && !isCurrentMonth && (
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">
                          Today
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {hasContent && (
                    <div className="space-y-0.5 sm:space-y-1 mb-1 sm:mb-2">
                      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground flex-wrap">
                        {totalWorkers > 0 && (
                          <>
                            <User className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                            <span>{totalWorkers}</span>
                          </>
                        )}
                        {totalSubs > 0 && (
                          <>
                            <span className="mx-0.5">·</span>
                            <span>{totalSubs}S</span>
                          </>
                        )}
                        {totalHours > 0 && (
                          <>
                            <span className="mx-0.5">·</span>
                            <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                            <span className="font-medium">{totalHours}h</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty state for current month */}
                  {!hasContent && isCurrentMonth && (
                    <p className="text-[8px] sm:text-[9px] text-muted-foreground/50 italic hidden sm:block">
                      Tap to add
                    </p>
                  )}

                  {/* Assignment Preview with Project Colors */}
                  <div className="space-y-0.5">
                    {assignments.slice(0, 2).map((assignment) => {
                      const projectColor = assignment.secondaryLabel 
                        ? getProjectColor(assignment.secondaryLabel)
                        : undefined;
                      
                      return (
                        <div
                          key={assignment.id}
                          className="text-[8px] sm:text-[9px] bg-muted/60 px-1 sm:px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (assignment.type === 'meeting') {
                              handleMeetingClick(assignment.id, day);
                            } else {
                              handleDayClick(day);
                            }
                          }}
                        >
                          {projectColor && (
                            <span 
                              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: projectColor }}
                            />
                          )}
                          {assignment.type === 'worker' && '👷'}
                          {assignment.type === 'sub' && '🔧'}
                          {assignment.type === 'meeting' && '📅'}
                          <span className="truncate">{assignment.label}</span>
                        </div>
                      );
                    })}
                    {assignments.length > 2 && (
                      <div className="text-[8px] sm:text-[9px] text-muted-foreground text-center">
                        +{assignments.length - 2} more
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      <UniversalDayDetailDialog
        open={!!selectedDate}
        onOpenChange={handleDialogClose}
        date={selectedDate}
        onRefresh={() => {}}
        onAddSchedule={() => {
          if (selectedDate) {
            onDayClick(selectedDate);
            setSelectedDate(null);
            setSelectedMeetingId(null);
          }
        }}
        scheduleType={scheduleType === 'all' ? 'all' : scheduleType === 'workers' ? 'labor' : scheduleType === 'subs' ? 'sub' : 'meeting'}
        initialMeetingId={selectedMeetingId}
      />
    </div>
  );
}
