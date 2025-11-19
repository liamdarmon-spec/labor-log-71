import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

interface Trade {
  id: string;
  name: string;
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated: () => void;
  defaultDate?: Date;
}

export function ScheduleDialog({ open, onOpenChange, onScheduleCreated, defaultDate }: ScheduleDialogProps) {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate || new Date());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchData();
      if (defaultDate) {
        setSelectedDate(defaultDate);
      }
    }
  }, [open, defaultDate]);

  const fetchData = async () => {
    const [workersRes, projectsRes, tradesRes] = await Promise.all([
      supabase.from("workers").select("*").eq("active", true).order("name"),
      supabase.from("projects").select("*").eq("status", "Active").order("project_name"),
      supabase.from("trades").select("*").order("name")
    ]);

    if (workersRes.data) setWorkers(workersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (tradesRes.data) setTrades(tradesRes.data);
  };

  const handleWorkerChange = (workerId: string) => {
    setSelectedWorker(workerId);
    const worker = workers.find(w => w.id === workerId);
    if (worker?.trade_id) {
      setSelectedTrade(worker.trade_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWorker || !selectedProject || !selectedDate || !hours) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("scheduled_shifts").insert({
      worker_id: selectedWorker,
      project_id: selectedProject,
      trade_id: selectedTrade || null,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_hours: parseFloat(hours),
      notes: notes || null,
      created_by: userData.user?.id
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Schedule created successfully"
    });

    resetForm();
    onScheduleCreated();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedWorker("");
    setSelectedProject("");
    setSelectedTrade("");
    setSelectedDate(new Date());
    setHours("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Worker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <DatePickerWithPresets
              date={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker">Worker *</Label>
            <Select value={selectedWorker} onValueChange={handleWorkerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name} - {worker.trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="trade">Trade</Label>
            <Select value={selectedTrade} onValueChange={setSelectedTrade}>
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
            <Label htmlFor="hours">Scheduled Hours *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}