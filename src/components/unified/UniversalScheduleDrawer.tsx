import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EditScheduleDialog } from '@/components/scheduling/EditScheduleDialog';
import { SplitScheduleDialog } from '@/components/dashboard/SplitScheduleDialog';
import { ScheduleEditButton } from '@/components/scheduling/ScheduleEditButton';
import { ScheduleDeleteButton } from '@/components/scheduling/ScheduleDeleteButton';
import { Calendar, Clock, Briefcase, User, Split, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  cost_code_id: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  status?: string | null;
  converted_to_timelog?: boolean;
  worker: { name: string; trade: string } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
}

interface UniversalScheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduledShift | null;
  onRefresh: () => void;
  hasConflicts?: boolean;
  conflictDetails?: {
    scheduleCount: number;
    projectNames: string[];
  };
}

export function UniversalScheduleDrawer({
  open,
  onOpenChange,
  schedule,
  onRefresh,
  hasConflicts,
  conflictDetails
}: UniversalScheduleDrawerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  if (!schedule) return null;

  const isPast = new Date(schedule.scheduled_date) < new Date();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Details
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Worker Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-lg">{schedule.worker?.name || 'Unknown'}</span>
                    </div>
                    {schedule.worker?.trade && (
                      <p className="text-sm text-muted-foreground ml-6">{schedule.worker.trade}</p>
                    )}
                  </div>
                  <Badge variant={schedule.status === 'synced' ? 'default' : 'secondary'}>
                    {schedule.status || 'planned'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Conflict Warning */}
            {hasConflicts && conflictDetails && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Worker has {conflictDetails.scheduleCount} schedules for this day across: {conflictDetails.projectNames.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Project & Time Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{schedule.project?.project_name || 'Unknown Project'}</span>
                </div>
                {schedule.project?.client_name && (
                  <p className="text-sm text-muted-foreground ml-6">Client: {schedule.project.client_name}</p>
                )}
                <div className="flex items-center gap-4 ml-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">{schedule.scheduled_hours}h</span>
                  </div>
                </div>
                {schedule.trade && (
                  <div className="ml-6">
                    <Badge variant="outline">{schedule.trade.name}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {schedule.notes && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Notes:</p>
                  <p className="text-sm mt-1">{schedule.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setEditDialogOpen(true)}
                disabled={isPast && schedule.converted_to_timelog}
              >
                Edit Schedule
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSplitDialogOpen(true)}
              >
                <Split className="h-4 w-4 mr-2" />
                Split to Multiple Projects
              </Button>
              <ScheduleDeleteButton
                scheduleId={schedule.id}
                scheduleDate={schedule.scheduled_date}
                onSuccess={() => {
                  onRefresh();
                  onOpenChange(false);
                }}
              />
            </div>

            {isPast && !schedule.converted_to_timelog && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This schedule is in the past but hasn't been converted to a time log yet.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EditScheduleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        schedule={schedule}
        onSuccess={() => {
          onRefresh();
          setEditDialogOpen(false);
        }}
      />

      {schedule && (
        <SplitScheduleDialog
          isOpen={splitDialogOpen}
          onClose={() => setSplitDialogOpen(false)}
          scheduleId={schedule.id}
          workerName={schedule.worker?.name || 'Unknown'}
          originalDate={schedule.scheduled_date}
          originalHours={schedule.scheduled_hours}
          originalProjectId={schedule.project_id}
          onSuccess={() => {
            onRefresh();
            setSplitDialogOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
