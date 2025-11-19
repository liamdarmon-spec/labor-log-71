import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { WorkerScheduleDialog } from "./WorkerScheduleDialog";

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
}

interface DailyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
}

export function DailyScheduleView({ onScheduleClick, refreshTrigger }: DailyScheduleViewProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [currentDate, refreshTrigger]);

  const fetchSchedules = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scheduled_shifts")
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(project_name, client_name)
      `)
      .eq("scheduled_date", format(currentDate, "yyyy-MM-dd"))
      .order("worker_id");

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
  };

  const handleDeleteSchedule = async (id: string) => {
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
    fetchSchedules();
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);

  // Group schedules by worker
  const schedulesByWorker = schedules.reduce((acc, schedule) => {
    const workerId = schedule.worker_id;
    if (!acc[workerId]) {
      acc[workerId] = {
        worker: schedule.worker,
        shifts: []
      };
    }
    acc[workerId].shifts.push(schedule);
    return acc;
  }, {} as Record<string, { worker: ScheduledShift['worker'], shifts: ScheduledShift[] }>);

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
            size="sm"
            onClick={() => onScheduleClick(currentDate)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Schedule
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Total Workers</p>
            <p className="text-2xl font-bold">{Object.keys(schedulesByWorker).length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{totalHours}h</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Shifts</p>
            <p className="text-2xl font-bold">{schedules.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No schedules for this day</p>
            <Button onClick={() => onScheduleClick(currentDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(schedulesByWorker).map(([workerId, { worker, shifts }]) => (
              <Card key={workerId} className="overflow-hidden">
                <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{worker?.name || "Unknown Worker"}</h4>
                    <p className="text-sm text-muted-foreground">{worker?.trade || "No trade"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0)}h total
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWorker({ id: workerId, name: worker?.name || "Unknown" });
                        setWorkerDialogOpen(true);
                      }}
                      className="gap-1"
                    >
                      <UserCog className="h-4 w-4" />
                      Manage
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {shifts.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md group hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{schedule.project?.project_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.project?.client_name} • {schedule.scheduled_hours}h
                        </p>
                        {schedule.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Note: {schedule.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setEditingSchedule(schedule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <EditScheduleDialog
        open={!!editingSchedule}
        onOpenChange={(open) => !open && setEditingSchedule(null)}
        schedule={editingSchedule}
        onSuccess={fetchSchedules}
      />
    </div>
  );
}