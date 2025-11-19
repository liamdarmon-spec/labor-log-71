import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  scheduled_hours: number;
  notes: string | null;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
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
        project:projects(project_name, client_name)
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

    fetchDaySchedules();
    onRefresh();
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);

  // Group schedules by project
  const schedulesByProject = schedules.reduce((acc, schedule) => {
    const projectName = schedule.project?.project_name || "Unknown";
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(schedule);
    return acc;
  }, {} as Record<string, ScheduledShift[]>);

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
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Workers</p>
              <p className="text-2xl font-bold">{schedules.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold">{totalHours}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">{Object.keys(schedulesByProject).length}</p>
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
            <div className="space-y-4">
              {Object.entries(schedulesByProject).map(([projectName, projectSchedules]) => (
                <div key={projectName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{projectName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {projectSchedules[0]?.project?.client_name}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {projectSchedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0)}h
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {projectSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md group hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{schedule.worker?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.worker?.trade} • {schedule.scheduled_hours}h
                          </p>
                          {schedule.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Note: {schedule.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}