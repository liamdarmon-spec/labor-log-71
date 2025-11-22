import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Clock, User, Calendar, Plus } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, startOfWeek, endOfWeek, isWeekend } from "date-fns";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import type { SchedulerFilterMode } from "@/lib/scheduler/types";

interface MonthlyScheduleViewProps {
  onDayClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
}

export function MonthlyScheduleView({ onDayClick, refreshTrigger, scheduleType }: MonthlyScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: "month",
    filter: scheduleType as SchedulerFilterMode,
    startDate: monthStart,
    endDate: monthEnd,
    refreshTrigger, // Add refresh trigger
  });


  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-4">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base sm:text-lg font-semibold min-w-[160px] sm:min-w-[200px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
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
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">This Month</span>
            <span className="sm:hidden">Today</span>
          </Button>
        </div>

        {loading ? (
          <Card className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-[100px] sm:h-[120px]" />
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-2 sm:p-4">
            {/* Day Headers - Responsive */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <div 
                  key={day} 
                  className={`text-center font-semibold text-[10px] sm:text-sm p-1 sm:p-2 ${
                    idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {/* Show full name on desktop, abbreviation on mobile */}
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

                return (
                  <Card
                    key={day.toISOString()}
                    className={`p-1 sm:p-2 min-h-[80px] sm:min-h-[140px] cursor-pointer transition-all hover:shadow-md ${
                      !isCurrentMonth ? "opacity-40 bg-muted/20" : ""
                    } ${isToday ? "ring-1 sm:ring-2 ring-primary shadow-lg" : ""} ${
                      isWeekendDay ? "bg-muted/30" : ""
                    } ${hasConflicts ? "border-orange-400" : ""}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    {/* Day Number and Badge */}
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className={`text-xs sm:text-sm font-semibold ${
                        isToday ? "text-primary bg-primary/10 px-1 sm:px-2 py-0.5 rounded-full" : 
                        isWeekendDay ? "text-muted-foreground" : ""
                      }`}>
                        {format(day, "d")}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1">
                          <span className="hidden sm:inline">Today</span>
                          <span className="sm:hidden">•</span>
                        </Badge>
                      )}
                    </div>

                    {/* Summary */}
                    {totalHours > 0 && (
                      <div className="space-y-0.5 sm:space-y-1 mb-1 sm:mb-2">
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground">
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
                          <span className="mx-0.5">·</span>
                          <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                          <span className="font-medium">{totalHours}h</span>
                        </div>
                      </div>
                    )}

                    {/* Assignment Preview Chips */}
                    <div className="space-y-0.5">
                      {assignments.slice(0, 3).map((assignment) => (
                        <div
                          key={assignment.id}
                          className="text-[8px] sm:text-[9px] bg-muted/60 px-1 sm:px-1.5 py-0.5 rounded truncate font-medium"
                        >
                          {assignment.type === 'worker' && '👷'}
                          {assignment.type === 'sub' && '🔧'}
                          {assignment.type === 'meeting' && '📅'}
                          <span className="ml-0.5">{assignment.label}</span>
                        </div>
                      ))}
                      {assignments.length > 3 && (
                        <div className="text-[8px] sm:text-[9px] text-muted-foreground text-center">
                          +{assignments.length - 3} more
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
          onOpenChange={(open) => !open && setSelectedDate(null)}
          date={selectedDate}
          onRefresh={() => {}}
          onAddSchedule={() => {
            if (selectedDate) {
              onDayClick(selectedDate);
              setSelectedDate(null);
            }
          }}
          scheduleType={scheduleType === 'all' ? 'all' : scheduleType === 'workers' ? 'labor' : scheduleType === 'subs' ? 'sub' : 'all'}
        />
    </div>
  );
}