import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  trade: string;
  trade_id: string | null;
}

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated: () => void;
  defaultDate?: Date;
}

export function BulkScheduleDialog({ open, onOpenChange, onScheduleCreated, defaultDate }: BulkScheduleDialogProps) {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate || new Date());
  const [selectedProject, setSelectedProject] = useState("");
  const [defaultHours, setDefaultHours] = useState("8");
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchData();
      if (defaultDate) {
        setSelectedDate(defaultDate);
      }
    }
  }, [open, defaultDate]);

  const fetchData = async () => {
    const [workersRes, projectsRes] = await Promise.all([
      supabase.from("workers").select("*").eq("active", true).order("name"),
      supabase.from("projects").select("*").eq("status", "Active").order("project_name")
    ]);

    if (workersRes.data) {
      setWorkers(workersRes.data);
      // Select all workers by default
      setSelectedWorkers(new Set(workersRes.data.map(w => w.id)));
    }
    if (projectsRes.data) setProjects(projectsRes.data);
  };

  const handleToggleWorker = (workerId: string) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedWorkers.size === workers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(workers.map(w => w.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedWorkers.size === 0 || !selectedProject || !selectedDate || !defaultHours) {
      toast({
        title: "Missing fields",
        description: "Please select workers, project, date, and hours",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const schedules = Array.from(selectedWorkers).map(workerId => {
      const worker = workers.find(w => w.id === workerId);
      return {
        worker_id: workerId,
        project_id: selectedProject,
        trade_id: worker?.trade_id || null,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        scheduled_hours: parseFloat(defaultHours),
        created_by: userData.user?.id
      };
    });

    const { error } = await supabase.from("scheduled_shifts").insert(schedules);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create schedules",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `${schedules.length} worker(s) scheduled successfully`
    });

    resetForm();
    onScheduleCreated();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedProject("");
    setSelectedDate(new Date());
    setDefaultHours("8");
    setSelectedWorkers(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Schedule Workers</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePickerWithPresets
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Default Hours *</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={defaultHours}
                onChange={(e) => setDefaultHours(e.target.value)}
                placeholder="8"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Workers *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
              >
                {selectedWorkers.size === workers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={worker.id}
                      checked={selectedWorkers.has(worker.id)}
                      onCheckedChange={() => handleToggleWorker(worker.id)}
                    />
                    <label
                      htmlFor={worker.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {worker.name} - {worker.trade}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedWorkers.size} worker(s) selected
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                `Schedule ${selectedWorkers.size} Worker(s)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}