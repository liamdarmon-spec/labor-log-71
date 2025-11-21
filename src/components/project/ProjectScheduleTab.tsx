import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Clock, User, AlertCircle, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DayDetailDialog } from '@/components/scheduling/DayDetailDialog';
import { useScheduleConflicts } from '@/hooks/useScheduleConflicts';
import { ProjectScheduleCalendar } from './ProjectScheduleCalendar';

interface ScheduleEntry {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  status: string;
  notes: string | null;
  workers?: { name: string; trade: string } | null;
}

interface WorkerConflicts {
  [workerId: string]: {
    date: string;
    hasConflicts: boolean;
    scheduleCount: number;
    projectNames: string[];
  };
}

export const ProjectScheduleTab = ({ projectId }: { projectId: string }) => {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null);
  const [highlightWorkerId, setHighlightWorkerId] = useState<string | null>(null);
  const [workerConflicts, setWorkerConflicts] = useState<WorkerConflicts>({});
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    fetchSchedules();
  }, [projectId]);

  useEffect(() => {
    if (schedules.length > 0) {
      checkAllConflicts();
    }
  }, [schedules]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('scheduled_shifts')
        .select('*, workers(name, trade)')
        .eq('project_id', projectId)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const checkAllConflicts = async () => {
    const conflicts: WorkerConflicts = {};

    for (const schedule of schedules) {
      const key = schedule.worker_id;
      if (conflicts[key]) continue;

      const { data } = await supabase
        .from("scheduled_shifts")
        .select("id, project:projects(project_name)")
        .eq("worker_id", schedule.worker_id)
        .eq("scheduled_date", schedule.scheduled_date);

      if (data && data.length > 1) {
        const projectNames = data
          .map(s => s.project?.project_name)
          .filter((name): name is string => !!name);

        conflicts[key] = {
          date: schedule.scheduled_date,
          hasConflicts: true,
          scheduleCount: data.length,
          projectNames
        };
      }
    }

    setWorkerConflicts(conflicts);
  };

  const openDayDialog = (date: string, workerId?: string) => {
    // Parse date in local timezone to avoid timezone shift issues
    const [year, month, day] = date.split('-').map(Number);
    setDayDialogDate(new Date(year, month - 1, day));
    setHighlightWorkerId(workerId || null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Labor Schedule</h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
        {viewMode === 'calendar' ? (
          <ProjectScheduleCalendar projectId={projectId} />
        ) : schedules.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground space-y-2">
              <Calendar className="w-12 h-12 mx-auto opacity-50 mb-4" />
              <p>No labor scheduled this month.</p>
              <p className="text-sm">Click a day in the calendar to add worker shifts, subs, or meetings.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const conflict = workerConflicts[schedule.worker_id];
              const hasConflict = conflict && conflict.date === schedule.scheduled_date;

              return (
                <Card key={schedule.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-sm font-medium">
                            <User className="w-4 h-4" />
                            {schedule.workers?.name || 'Unknown Worker'}
                          </span>
                          {schedule.workers?.trade && (
                            <Badge variant="outline" className="text-xs">
                              {schedule.workers.trade}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{schedule.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {schedule.scheduled_hours}h
                          </span>
                        </div>
                        {schedule.notes && (
                          <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                        )}
                      </div>
                    </div>

                    {hasConflict && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">
                            This worker has {conflict.scheduleCount} shifts on this date across: {conflict.projectNames.join(', ')}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDayDialog(schedule.scheduled_date, schedule.worker_id)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Full Day
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DayDetailDialog
        open={!!dayDialogDate}
        onOpenChange={(open) => {
          if (!open) {
            setDayDialogDate(null);
            setHighlightWorkerId(null);
          }
        }}
        date={dayDialogDate}
        onRefresh={fetchSchedules}
        onAddSchedule={() => {}}
        highlightWorkerId={highlightWorkerId}
        projectContext={projectId}
      />
    </>
  );
};