/**
 * UniversalDayDetailDialog - Universal day planner
 * 
 * CANONICAL: THE single day-level schedule editor
 * Uses work_schedules for labor, sub_scheduled_shifts for subs
 * 
 * All schedule entry points (Global Schedule, Workforce Scheduler, Project Schedule, Subs Schedule)
 * MUST use this component instead of creating their own dialogs.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Split, User, Briefcase, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";
import { useQueryClient } from "@tanstack/react-query";
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
  scheduleType = 'all'
}: UniversalDayDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
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

  useEffect(() => {
    if (open && date) {
      fetchDaySchedules();
    }
  }, [open, date]);

  useEffect(() => {
    if (highlightWorkerId) {
      setFocusedWorkerId(highlightWorkerId);
    }
  }, [highlightWorkerId]);

  const fetchDaySchedules = async () => {
    if (!date) return;

    setLoading(true);
    
    const dateStr = format(date, "yyyy-MM-dd");
    
    let query: any = supabase
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
      query = query.eq("project_id", projectId);
    }
    if (companyId && companyId !== 'all') {
      query = query.eq("company_id", companyId);
    }
    // Note: scheduleType filtering handled by calendar views

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
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
    await fetchDaySchedules();
    onRefresh(); // Trigger parent refresh
  };

  // Centralized refresh handler that updates both local and parent state
  const handleScheduleMutation = async () => {
    await fetchDaySchedules();
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    onRefresh();
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
  const totalEntries = schedules.length;

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
  const getProjectColor = (projectId: string) => {
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
                <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">Projects</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(schedules.map(s => s.project_id)).size}
              </p>
            </Card>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No schedules for this day</p>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} across {uniqueWorkerCount} worker{uniqueWorkerCount !== 1 ? 's' : ''}
                </p>
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
                              getProjectColor(schedule.project_id)
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
                                  fetchDaySchedules();
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
            fetchDaySchedules();
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
              fetchDaySchedules();
              onRefresh();
              setSplitScheduleData(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
