import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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

interface WeeklyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
}

export function WeeklyScheduleView({ onScheduleClick, refreshTrigger }: WeeklyScheduleViewProps) {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; name: string; date: string } | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [currentWeekStart, refreshTrigger]);

  const fetchSchedules = async () => {
    setLoading(true);
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

    const { data, error } = await supabase
      .from("scheduled_shifts")
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(project_name, client_name)
      `)
      .gte("scheduled_date", format(currentWeekStart, "yyyy-MM-dd"))
      .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
      .order("scheduled_date")
      .order("worker_id");

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
  };

  const handleDeleteSchedule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getSchedulesForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return schedules.filter(s => s.scheduled_date === dayStr);
  };

  const getTotalHoursForDay = (day: Date) => {
    return getSchedulesForDay(day).reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
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
          const daySchedules = getSchedulesForDay(day);
          const totalHours = getTotalHoursForDay(day);
          
          // Group schedules by worker
          const workerGroups = daySchedules.reduce((acc, schedule) => {
            const workerId = schedule.worker_id;
            if (!acc[workerId]) {
              acc[workerId] = {
                workerId,
                worker: schedule.worker,
                shifts: []
              };
            }
            acc[workerId].shifts.push(schedule);
            return acc;
          }, {} as Record<string, { workerId: string; worker: ScheduledShift['worker'], shifts: ScheduledShift[] }>);

          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 min-h-[200px] ${
                isToday ? "border-primary" : ""
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{format(day, "EEE")}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onScheduleClick(day)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {totalHours > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalHours}h scheduled
                  </p>
                )}

                <div className="space-y-1">
                  {Object.values(workerGroups).map(({ workerId, worker, shifts }) => (
                    <Card 
                      key={workerId} 
                      className="p-3 hover:bg-accent/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedWorker({ 
                          id: workerId, 
                          name: worker?.name || "Unknown",
                          date: format(day, "yyyy-MM-dd")
                        });
                        setWorkerDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{worker?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{worker?.trade || "No trade"}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0)}h
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorker({ 
                                id: workerId, 
                                name: worker?.name || "Unknown",
                                date: format(day, "yyyy-MM-dd")
                              });
                              setWorkerDialogOpen(true);
                            }}
                          >
                            <UserCog className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {shifts.map((shift) => (
                          <div key={shift.id} className="flex items-center justify-between gap-2 p-1.5 bg-background/50 rounded">
                            <p className="text-muted-foreground truncate flex-1 text-xs">
                              {shift.project?.project_name || "Unknown"} • {shift.scheduled_hours}h
                            </p>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSchedule(shift);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => handleDeleteSchedule(shift.id, e)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {loading && <p className="text-center text-muted-foreground">Loading schedules...</p>}

      <EditScheduleDialog
        open={!!editingSchedule}
        onOpenChange={(open) => !open && setEditingSchedule(null)}
        schedule={editingSchedule}
        onSuccess={fetchSchedules}
      />
    </div>
  );
}