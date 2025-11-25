/**
 * DaySummaryDialog - Shows detailed view of all time logs for a worker on a specific day
 * 
 * Features:
 * - Lists all underlying time_logs entries
 * - Edit/delete actions for each entry
 * - Top-level actions: Split/Rebalance and Add Project
 * - Operates purely on time_logs table (canonical)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit2, Trash2, Plus, Split, Calendar, User, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { GroupedTimeLog } from '@/lib/timeLogGrouping';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DaySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupedTimeLog;
  onRefresh: () => void;
  onEditTimeLog: (timeLogId: string) => void;
  onSplitRebalance: () => void;
  onAddProject: () => void;
}

export function DaySummaryDialog({
  open,
  onOpenChange,
  group,
  onRefresh,
  onEditTimeLog,
  onSplitRebalance,
  onAddProject
}: DaySummaryDialogProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timeLogToDelete, setTimeLogToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (timeLogId: string) => {
    setTimeLogToDelete(timeLogId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!timeLogToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', timeLogToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Time log entry deleted successfully',
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setTimeLogToDelete(null);

      // If this was the last entry, close the dialog
      if (group.projects.length === 1) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error deleting time log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time log entry',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Day Summary</DialogTitle>
          </DialogHeader>

          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span>Worker</span>
                </div>
                <p className="text-lg font-semibold">{group.worker_name}</p>
                {group.worker_trade && (
                  <Badge variant="outline" className="mt-1 bg-primary/10 text-primary">
                    {group.worker_trade}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="text-lg font-semibold">
                  {format(new Date(group.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Total Hours</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {group.total_hours.toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Cost</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${group.total_cost.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Top-level Actions */}
          <div className="flex gap-2">
            <Button onClick={onSplitRebalance} variant="outline" className="flex-1">
              <Split className="h-4 w-4 mr-2" />
              Split / Rebalance Hours
            </Button>
            <Button onClick={onAddProject} variant="outline" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Project to This Day
            </Button>
          </div>

          <Separator />

          {/* Time Log Entries */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Time Log Entries ({group.projects.length})
            </h3>

            {group.projects.map((project) => (
              <Card key={project.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Project Name */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{project.project_name}</span>
                        <Badge variant="outline" className="bg-blue-50">
                          {project.hours}h
                        </Badge>
                      </div>

                      {/* Trade & Cost Code */}
                      <div className="flex items-center gap-2">
                        {project.trade_name && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {project.trade_name}
                          </Badge>
                        )}
                        {project.cost_code && (
                          <Badge variant="outline" className="bg-amber-50">
                            {project.cost_code}
                          </Badge>
                        )}
                        {project.source_schedule_id && (
                          <Badge variant="outline" className="bg-green-50 text-xs">
                            From Schedule
                          </Badge>
                        )}
                      </div>

                      {/* Notes */}
                      {project.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Note: {project.notes}
                        </p>
                      )}

                      {/* Cost */}
                      <div className="text-sm text-muted-foreground">
                        Labor Cost: <span className="font-semibold text-foreground">${project.cost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTimeLog(project.id)}
                        title="Edit this entry"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(project.id)}
                        title="Delete this entry"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Log Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this time log entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
