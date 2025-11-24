/**
 * ScheduleDeleteButton - Delete work_schedules with time_logs handling
 * 
 * CANONICAL: Deletes from work_schedules, optionally handles linked time_logs
 * 
 * For future schedules without time logs: Simple delete
 * For past schedules or those with time logs: Offers to keep or delete time logs
 */

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isPast, isFuture, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduleDeleteButtonProps {
  scheduleId: string;
  scheduleDate: string;
  onSuccess: () => void;
}

export function ScheduleDeleteButton({ scheduleId, scheduleDate, onSuccess }: ScheduleDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [hasTimeLog, setHasTimeLog] = useState(false);
  const [timeLogIds, setTimeLogIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      checkForTimeLog();
    }
  }, [open, scheduleId]);

  const checkForTimeLog = async () => {
    const { data, error } = await supabase
      .from("time_logs")
      .select("id")
      .eq("source_schedule_id", scheduleId);

    if (error) {
      console.error("Error checking for time log:", error);
      return;
    }

    setHasTimeLog((data?.length || 0) > 0);
    setTimeLogIds(data?.map(log => log.id) || []);
  };

  const schedDate = parseISO(scheduleDate);
  const isFutureSchedule = isFuture(schedDate) && !hasTimeLog;
  const needsConfirmation = !isFutureSchedule;

  const handleSimpleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", scheduleId);

    setLoading(false);

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
      description: "Schedule deleted successfully"
    });
    setOpen(false);
    onSuccess();
  };

  const handleKeepTimeLog = async () => {
    setLoading(true);

    // Set source_schedule_id to NULL on all related time logs (canonical)
    if (timeLogIds.length > 0) {
      const { error: updateError } = await supabase
        .from("time_logs")
        .update({ source_schedule_id: null })
        .in("id", timeLogIds);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to update time logs",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", scheduleId);

    setLoading(false);

    if (deleteError) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Schedule deleted. Time logs preserved."
    });
    setOpen(false);
    onSuccess();
  };

  const handleDeleteBoth = async () => {
    setLoading(true);

    // Delete time logs first (canonical)
    if (timeLogIds.length > 0) {
      const { error: logError } = await supabase
        .from("time_logs")
        .delete()
        .in("id", timeLogIds);

      if (logError) {
        toast({
          title: "Error",
          description: "Failed to delete time logs",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }

    // Delete the schedule
    const { error: scheduleError } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", scheduleId);

    setLoading(false);

    if (scheduleError) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Schedule and time logs deleted"
    });
    setOpen(false);
    onSuccess();
  };

  if (!needsConfirmation) {
    // Simple delete for future schedules without time logs
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSimpleDelete} 
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Advanced delete dialog for past schedules or schedules with time logs
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This schedule already has a time log</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting it may affect payroll or reporting. What do you want to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start text-left"
            onClick={handleKeepTimeLog}
            disabled={loading}
          >
            <div className="flex flex-col items-start">
              <span className="font-semibold">Keep the time log and remove this schedule</span>
              <span className="text-xs text-muted-foreground">Recommended - Preserves payroll data</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-left border-destructive/50 hover:bg-destructive/10"
            onClick={handleDeleteBoth}
            disabled={loading}
          >
            <div className="flex flex-col items-start">
              <span className="font-semibold">Delete both schedule and time log</span>
              <span className="text-xs text-muted-foreground">Warning - This will affect payroll records</span>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
