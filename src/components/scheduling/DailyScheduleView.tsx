import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, User, Clock, ExternalLink } from "lucide-react";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import type { SchedulerFilterMode } from "@/lib/scheduler/types";

interface DailyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
}

export function DailyScheduleView({ onScheduleClick, refreshTrigger, scheduleType }: DailyScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFullDayDialog, setShowFullDayDialog] = useState(false);

  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: "day",
    filter: scheduleType as SchedulerFilterMode,
    startDate: currentDate,
    endDate: currentDate,
    refreshTrigger, // Add refresh trigger
  });

  const dayStr = format(currentDate, "yyyy-MM-dd");
  const daySummary = days.find(d => d.date === dayStr);
  const assignments = assignmentsByDay[dayStr] || [];

  const totalWorkers = daySummary?.totalWorkers || 0;
  const totalSubs = daySummary?.totalSubs || 0;
  const totalMeetings = daySummary?.totalMeetings || 0;
  const totalHours = daySummary?.totalHours || 0;

  // Group assignments by worker/sub/meeting
  const workerAssignments = assignments.filter(a => a.type === 'worker');
  const subAssignments = assignments.filter(a => a.type === 'sub');
  const meetingAssignments = assignments.filter(a => a.type === 'meeting');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10"
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <h3 className="text-sm sm:text-lg font-semibold truncate">
              {format(currentDate, "EEEE, MMM d, yyyy")}
            </h3>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="flex-1 sm:flex-none"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullDayDialog(true)}
            className="gap-1 flex-1 sm:flex-none hidden sm:flex"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open Full Day</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onScheduleClick(currentDate)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add to Schedule</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <Card className="p-3 sm:p-6">
        {loading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Workers</p>
                <div className="h-6 sm:h-8 w-8 sm:w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Subs</p>
                <div className="h-6 sm:h-8 w-8 sm:w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Meetings</p>
                <div className="h-6 sm:h-8 w-8 sm:w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
                <div className="h-6 sm:h-8 w-12 sm:w-16 bg-muted animate-pulse rounded mt-1"></div>
              </div>
            </div>
            <p className="text-center text-muted-foreground py-8 text-sm">Loading schedules...</p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Workers</p>
                <p className="text-xl sm:text-2xl font-bold">{totalWorkers}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Subs</p>
                <p className="text-xl sm:text-2xl font-bold">{totalSubs}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Meetings</p>
                <p className="text-xl sm:text-2xl font-bold">{totalMeetings}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl sm:text-2xl font-bold">{totalHours}h</p>
              </div>
            </div>
            {assignments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No schedules for this day</p>
                <Button onClick={() => onScheduleClick(currentDate)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Workers Section */}
                {workerAssignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Workers ({workerAssignments.length})
                </h4>
                {workerAssignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{assignment.label}</span>
                          {assignment.status && assignment.status !== 'planned' && (
                            <Badge variant="outline" className="text-xs">{assignment.status}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{assignment.secondaryLabel}</span>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{assignment.totalHours}h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Subs Section */}
            {subAssignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Subcontractors ({subAssignments.length})
                </h4>
                {subAssignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4 hover:shadow-md transition-all bg-green-50/50 dark:bg-green-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{assignment.label}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{assignment.secondaryLabel}</span>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{assignment.totalHours}h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Meetings Section */}
            {meetingAssignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Meetings & Inspections ({meetingAssignments.length})
                </h4>
                {meetingAssignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4 hover:shadow-md transition-all bg-purple-50/50 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{assignment.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.secondaryLabel}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </Card>

      <UniversalDayDetailDialog
        open={showFullDayDialog}
        onOpenChange={setShowFullDayDialog}
        date={currentDate}
        onRefresh={() => {}}
        onAddSchedule={() => {
          setShowFullDayDialog(false);
          onScheduleClick(currentDate);
        }}
        scheduleType={scheduleType === 'all' ? 'all' : scheduleType === 'workers' ? 'labor' : scheduleType === 'subs' ? 'sub' : 'all'}
      />
    </div>
  );
}