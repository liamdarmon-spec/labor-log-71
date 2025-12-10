/**
 * @deprecated LEGACY - DO NOT USE
 * 
 * This component is superseded by UniversalDayDetailDialog, which is the 
 * canonical day-level planner. UniversalDayDetailDialog handles:
 * - Work schedules (labor)
 * - Meetings/events (project_todos)
 * - All filtering and highlighting features
 * 
 * This file is kept for reference only and should be deleted once
 * migration is confirmed complete.
 * 
 * Use `UniversalDayDetailDialog` instead.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";
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
  converted_to_timelog?: boolean;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
}

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  onRefresh: () => void;
  onAddSchedule: (workerId?: string, date?: string) => void;
  highlightWorkerId?: string | null;
  projectContext?: string;
}

export function DayDetailDialog({ open, onOpenChange, date, onRefresh, onAddSchedule, highlightWorkerId, projectContext }: DayDetailDialogProps) {
  const { toast } = useToast();
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
    const { data, error } = await supabase
      .from("work_schedules")
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(project_name, client_name),
        trade:trades(name)
      `)
      .eq("scheduled_date", format(date, "yyyy-MM-dd"))
      .order("worker_id");

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
  };


  const handleConvertToTimeLogs = async () => {
    if (!date) return;

    const { data: userData } = await supabase.auth.getUser();
    
    // Mark schedules as converted (the triggers will create time_logs automatically)
    const scheduleIds = selectedSchedules.map(s => s.id);
    
    const { error } = await supabase
      .from("work_schedules")
      .update({ converted_to_timelog: true })
      .in("id", scheduleIds);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to convert schedules",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `Converted ${selectedSchedules.length} schedule(s) to time logs`
    });

    setConvertDialogOpen(false);
    setSelectedSchedules([]);
    fetchDaySchedules();
    onRefresh();
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);

  // Group schedules by worker
  const schedulesByWorker = schedules.reduce((acc, schedule) => {
    const workerName = schedule.worker?.name || "Unknown";
    if (!acc[workerName]) {
      acc[workerName] = {
        worker: schedule.worker,
        schedules: []
      };
    }
    acc[workerName].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { worker: ScheduledShift['worker']; schedules: ScheduledShift[] }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{date ? format(date, "EEEE, MMMM d, yyyy") : ""}</span>
            <Button
              size="sm"
              onClick={() => {
                if (date) {
                  onAddSchedule();
                  onOpenChange(false);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add to Schedule
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Workers</p>
              <p className="text-xl font-semibold">{Object.keys(schedulesByWorker).length}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-xl font-semibold">{totalHours}h</p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No schedules for this day</p>
              <Button
                onClick={() => {
                  if (date) {
                    onAddSchedule();
                    onOpenChange(false);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Schedule
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSchedules(schedules);
                    setConvertDialogOpen(true);
                  }}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Convert to Time Logs
                </Button>
              </div>
              <div className="space-y-3">
              {Object.entries(schedulesByWorker).map(([workerName, { worker, schedules: workerSchedules }]) => {
                const totalWorkerHours = workerSchedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                const workerId = workerSchedules[0]?.worker_id;
                const isHighlighted = focusedWorkerId === workerId;
                const hasMultipleProjects = workerSchedules.length > 1;
                
                return (
                  <div 
                    key={workerName} 
                    className={`border rounded-lg p-4 transition-all ${
                      isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 
                            className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setFocusedWorkerId(focusedWorkerId === workerId ? null : workerId)}
                          >
                            {workerName}
                          </h3>
                          {isHighlighted && (
                            <Badge variant="default" className="text-xs">Viewing</Badge>
                          )}
                          {hasMultipleProjects && (
                            <Badge variant="outline" className="text-xs">
                              {workerSchedules.length} projects
                            </Badge>
                          )}
                        </div>
                        {worker?.trade && (
                          <p className="text-xs text-muted-foreground mt-0.5">{worker.trade}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {totalWorkerHours}h
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
                            title="Rebalance projects"
                          >
                            <Split className="h-3 w-3 mr-1" />
                            Rebalance
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {workerSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-2 rounded group hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {schedule.project?.project_name}
                            </span>
                            {schedule.trade && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {schedule.trade.name}
                                </span>
                              </>
                            )}
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {schedule.scheduled_hours}h
                            </span>
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
                  </div>
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