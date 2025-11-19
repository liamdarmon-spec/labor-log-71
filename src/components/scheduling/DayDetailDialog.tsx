import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, ClipboardCheck, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditScheduleDialog } from "./EditScheduleDialog";
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
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
}

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  onRefresh: () => void;
  onAddSchedule: (date: Date) => void;
}

export function DayDetailDialog({ open, onOpenChange, date, onRefresh, onAddSchedule }: DayDetailDialogProps) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduledShift[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);

  useEffect(() => {
    if (open && date) {
      fetchDaySchedules();
    }
  }, [open, date]);

  const fetchDaySchedules = async () => {
    if (!date) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_shifts")
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

  const handleDelete = async (id: string) => {
    // Check if this schedule has been converted to a time log
    const { data: relatedLog } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("schedule_id", id)
      .maybeSingle();

    const confirmMessage = relatedLog
      ? "This schedule has been converted to a time log. Deleting it will also remove the linked time log entry. Continue?"
      : "Are you sure you want to delete this schedule?";

    if (!window.confirm(confirmMessage)) return;

    // If there's a related log, delete it first
    if (relatedLog) {
      const { error: logError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", relatedLog.id);

      if (logError) {
        toast({
          title: "Error",
          description: "Failed to delete related time log",
          variant: "destructive"
        });
        return;
      }
    }

    const { error } = await supabase
      .from("scheduled_shifts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: relatedLog ? "Schedule and related time log deleted" : "Schedule deleted successfully"
    });
    
    fetchDaySchedules();
    onRefresh();
  };

  const handleConvertToTimeLogs = async () => {
    if (!date) return;

    const { data: userData } = await supabase.auth.getUser();
    
    // Create time log entries from schedules
    const timeLogEntries = selectedSchedules.map(schedule => ({
      worker_id: schedule.worker_id,
      project_id: schedule.project_id,
      trade_id: schedule.trade_id,
      date: format(date, "yyyy-MM-dd"),
      hours_worked: schedule.scheduled_hours,
      notes: schedule.notes,
      created_by: userData.user?.id
    }));

    const { error: insertError } = await supabase
      .from("daily_logs")
      .insert(timeLogEntries);

    if (insertError) {
      toast({
        title: "Error",
        description: "Failed to create time logs",
        variant: "destructive"
      });
      return;
    }

    // Delete the converted schedules
    const scheduleIds = selectedSchedules.map(s => s.id);
    const { error: deleteError } = await supabase
      .from("scheduled_shifts")
      .delete()
      .in("id", scheduleIds);

    if (deleteError) {
      console.error("Error deleting schedules:", deleteError);
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
                  onAddSchedule(date);
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
                    onAddSchedule(date);
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
                
                return (
                  <div key={workerName} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{workerName}</h3>
                      <Badge variant="secondary" className="text-sm">
                        {totalWorkerHours}h
                      </Badge>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingSchedule(schedule)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
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
      </DialogContent>
    </Dialog>
  );
}