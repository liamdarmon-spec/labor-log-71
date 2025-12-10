import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { endOfWeek, format, addDays, isSameDay } from "date-fns";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import type { SchedulerFilterMode } from "@/lib/scheduler/types";
import { Badge } from "@/components/ui/badge";
import { getProjectColor } from "@/lib/utils/projectColors";
import { cn } from "@/lib/utils";

interface WeeklyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
  projectId?: string;
  currentWeekStart?: Date;
}

export function WeeklyScheduleView({ 
  onScheduleClick, 
  refreshTrigger, 
  scheduleType, 
  projectId,
  currentWeekStart: externalWeekStart 
}: WeeklyScheduleViewProps) {
  const currentWeekStart = externalWeekStart || new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  
  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: "week",
    filter: scheduleType as SchedulerFilterMode,
    startDate: currentWeekStart,
    endDate: weekEnd,
    projectId,
    refreshTrigger,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Handle clicking a meeting badge - opens the day dialog with meeting highlighted
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const daySummary = days.find(d => d.date === dayStr);
          const assignments = assignmentsByDay[dayStr] || [];
          const isToday = isSameDay(day, new Date());

          const totalWorkers = daySummary?.totalWorkers || 0;
          const totalSubs = daySummary?.totalSubs || 0;
          const totalMeetings = daySummary?.totalMeetings || 0;
          const totalHours = daySummary?.totalHours || 0;
          const hasConflicts = daySummary?.hasConflicts || false;

          // Compute total items based on filter
          let totalItems = 0;
          let summaryText = "";

          if (scheduleType === "workers") {
            totalItems = totalWorkers;
            summaryText = totalWorkers === 0 
              ? "" 
              : totalWorkers === 1 
                ? `1 worker · ${totalHours}h`
                : `${totalWorkers} workers · ${totalHours}h`;
          } else if (scheduleType === "subs") {
            totalItems = totalSubs;
            summaryText = totalSubs === 0 
              ? "" 
              : totalSubs === 1 
                ? `1 sub · ${totalHours}h`
                : `${totalSubs} subs · ${totalHours}h`;
          } else if (scheduleType === "meetings") {
            totalItems = totalMeetings;
            summaryText = totalMeetings === 0 
              ? "" 
              : totalMeetings === 1 
                ? "1 event"
                : `${totalMeetings} events`;
          } else {
            totalItems = totalWorkers + totalSubs + totalMeetings;
            if (totalItems > 0) {
              const parts = [];
              if (totalWorkers > 0) parts.push(`${totalWorkers}w`);
              if (totalSubs > 0) parts.push(`${totalSubs}s`);
              if (totalMeetings > 0) parts.push(`${totalMeetings}e`);
              summaryText = parts.join(" · ");
              if (totalHours > 0) summaryText += ` · ${totalHours}h`;
            }
          }

          const isEmpty = totalItems === 0;
          const isFullCrew = totalWorkers >= 5;

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "p-3 min-h-[180px] sm:min-h-[200px] cursor-pointer transition-all hover:shadow-md relative",
                isToday && "ring-2 ring-primary shadow-lg",
                isEmpty && "bg-muted/10",
                hasConflicts && "border-orange-400 border-2"
              )}
              onClick={() => handleDayClick(day)}
            >
              {/* Today floating pill */}
              {isToday && (
                <Badge 
                  className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5"
                >
                  Today
                </Badge>
              )}

              {/* Conflict warning */}
              {hasConflicts && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 text-orange-500" title="Scheduling conflict detected">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{format(day, "EEE")}</p>
                    <p className={cn(
                      "text-lg font-bold",
                      isToday && "text-primary"
                    )}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleClick(day);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>

                {/* Loading or Summary */}
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : isEmpty ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Tap to schedule
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      {summaryText}
                    </div>
                    {isFullCrew && (
                      <Badge variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700">
                        Full crew day!
                      </Badge>
                    )}
                  </div>
                )}

                {/* Assignment Preview with Project Colors */}
                {!loading && assignments.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {assignments.slice(0, 2).map((assignment) => {
                      const projectColor = assignment.secondaryLabel 
                        ? getProjectColor(assignment.secondaryLabel)
                        : undefined;
                      
                      return (
                        <Badge
                          key={assignment.id}
                          variant="secondary"
                          className={cn(
                            "w-full justify-start text-[10px] truncate py-1 gap-1.5 cursor-pointer hover:bg-secondary/80"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            // All assignment types now open the universal day dialog
                            // For meetings, pass the meeting ID to highlight it
                            if (assignment.type === 'meeting') {
                              handleMeetingClick(assignment.id, day);
                            } else {
                              handleDayClick(day);
                            }
                          }}
                        >
                          {/* Project color dot */}
                          {projectColor && (
                            <span 
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: projectColor }}
                            />
                          )}
                          {assignment.type === 'worker' && '👷'}
                          {assignment.type === 'sub' && '🔧'}
                          {assignment.type === 'meeting' && '📅'}
                          <span className="truncate flex flex-col min-w-0">
                            <span className="truncate">{assignment.label}</span>
                            {assignment.secondaryLabel && (
                              <span className="text-muted-foreground truncate text-[9px]">
                                {assignment.secondaryLabel}
                              </span>
                            )}
                            {assignment.totalHours && <span> · {assignment.totalHours}h</span>}
                          </span>
                        </Badge>
                      );
                    })}
                    {assignments.length > 2 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        +{assignments.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Single unified day dialog - handles both schedules and meetings */}
      <UniversalDayDetailDialog
        open={!!selectedDate}
        onOpenChange={handleDialogClose}
        date={selectedDate}
        projectId={projectId}
        onRefresh={() => {}}
        onAddSchedule={() => {
          if (selectedDate) {
            onScheduleClick(selectedDate);
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
