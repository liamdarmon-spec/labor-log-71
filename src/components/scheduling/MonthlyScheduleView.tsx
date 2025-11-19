import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, startOfWeek, endOfWeek } from "date-fns";

interface ScheduledShift {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  worker: { name: string } | null;
}

interface MonthlyScheduleViewProps {
  onDayClick: (date: Date) => void;
  refreshTrigger: number;
}

export function MonthlyScheduleView({ onDayClick, refreshTrigger }: MonthlyScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth, refreshTrigger]);

  const fetchSchedules = async () => {
    setLoading(true);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from("scheduled_shifts")
      .select(`
        *,
        worker:workers(name)
      `)
      .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
      .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"))
      .order("scheduled_date");

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          This Month
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const daySchedules = getSchedulesForDay(day);
            const totalHours = getTotalHoursForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            // Group schedules by worker
            const workerGroups = daySchedules.reduce((acc, schedule) => {
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
              <Card
                key={day.toISOString()}
                className={`p-2 min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isToday ? "ring-2 ring-primary" : ""}`}
                onClick={() => onDayClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                </div>

                {totalHours > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    {totalHours}h scheduled
                  </div>
                )}

                <div className="space-y-1">
                  {Object.values(workerGroups).slice(0, 3).map((group) => {
                    const totalWorkerHours = group.shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                    
                    return (
                      <div key={group.shifts[0].id} className="bg-muted/50 p-1 rounded text-xs">
                        <div className="font-medium truncate">
                          {group.worker?.name || "Unknown"}
                        </div>
                        <div className="text-muted-foreground">
                          {totalWorkerHours}h
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(workerGroups).length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{Object.values(workerGroups).length - 3} more
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}