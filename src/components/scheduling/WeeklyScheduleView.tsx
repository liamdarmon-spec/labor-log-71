import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [currentWeekStart, refreshTrigger]);

  const fetchSchedules = async () => {
    setLoading(true);
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

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
      description: "Schedule deleted"
    });

    fetchSchedules();
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter(s => isSameDay(new Date(s.scheduled_date), day));
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
          onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          This Week
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const daySchedules = getSchedulesForDay(day);
          const totalHours = getTotalHoursForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 min-h-[200px] cursor-pointer hover:shadow-md transition-shadow ${
                isToday ? "border-primary" : ""
              }`}
              onClick={() => onScheduleClick(day)}
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

                <div className="space-y-1">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-primary/10 p-2 rounded text-xs group relative"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {schedule.worker?.name || "Unknown"}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {schedule.project?.project_name || "Unknown"}
                          </p>
                          <p className="font-semibold">{schedule.scheduled_hours}h</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {loading && <p className="text-center text-muted-foreground">Loading schedules...</p>}
    </div>
  );
}