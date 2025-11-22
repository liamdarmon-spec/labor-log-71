import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isFuture, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCostCodes } from "@/hooks/useCostCodes";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  cost_code_id?: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
}

interface Worker {
  id: string;
  name: string;
  trade_id: string | null;
}

interface Project {
  id: string;
  project_name: string;
}

interface Trade {
  id: string;
  name: string;
}

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduledShift | null;
  onSuccess: () => void;
}

export function EditScheduleDialog({ open, onOpenChange, schedule, onSuccess }: EditScheduleDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasTimeLog, setHasTimeLog] = useState(false);
  const [timeLogId, setTimeLogId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const { data: laborCostCodes } = useCostCodes('labor');

  const [formData, setFormData] = useState({
    worker_id: "",
    project_id: "",
    trade_id: "",
    cost_code_id: "",
    scheduled_date: new Date(),
    scheduled_hours: "",
    notes: ""
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (schedule) {
      setFormData({
        worker_id: schedule.worker_id,
        project_id: schedule.project_id,
        trade_id: schedule.trade_id || "",
        cost_code_id: schedule.cost_code_id || "",
        scheduled_date: new Date(schedule.scheduled_date),
        scheduled_hours: schedule.scheduled_hours.toString(),
        notes: schedule.notes || ""
      });
      checkForTimeLog(schedule.id, schedule.scheduled_date);
    }
  }, [schedule]);

  const checkForTimeLog = async (scheduleId: string, scheduleDate: string) => {
    const schedDate = parseISO(scheduleDate);
    const isFutureDate = isFuture(schedDate);

    // Check if there's a related time log
    const { data, error } = await supabase
      .from("time_logs")
      .select("id")
      .eq("source_schedule_id", scheduleId)
      .maybeSingle();

    if (error) {
      console.error("Error checking for time log:", error);
      return;
    }

    const logExists = !!data;
    setHasTimeLog(logExists);
    setTimeLogId(data?.id || null);

    // Lock editing if there's a time log and the date is today or in the past
    setIsLocked(logExists && !isFutureDate);
  };

  const fetchData = async () => {
    const [workersRes, projectsRes, tradesRes] = await Promise.all([
      supabase.from("workers").select("id, name, trade_id").eq("active", true).order("name"),
      supabase.from("projects").select("id, project_name").eq("status", "Active").order("project_name"),
      supabase.from("trades").select("id, name").order("name")
    ]);

    if (workersRes.data) setWorkers(workersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (tradesRes.data) setTrades(tradesRes.data);
  };

  const handleEditTimeLog = () => {
    onOpenChange(false);
    navigate("/daily-log");
  };

  const handleSubmit = async () => {
    if (!schedule) return;

    if (!formData.worker_id || !formData.project_id || !formData.scheduled_hours) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("work_schedules")
      .update({
        worker_id: formData.worker_id,
        project_id: formData.project_id,
        trade_id: formData.trade_id || null,
        cost_code_id: formData.cost_code_id || null,
        scheduled_date: format(formData.scheduled_date, "yyyy-MM-dd"),
        scheduled_hours: parseFloat(formData.scheduled_hours),
        notes: formData.notes || null
      })
      .eq("id", schedule.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Schedule updated successfully"
    });

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Schedule Entry</DialogTitle>
        </DialogHeader>
        
        {isLocked && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <div>
                A time log has already been created for this schedule. Hours and project changes should be made on the time log, not the schedule.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditTimeLog}
                className="w-fit gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Edit time log instead
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <DatePickerWithPresets
              date={formData.scheduled_date}
              onDateChange={(date) => setFormData({ ...formData, scheduled_date: date })}
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker">Worker *</Label>
            <Select
              value={formData.worker_id}
              onValueChange={(value) => setFormData({ ...formData, worker_id: value })}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade">Trade</Label>
            <Select
              value={formData.trade_id}
              onValueChange={(value) => setFormData({ ...formData, trade_id: value })}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trade (optional)" />
              </SelectTrigger>
              <SelectContent>
                {trades.map((trade) => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_code">Cost Code</Label>
            <Select
              value={formData.cost_code_id}
              onValueChange={(value) => setFormData({ ...formData, cost_code_id: value })}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cost code (optional)" />
              </SelectTrigger>
              <SelectContent>
                {laborCostCodes?.map((code) => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.code} - {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={formData.scheduled_hours}
              onChange={(e) => setFormData({ ...formData, scheduled_hours: e.target.value })}
              placeholder="8"
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || isLocked}>
            {loading ? "Updating..." : "Update Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
