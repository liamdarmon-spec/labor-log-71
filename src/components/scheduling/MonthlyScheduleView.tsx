import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Split, Clock, User, Briefcase, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, startOfWeek, endOfWeek, isPast, isWeekend } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface MonthlyScheduleViewProps {
  onDayClick: (date: Date) => void;
  refreshTrigger: number;
}

export function MonthlyScheduleView({ onDayClick, refreshTrigger }: MonthlyScheduleViewProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);
  const [splitScheduleData, setSplitScheduleData] = useState<{
    scheduleId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);

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
        worker:workers(name, trade),
        project:projects(project_name, client_name)
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
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base sm:text-lg font-semibold min-w-[160px] sm:min-w-[200px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
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
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">This Month</span>
            <span className="sm:hidden">Today</span>
          </Button>
        </div>

        {loading ? (
          <Card className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-[100px] sm:h-[120px]" />
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-2 sm:p-4">
            {/* Day Headers - Responsive */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <div 
                  key={day} 
                  className={`text-center font-semibold text-[10px] sm:text-sm p-1 sm:p-2 ${
                    idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {/* Show full name on desktop, abbreviation on mobile */}
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day[0]}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid - Responsive */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const daySchedules = getSchedulesForDay(day);
                const totalHours = getTotalHoursForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isPastDay = isPast(day) && !isToday;
                const isWeekendDay = isWeekend(day);

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
                    className={`p-1 sm:p-2 min-h-[80px] sm:min-h-[140px] cursor-pointer transition-all hover:shadow-md ${
                      !isCurrentMonth ? "opacity-40 bg-muted/20" : ""
                    } ${isToday ? "ring-1 sm:ring-2 ring-primary shadow-lg" : ""} ${
                      isWeekendDay ? "bg-muted/30" : ""
                    } ${isPastDay ? "bg-muted/10" : ""}`}
                    onClick={() => onDayClick(day)}
                  >
                    {/* Day Number and Badge */}
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className={`text-xs sm:text-sm font-semibold ${
                        isToday ? "text-primary bg-primary/10 px-1 sm:px-2 py-0.5 rounded-full" : 
                        isWeekendDay ? "text-muted-foreground" : ""
                      }`}>
                        {format(day, "d")}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1">
                          <span className="hidden sm:inline">Today</span>
                          <span className="sm:hidden">•</span>
                        </Badge>
                      )}
                    </div>

                    {/* Total Hours Badge - Responsive */}
                    {totalHours > 0 && (
                      <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2 bg-primary/5 rounded px-1 sm:px-1.5 py-0.5 sm:py-1">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                        <span className="text-[10px] sm:text-xs font-medium text-primary">
                          {totalHours}h
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 sm:space-y-1.5">
                      {Object.values(workerGroups).slice(0, 4).map((group) => {
                        const totalWorkerHours = group.shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                        
                        return (
                          <Tooltip key={group.shifts[0].worker_id}>
                            <TooltipTrigger asChild>
                              <div
                                className="bg-gradient-to-br from-card to-muted/30 p-1 sm:p-2 rounded-md border border-border/50 hover:border-border transition-all group/worker shadow-sm hover:shadow"
                                onClick={(e) => e.stopPropagation()}
                              >
                                 {/* Worker Header - Responsive */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <User className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-primary flex-shrink-0" />
                                    <span className="font-semibold text-[10px] sm:text-xs truncate text-foreground">
                                      {group.worker?.name || "Unknown"}
                                    </span>
                                  </div>
                                  
                                  {/* Summary Section */}
                                  <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-muted-foreground">
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                      <Briefcase className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                      <span>{group.shifts.length}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                      <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                      <span>{totalWorkerHours}h</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Projects List - Responsive */}
                                <div className="space-y-0.5 sm:space-y-1">
                                  {group.shifts.map((shift, idx) => (
                                    <div
                                      key={shift.id}
                                      className={`flex items-center justify-between gap-1 sm:gap-1.5 p-0.5 sm:p-1 rounded text-[9px] sm:text-[10px] ${
                                        getProjectColor(shift.project_id)
                                      }`}
                                    >
                                      <span className="font-medium flex-1">
                                        {shift.project?.project_name || "Unknown"}
                                      </span>
                                      
                                      {/* Action buttons - only show on hover on larger screens */}
                                      <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover/worker:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 hover:bg-background/80"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSplitScheduleData({
                                              scheduleId: shift.id,
                                              workerName: group.worker?.name || "Unknown",
                                              date: shift.scheduled_date,
                                              hours: shift.scheduled_hours,
                                              projectId: shift.project_id
                                            });
                                          }}
                                          title="Split into multiple projects"
                                        >
                                          <Split className="h-2.5 w-2.5" />
                                        </Button>
                                          <ScheduleEditButton 
                                            onClick={() => {
                                              setEditingSchedule(shift);
                                            }} 
                                          />
                                          <ScheduleDeleteButton 
                                            scheduleId={shift.id}
                                            scheduleDate={shift.scheduled_date}
                                            onSuccess={fetchSchedules}
                                          />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1.5">
                                <div className="font-semibold">{group.worker?.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Trade: {group.worker?.trade}
                                </div>
                                <div className="text-xs font-medium">
                                  Total: {totalWorkerHours}h across {group.shifts.length} project{group.shifts.length > 1 ? 's' : ''}
                                </div>
                                <div className="space-y-0.5 pt-1 border-t">
                                  {group.shifts.map((shift) => (
                                    <div key={shift.id} className="text-xs">
                                      • {shift.project?.project_name}: {shift.scheduled_hours}h
                                      {shift.notes && ` - ${shift.notes}`}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      {Object.values(workerGroups).length > 4 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-[10px] sm:text-xs text-muted-foreground bg-muted/30 rounded p-1 sm:p-1.5 text-center cursor-help hover:bg-muted/50 transition-colors">
                              +{Object.values(workerGroups).length - 4} <span className="hidden sm:inline">more workers</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {Object.values(workerGroups).slice(4).map((group) => {
                                const totalHours = group.shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                                return (
                                  <div key={group.shifts[0].worker_id} className="text-xs">
                                    {group.worker?.name} - {totalHours}h
                                  </div>
                                );
                              })}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        )}

        <EditScheduleDialog
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          schedule={editingSchedule}
          onSuccess={fetchSchedules}
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
              fetchSchedules();
              setSplitScheduleData(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}