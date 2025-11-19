import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, startOfWeek, endOfWeek } from "date-fns";

interface ScheduledShift {
  id: string;
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

            return (
              <Card
                key={day.toISOString()}
                className={`min-h-[100px] p-2 cursor-pointer hover:shadow-md transition-all ${
                  isToday ? "border-primary ring-2 ring-primary/20" : ""
                } ${!isCurrentMonth ? "opacity-40" : ""}`}
                onClick={() => onDayClick(day)}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {totalHours > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {totalHours}h
                      </span>
                    )}
                  </div>

                  {daySchedules.length > 0 && (
                    <div className="space-y-0.5">
                      {daySchedules.slice(0, 2).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs bg-muted p-1 rounded truncate"
                          title={`${schedule.worker?.name} - ${schedule.scheduled_hours}h`}
                        >
                          {schedule.worker?.name}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySchedules.length - 2} more
                        </div>
                      )}
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