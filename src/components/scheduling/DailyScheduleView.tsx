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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentDate, "EEEE, MMM d, yyyy")}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullDayDialog(true)}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Full Day
          </Button>
          <Button
            size="sm"
            onClick={() => onScheduleClick(currentDate)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Schedule
          </Button>
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6 pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Workers</p>
                <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subs</p>
                <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meetings</p>
                <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1"></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1"></div>
              </div>
            </div>
            <p className="text-center text-muted-foreground py-8">Loading schedules...</p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6 pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Workers</p>
                <p className="text-2xl font-bold">{totalWorkers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subs</p>
                <p className="text-2xl font-bold">{totalSubs}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meetings</p>
                <p className="text-2xl font-bold">{totalMeetings}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours}h</p>
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
        onAddSchedule={() => onScheduleClick(currentDate)}
      />
    </div>
  );
}