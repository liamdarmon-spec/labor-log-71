import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
}

interface Worker {
  id: string;
  name: string;
  trade: string;
}

interface WorkerScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string | null;
  workerName: string | null;
  date: string | null;
  onRefresh: () => void;
}

export function WorkerScheduleDialog({ 
  open, 
  onOpenChange, 
  workerId, 
  workerName,
  date, 
  onRefresh 
}: WorkerScheduleDialogProps) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [newWorkerId, setNewWorkerId] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);

  useEffect(() => {
    console.log("WorkerScheduleDialog useEffect", { open, workerId, date });
    if (open && workerId && date) {
      fetchSchedules();
      fetchWorkers();
    }
  }, [open, workerId, date]);

  const fetchSchedules = async () => {
    if (!workerId || !date) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_shifts")
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(project_name, client_name)
      `)
      .eq("worker_id", workerId)
      .eq("scheduled_date", date)
      .order("scheduled_hours", { ascending: false });

    setLoading(false);

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    setSchedules(data || []);
  };

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from("workers")
      .select("id, name, trade")
      .eq("active", true)
      .order("name");

    if (data) {
      setWorkers(data);
    }
  };

  const handleDeleteAll = async () => {
    if (!workerId || !date) return;

    // Check for linked time logs
    const scheduleIds = schedules.map(s => s.id);
    const { data: linkedLogs } = await supabase
      .from("daily_logs")
      .select("id")
      .in("schedule_id", scheduleIds);

    const { error } = await supabase
      .from("scheduled_shifts")
      .delete()
      .eq("worker_id", workerId)
      .eq("scheduled_date", date);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete schedules",
        variant: "destructive"
      });
      return;
    }

    // Also delete linked logs if any
    if (linkedLogs && linkedLogs.length > 0) {
      await supabase
        .from("daily_logs")
        .delete()
        .in("id", linkedLogs.map(l => l.id));
    }

    toast({
      title: "Success",
      description: `Deleted all schedules for ${workerName}${linkedLogs && linkedLogs.length > 0 ? ' and linked time logs' : ''}`
    });
    
    onRefresh();
    onOpenChange(false);
  };

  const handleReassignAll = async () => {
    if (!workerId || !date || !newWorkerId) return;

    const { error } = await supabase
      .from("scheduled_shifts")
      .update({ worker_id: newWorkerId })
      .eq("worker_id", workerId)
      .eq("scheduled_date", date);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reassign schedules",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `Reassigned all shifts to ${workers.find(w => w.id === newWorkerId)?.name}`
    });
    
    onRefresh();
    onOpenChange(false);
  };

  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Worker Schedule: {workerName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {date} • {schedules.length} shift{schedules.length !== 1 ? 's' : ''} • {totalHours} hours total
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Shifts List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Scheduled Shifts</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shifts scheduled</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div 
                      key={schedule.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{schedule.project?.project_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.project?.client_name}
                        </p>
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {schedule.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {schedule.scheduled_hours}h
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk Actions */}
            {schedules.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Bulk Actions</h3>
                
                {/* Reassign Worker */}
                <div className="space-y-2">
                  <Label>Reassign All Shifts to Different Worker</Label>
                  <div className="flex gap-2">
                    <Select value={newWorkerId} onValueChange={setNewWorkerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers
                          .filter(w => w.id !== workerId)
                          .map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} - {worker.trade}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowReassignConfirm(true)}
                      disabled={!newWorkerId}
                    >
                      Reassign
                    </Button>
                  </div>
                </div>

                {/* Delete All */}
                <div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All Shifts for This Worker
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will delete all {schedules.length} shift{schedules.length !== 1 ? 's' : ''} for {workerName} on {date}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Shifts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {schedules.length} shift{schedules.length !== 1 ? 's' : ''} for {workerName} on {date}.
              {schedules.some(s => s.id) && " Any linked time logs will also be deleted."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reassign Confirmation */}
      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign All Shifts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reassign all {schedules.length} shift{schedules.length !== 1 ? 's' : ''} from {workerName} to {workers.find(w => w.id === newWorkerId)?.name} on {date}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReassignAll}>
              Reassign All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
