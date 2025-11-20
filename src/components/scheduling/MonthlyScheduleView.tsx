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

  const handleDeleteSchedule = async (scheduleId: string) => {
    // Check if there's a linked time log
    const { data: linkedLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('schedule_id', scheduleId)
      .maybeSingle();

    // Delete linked time log first if it exists
    if (linkedLog) {
      const { error: logError } = await supabase
        .from('daily_logs')
        .delete()
        .eq('schedule_id', scheduleId);

      if (logError) {
        toast({
          title: 'Error',
          description: 'Failed to delete linked time log',
          variant: 'destructive',
        });
        return;
      }
    }

    // Delete the schedule
    const { error } = await supabase
      .from('scheduled_shifts')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });
      fetchSchedules();
    }
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
            <Calendar className="h-4 w-4 mr-2" />
            This Month
          </Button>
        </div>

        {loading ? (
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <div 
                  key={day} 
                  className={`text-center font-semibold text-sm p-2 ${
                    idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
                  }`}
                >
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
                    className={`p-2 min-h-[140px] cursor-pointer transition-all hover:shadow-md ${
                      !isCurrentMonth ? "opacity-40 bg-muted/20" : ""
                    } ${isToday ? "ring-2 ring-primary shadow-lg" : ""} ${
                      isWeekendDay ? "bg-muted/30" : ""
                    } ${isPastDay ? "bg-muted/10" : ""}`}
                    onClick={() => onDayClick(day)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${
                        isToday ? "text-primary bg-primary/10 px-2 py-0.5 rounded-full" : 
                        isWeekendDay ? "text-muted-foreground" : ""
                      }`}>
                        {format(day, "d")}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="text-[10px] h-5">Today</Badge>
                      )}
                    </div>

                    {totalHours > 0 && (
                      <div className="flex items-center gap-1 mb-2 bg-primary/5 rounded px-1.5 py-1">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {totalHours}h
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {Object.values(workerGroups).slice(0, 3).map((group) => {
                        const totalWorkerHours = group.shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                        
                        return (
                          <div key={group.shifts[0].id} className="space-y-1">
                            <div className="bg-gradient-to-r from-muted/80 to-muted/40 p-1.5 rounded-md border border-border/30">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-foreground/70" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-xs truncate text-foreground">
                                    {group.worker?.name || "Unknown"}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    {totalWorkerHours}h
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Show individual shifts for this worker */}
                            {group.shifts.map((shift) => (
                              <Tooltip key={shift.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`p-1.5 rounded-md text-xs border transition-all group/shift hover:shadow-sm ${
                                      getProjectColor(shift.project_id)
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <Briefcase className="h-2.5 w-2.5 flex-shrink-0" />
                                        <span className="font-medium truncate text-[10px]">
                                          {shift.project?.project_name || "Unknown"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="h-4 text-[9px] px-1 font-semibold">
                                          {shift.scheduled_hours}h
                                        </Badge>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/shift:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 hover:bg-background/80"
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
                                            <Split className="h-3 w-3" />
                                          </Button>
                                          <ScheduleEditButton 
                                            onClick={() => {
                                              setEditingSchedule(shift);
                                            }} 
                                          />
                                          <ScheduleDeleteButton 
                                            onConfirm={() => handleDeleteSchedule(shift.id)}
                                            hasTimeLog={shift.converted_to_timelog || false}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold">{shift.project?.project_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Client: {shift.project?.client_name}
                                    </div>
                                    <div className="text-xs">
                                      Worker: {group.worker?.name} ({group.worker?.trade})
                                    </div>
                                    <div className="text-xs">Hours: {shift.scheduled_hours}</div>
                                    {shift.notes && (
                                      <div className="text-xs text-muted-foreground">
                                        Notes: {shift.notes}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        );
                      })}
                      {Object.values(workerGroups).length > 3 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-1 text-center cursor-help">
                              +{Object.values(workerGroups).length - 3} more workers
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {Object.values(workerGroups).slice(3).map((group) => (
                                <div key={group.shifts[0].id} className="text-xs">
                                  {group.worker?.name}
                                </div>
                              ))}
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