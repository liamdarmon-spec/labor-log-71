import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, User, Briefcase, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay } from "date-fns";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import type { SchedulerFilterMode } from "@/lib/scheduler/types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
  projectId?: string;
}

export function WeeklyScheduleView({ onScheduleClick, refreshTrigger, scheduleType, projectId }: WeeklyScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<any>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const { toast } = useToast();

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  
  const { days, assignmentsByDay, loading } = useSchedulerData({
    viewMode: "week",
    filter: scheduleType as SchedulerFilterMode,
    startDate: currentWeekStart,
    endDate: weekEnd,
    projectId,
    refreshTrigger, // Add refresh trigger
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handleMeetingClick = async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setLoadingMeeting(true);
    
    try {
      const { data, error } = await supabase
        .from('project_todos')
        .select(`
          *,
          projects:project_id (project_name),
          workers:assigned_worker_id (name)
        `)
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      setMeetingDetails(data);
    } catch (error) {
      console.error('Error fetching meeting details:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting details",
        variant: "destructive",
      });
      setSelectedMeetingId(null);
    } finally {
      setLoadingMeeting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            Week of {format(currentWeekStart, "MMM d, yyyy")}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
        >
          This Week
        </Button>
      </div>

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

          // Compute total items based on filter
          let totalItems = 0;
          let summaryText = "";

          if (scheduleType === "workers") {
            totalItems = totalWorkers;
            summaryText = totalWorkers === 0 
              ? "0 scheduled" 
              : totalWorkers === 1 
                ? `1 worker · ${totalHours}h`
                : `${totalWorkers} workers · ${totalHours}h`;
          } else if (scheduleType === "subs") {
            totalItems = totalSubs;
            summaryText = totalSubs === 0 
              ? "0 scheduled" 
              : totalSubs === 1 
                ? `1 sub · ${totalHours}h`
                : `${totalSubs} subs · ${totalHours}h`;
          } else if (scheduleType === "meetings") {
            totalItems = totalMeetings;
            summaryText = totalMeetings === 0 
              ? "0 scheduled" 
              : totalMeetings === 1 
                ? "1 meeting"
                : `${totalMeetings} meetings`;
          } else {
            // "all" mode
            totalItems = totalWorkers + totalSubs + totalMeetings;
            if (totalItems === 0) {
              summaryText = "0 scheduled";
            } else {
              const parts = [];
              if (totalWorkers > 0) parts.push(`${totalWorkers}w`);
              if (totalSubs > 0) parts.push(`${totalSubs}s`);
              if (totalMeetings > 0) parts.push(`${totalMeetings}m`);
              summaryText = parts.join(" · ");
              if (totalHours > 0) summaryText += ` · ${totalHours}h`;
            }
          }

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 min-h-[200px] cursor-pointer hover:shadow-md transition-all ${
                isToday ? "ring-2 ring-primary shadow-lg" : ""
              } ${totalItems === 0 ? "bg-muted/20" : ""}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{format(day, "EEE")}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleClick(day);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Loading or Summary */}
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground font-medium">
                    {summaryText}
                  </div>
                )}

                {/* Assignment Preview Pills (max 2) */}
                {!loading && assignments.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {assignments.slice(0, 2).map((assignment) => (
                      <Badge
                        key={assignment.id}
                        variant="secondary"
                        className={`w-full justify-start text-[10px] truncate py-1 ${
                          assignment.type === 'meeting' ? 'cursor-pointer hover:bg-secondary/80' : ''
                        }`}
                        onClick={(e) => {
                          if (assignment.type === 'meeting') {
                            e.stopPropagation();
                            handleMeetingClick(assignment.id);
                          }
                        }}
                      >
                        {assignment.type === 'worker' && '👷'}
                        {assignment.type === 'sub' && '🔧'}
                        {assignment.type === 'meeting' && '📅'}
                        <span className="ml-1 truncate flex flex-col">
                          <span className="truncate">{assignment.label}</span>
                          {assignment.secondaryLabel && (
                            <span className="text-muted-foreground truncate">{assignment.secondaryLabel}</span>
                          )}
                          {assignment.totalHours && <span> · {assignment.totalHours}h</span>}
                        </span>
                      </Badge>
                    ))}
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

      <UniversalDayDetailDialog
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate}
        onRefresh={() => {}}
        onAddSchedule={() => {
          if (selectedDate) {
            onScheduleClick(selectedDate);
          }
        }}
        projectContext={projectId}
      />

      <Dialog open={!!selectedMeetingId} onOpenChange={(open) => !open && setSelectedMeetingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
          </DialogHeader>
          {loadingMeeting ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : meetingDetails ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="text-lg font-semibold">{meetingDetails.title}</p>
              </div>
              
              {meetingDetails.projects && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project</p>
                  <p>{meetingDetails.projects.project_name}</p>
                </div>
              )}
              
              {meetingDetails.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{meetingDetails.description}</p>
                </div>
              )}
              
              {meetingDetails.due_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p>{format(new Date(meetingDetails.due_date), "PPP")}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="secondary">{meetingDetails.status}</Badge>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <Badge variant="secondary">{meetingDetails.priority}</Badge>
                </div>
              </div>
              
              {meetingDetails.workers && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <p>{meetingDetails.workers.name}</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}