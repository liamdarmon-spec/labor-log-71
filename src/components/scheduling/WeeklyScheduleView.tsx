import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Split, User, Briefcase, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { UniversalDayDetailDialog } from "./UniversalDayDetailDialog";
// Scheduler engine types - will be integrated in next step
import type { SchedulerFilterMode } from "@/lib/scheduler/types";
// import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";

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
}

interface WeeklyScheduleViewProps {
  onScheduleClick: (date: Date) => void;
  refreshTrigger: number;
  scheduleType: "workers" | "subs" | "meetings" | "all";
}

export function WeeklyScheduleView({ onScheduleClick, refreshTrigger, scheduleType }: WeeklyScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // TODO: In next step, replace fetchSchedules with useSchedulerData hook
  // const { days, assignmentsByDay, loading: hookLoading } = useSchedulerData({
  //   viewMode: "week",
  //   filter: scheduleType as SchedulerFilterMode,
  //   startDate: currentWeekStart,
  //   endDate: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
  // });

  useEffect(() => {
    fetchSchedules();
  }, [currentWeekStart, refreshTrigger, scheduleType]);

  const fetchSchedules = async () => {
    setLoading(true);
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

    if (scheduleType === "workers" || scheduleType === "all") {
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
    } else {
      setLoading(false);
      setSchedules([]);
    }
  };


  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getSchedulesForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return schedules.filter(s => s.scheduled_date === dayStr);
  };

  const getTotalHoursForDay = (day: Date) => {
    return getSchedulesForDay(day).reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
  };

  // Generate a consistent color for each project
  const getProjectColor = (projectId: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-pink-100 text-pink-700 border-pink-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    const hash = projectId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
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
              className={`p-3 min-h-[200px] cursor-pointer hover:shadow-md transition-all ${
                isToday ? "ring-2 ring-primary shadow-lg" : ""
              }`}
              onClick={() => setSelectedDate(day)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleClick(day);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {totalHours > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalHours}h scheduled
                  </p>
                )}

                <div className="space-y-2">
                  {Object.values(workerGroups).map(({ workerId, worker, shifts }) => {
                    const totalWorkerHours = shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                    
                    return (
                      <Card 
                        key={workerId} 
                        className="p-2 bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-border transition-all shadow-sm hover:shadow group/worker"
                      >
                        {/* Worker Header with Summary */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="font-semibold text-xs text-foreground truncate">
                              {worker?.name || "Unknown"}
                            </span>
                          </div>
                          
                          {/* Summary Section */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-0.5">
                              <Briefcase className="h-2.5 w-2.5" />
                              <span>{shifts.length}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{totalWorkerHours}h</span>
                            </div>
                          </div>
                        </div>

                        {/* Projects List */}
                        <div className="space-y-1">
                          {shifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`flex items-center justify-between gap-1 p-1 rounded text-[10px] ${
                                getProjectColor(shift.project_id)
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium flex-1 truncate">
                                  {shift.project?.project_name || "Unknown"}
                                </span>
                                <span className="text-xs opacity-70">{shift.scheduled_hours}h</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {loading && <p className="text-center text-muted-foreground">Loading schedules...</p>}

      <UniversalDayDetailDialog
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate}
        onRefresh={fetchSchedules}
        onAddSchedule={() => {
          if (selectedDate) {
            onScheduleClick(selectedDate);
          }
        }}
      />
    </div>
  );
}