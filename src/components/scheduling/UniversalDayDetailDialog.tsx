/**
 * UniversalDayDetailDialog - Universal day planner
 * 
 * CANONICAL: THE single day-level schedule editor
 * Uses work_schedules for labor, sub_scheduled_shifts for subs, project_todos for meetings
 * 
 * All schedule entry points (Global Schedule, Workforce Scheduler, Project Schedule, Subs Schedule)
 * MUST use this component instead of creating their own dialogs.
 */

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Split, User, Briefcase, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { ScheduleSyncStatus } from "@/components/ui/sync-status";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getProjectColor } from "@/lib/utils/projectColors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  status?: string | null;
  converted_to_timelog?: boolean;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  assigned_worker_id: string | null;
  project: { project_name: string } | null;
  worker: { name: string } | null;
}

interface UniversalDayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  onRefresh: () => void;
  onAddSchedule?: () => void;
  highlightWorkerId?: string | null;
  projectContext?: string;
  // Optional filters to scope the planner
  projectId?: string;
  companyId?: string;
  scheduleType?: 'labor' | 'sub' | 'meeting' | 'all';
  // Allow highlighting a specific meeting row
  initialMeetingId?: string | null;
}

export function UniversalDayDetailDialog({ 
  open, 
  onOpenChange, 
  date, 
  onRefresh, 
  onAddSchedule,
  highlightWorkerId,
  projectContext,
  projectId,
  companyId,
  scheduleType = 'all',
  initialMeetingId,
}: UniversalDayDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduledShift[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);
  const [splitScheduleData, setSplitScheduleData] = useState<{
    scheduleId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);
  const [focusedWorkerId, setFocusedWorkerId] = useState<string | null>(highlightWorkerId || null);
  const [focusedMeetingId, setFocusedMeetingId] = useState<string | null>(initialMeetingId || null);
  const meetingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && date) {
      fetchDayData();
    }
  }, [open, date]);

  useEffect(() => {
    if (highlightWorkerId) {
      setFocusedWorkerId(highlightWorkerId);
    }
  }, [highlightWorkerId]);

  useEffect(() => {
    if (initialMeetingId) {
      setFocusedMeetingId(initialMeetingId);
    }
  }, [initialMeetingId]);

  // Scroll to highlighted meeting when data loads
  useEffect(() => {
    if (focusedMeetingId && meetingRef.current) {
      setTimeout(() => {
        meetingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [focusedMeetingId, meetings]);

  const fetchDayData = async () => {
    if (!date) return;

    setLoading(true);
    
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Fetch schedules
    let scheduleQuery: any = supabase
      .from("work_schedules")
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(project_name, client_name),
        trade:trades(name)
      `)
      .eq("scheduled_date", dateStr)
      .order("worker_id");

    // Apply optional filters
    if (projectId) {
      scheduleQuery = scheduleQuery.eq("project_id", projectId);
    }
    if (companyId && companyId !== 'all') {
      scheduleQuery = scheduleQuery.eq("company_id", companyId);
    }

    // Fetch meetings (project_todos with due_date)
    let meetingsQuery: any = supabase
      .from("project_todos")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        project_id,
        assigned_worker_id,
        project:projects(project_name),
        worker:workers(name)
      `)
      .eq("due_date", dateStr)
      .eq("task_type", "meeting")
      .order("title");

    if (projectId) {
      meetingsQuery = meetingsQuery.eq("project_id", projectId);
    }

    const [scheduleRes, meetingsRes] = await Promise.all([
      scheduleQuery,
      meetingsQuery,
    ]);

    setLoading(false);

    if (scheduleRes.error) {
      console.error("Error fetching schedules:", scheduleRes.error);
    } else {
      setSchedules(scheduleRes.data || []);
    }

    if (meetingsRes.error) {
      console.error("Error fetching meetings:", meetingsRes.error);
    } else {
      setMeetings(meetingsRes.data || []);
    }
  };

  const handleConvertToTimeLogs = async () => {
    if (!date) return;

    // Mark schedules as converted - triggers will create time_logs (canonical)
    const scheduleIds = selectedSchedules.map(s => s.id);
    const { error: updateError } = await supabase
      .from("work_schedules")
      .update({ converted_to_timelog: true })
      .in("id", scheduleIds);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to convert schedules to time logs",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `Converted ${selectedSchedules.length} schedule(s) to time logs`
    });

    // Invalidate all schedule queries to refresh all views
    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    setConvertDialogOpen(false);
    setSelectedSchedules([]);
    await fetchDayData();
    onRefresh(); // Trigger parent refresh
  };

  // Centralized refresh handler that updates both local and parent state
  const handleScheduleMutation = async () => {
    await fetchDayData();
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    onRefresh();
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
  const totalEntries = schedules.length;
  const totalMeetings = meetings.length;

  // Group schedules by worker
  const schedulesByWorker = schedules.reduce((acc, schedule) => {
    const workerName = schedule.worker?.name || "Unknown";
    if (!acc[workerName]) {
      acc[workerName] = {
        workerId: schedule.worker_id,
        worker: schedule.worker,
        schedules: []
      };
    }
    acc[workerName].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { workerId: string; worker: ScheduledShift['worker']; schedules: ScheduledShift[] }>);

  const uniqueWorkerCount = Object.keys(schedulesByWorker).length;

  // Get project color for visual consistency
  const getScheduleProjectColor = (projectId: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
      "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800",
      "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800",
    ];
    const hash = projectId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300';
      case 'open': return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300';
    }
  };

  const showSchedules = scheduleType === 'all' || scheduleType === 'labor';
  const showMeetings = scheduleType === 'all' || scheduleType === 'meeting';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg truncate">{date ? format(date, "EEEE, MMMM d, yyyy") : ""}</div>
              {projectContext && (
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-1">
                  {scheduleType === 'sub' ? 'Subs Schedule' : scheduleType === 'labor' ? 'Labor Schedule' : 'Day Schedule'}
                  {projectId && ' – Project View'}
                </p>
              )}
            </div>
            <Button
              size="sm"
              className="w-full sm:w-auto flex-shrink-0"
              onClick={() => {
                if (onAddSchedule) {
                  onAddSchedule();
                }
                onOpenChange(false);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add to Schedule</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top Summary Cards - Responsive: 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <Card className="p-2 md:p-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <User className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Workers</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-primary">{uniqueWorkerCount}</p>
            </Card>

            <Card className="p-2 md:p-3 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Hours</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHours}h</p>
            </Card>

            <Card className="p-2 md:p-3 bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Entries</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{totalEntries}</p>
            </Card>

            <Card className="p-2 md:p-3 bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Events</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMeetings}</p>
            </Card>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : schedules.length === 0 && meetings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No schedules or events for this day</p>
              <Button
                onClick={() => {
                  if (onAddSchedule) {
                    onAddSchedule();
                  }
                  onOpenChange(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Schedule
              </Button>
            </div>
          ) : (
            <>
              {/* Meetings / Events Section */}
              {showMeetings && meetings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-sm">Meetings & Events</h3>
                    <Badge variant="secondary" className="text-xs">
                      {meetings.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {meetings.map((meeting) => {
                      const isHighlighted = focusedMeetingId === meeting.id;
                      const projectColor = meeting.project?.project_name 
                        ? getProjectColor(meeting.project.project_name)
                        : undefined;
                      
                      return (
                        <Card
                          key={meeting.id}
                          ref={isHighlighted ? meetingRef : undefined}
                          className={cn(
                            "p-3 transition-all cursor-pointer hover:shadow-md",
                            isHighlighted && "ring-2 ring-purple-500 shadow-lg bg-purple-50 dark:bg-purple-950/20"
                          )}
                          onClick={() => setFocusedMeetingId(focusedMeetingId === meeting.id ? null : meeting.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {projectColor && (
                                  <span 
                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: projectColor }}
                                  />
                                )}
                                <span className="font-semibold text-sm truncate">{meeting.title}</span>
                                {meeting.status === 'done' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                {meeting.project && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {meeting.project.project_name}
                                  </span>
                                )}
                                {meeting.worker && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {meeting.worker.name}
                                  </span>
                                )}
                              </div>
                              
                              {meeting.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {meeting.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <Badge className={cn("text-[10px]", getStatusColor(meeting.status))}>
                                {meeting.status}
                              </Badge>
                              <Badge className={cn("text-[10px]", getPriorityColor(meeting.priority))}>
                                {meeting.priority}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Schedules Section */}
              {showSchedules && schedules.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Labor Schedule</h3>
                      <Badge variant="secondary" className="text-xs">
                        {schedules.length} across {uniqueWorkerCount} worker{uniqueWorkerCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedSchedules(schedules);
                        setConvertDialogOpen(true);
                      }}
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Convert to Time Logs</span>
                      <span className="sm:hidden">Convert to Logs</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(schedulesByWorker).map(([workerName, { workerId, worker, schedules: workerSchedules }]) => {
                      const totalWorkerHours = workerSchedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                      const isHighlighted = focusedWorkerId === workerId || (projectContext && workerSchedules.some(s => s.project_id === projectContext));
                      const hasMultipleProjects = workerSchedules.length > 1;
                      
                      return (
                        <Card 
                          key={workerName} 
                          className={`p-4 transition-all ${
                            isHighlighted ? 'ring-2 ring-primary shadow-lg bg-primary/5' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <h3 
                                  className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => setFocusedWorkerId(focusedWorkerId === workerId ? null : workerId)}
                                >
                                  {workerName}
                                </h3>
                                {isHighlighted && projectContext && (
                                  <Badge variant="default" className="text-xs">Project Focus</Badge>
                                )}
                                {hasMultipleProjects && (
                                  <Badge variant="outline" className="text-xs">
                                    {workerSchedules.length} projects
                                  </Badge>
                                )}
                              </div>
                              {worker?.trade && (
                                <p className="text-xs text-muted-foreground mt-0.5 ml-7">{worker.trade}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-sm px-3 py-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {totalWorkerHours}h total
                              </Badge>
                              {hasMultipleProjects && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const firstSchedule = workerSchedules[0];
                                    setSplitScheduleData({
                                      scheduleId: firstSchedule.id,
                                      workerName: workerName,
                                      date: firstSchedule.scheduled_date,
                                      hours: totalWorkerHours,
                                      projectId: firstSchedule.project_id
                                    });
                                  }}
                                  title="Rebalance hours across projects"
                                >
                                  <Split className="h-3 w-3 mr-1" />
                                  Rebalance
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 ml-7">
                            {workerSchedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className={`flex items-center justify-between p-2.5 rounded-md border transition-all hover:shadow-sm ${
                                  getScheduleProjectColor(schedule.project_id)
                                }`}
                              >
                                <div className="flex-1 flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Briefcase className="h-3.5 w-3.5" />
                                      <span className="text-sm font-semibold">
                                        {schedule.project?.project_name}
                                      </span>
                                      {schedule.status && schedule.status !== 'planned' && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                          {schedule.status}
                                        </Badge>
                                      )}
                                      <ScheduleSyncStatus
                                        hasTimeLog={schedule.converted_to_timelog || false}
                                        isPastDate={new Date(schedule.scheduled_date) < new Date(new Date().toDateString())}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                                      {schedule.trade && (
                                        <>
                                          <span>{schedule.trade.name}</span>
                                          <span>•</span>
                                        </>
                                      )}
                                      <span className="font-medium">{schedule.scheduled_hours}h</span>
                                      {schedule.notes && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate max-w-[200px]">{schedule.notes}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {workerSchedules.length === 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSplitScheduleData({
                                          scheduleId: schedule.id,
                                          workerName: workerName,
                                          date: schedule.scheduled_date,
                                          hours: schedule.scheduled_hours,
                                          projectId: schedule.project_id
                                        });
                                      }}
                                      title="Split into multiple projects"
                                    >
                                      <Split className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <ScheduleEditButton onClick={() => setEditingSchedule(schedule)} />
                                  <ScheduleDeleteButton 
                                    scheduleId={schedule.id}
                                    scheduleDate={schedule.scheduled_date}
                                    onSuccess={() => {
                                      fetchDayData();
                                      onRefresh();
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Convert to Time Logs</AlertDialogTitle>
              <AlertDialogDescription>
                This will create time log entries for {selectedSchedules.length} scheduled shift(s) and remove them from the schedule. 
                The work will be marked as completed for {date ? format(date, "MMMM d, yyyy") : ""}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConvertToTimeLogs}>
                Convert to Time Logs
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EditScheduleDialog
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          schedule={editingSchedule}
          onSuccess={() => {
            fetchDayData();
            onRefresh();
          }}
        />

        {splitScheduleData && (
          <SplitScheduleDialog
            isOpen={!!splitScheduleData}
            onClose={() => setSplitScheduleData(null)}
            scheduleId={splitScheduleData.scheduleId}
            workerName={splitScheduleData.workerName}
            originalDate={splitScheduleData.date}
            originalHours={splitScheduleData.hours}
            originalProjectId={splitScheduleData.projectId}
            onSuccess={() => {
              fetchDayData();
              onRefresh();
              setSplitScheduleData(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
