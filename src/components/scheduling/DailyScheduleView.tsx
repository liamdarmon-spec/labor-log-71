import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Split, User, Briefcase, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { WorkerScheduleDialog } from "./WorkerScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";

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
  const [splitScheduleData, setSplitScheduleData] = useState<{
    scheduleId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);

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
            {Object.entries(schedulesByWorker).map(([workerId, { worker, shifts }]) => {
              const totalWorkerHours = shifts.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
              
              return (
                <Card key={workerId} className="p-4 bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-border transition-all shadow-sm hover:shadow group/worker">
                  {/* Worker Header with Summary */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-base text-foreground">
                        {worker?.name || "Unknown"}
                      </span>
                    </div>
                    
                    {/* Summary Section */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>{shifts.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{totalWorkerHours}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Projects List */}
                  <div className="space-y-2">
                    {shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                          getProjectColor(shift.project_id)
                        }`}
                      >
                        <span className="font-medium flex-1">
                          {shift.project?.project_name || "Unknown"}
                        </span>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover/worker:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-background/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSplitScheduleData({
                                scheduleId: shift.id,
                                workerName: worker?.name || "Unknown",
                                date: shift.scheduled_date,
                                hours: shift.scheduled_hours,
                                projectId: shift.project_id
                              });
                            }}
                            title="Split into multiple projects"
                          >
                            <Split className="h-3.5 w-3.5" />
                          </Button>
                          <ScheduleEditButton onClick={() => setEditingSchedule(shift)} />
                          <ScheduleDeleteButton 
                            scheduleId={shift.id}
                            scheduleDate={shift.scheduled_date}
                            onSuccess={fetchSchedules}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

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
  );
}