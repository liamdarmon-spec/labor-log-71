import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Calendar, User, Building2, Briefcase, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';

interface ScheduleRowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  workerId: string;
  date: string;
  onRefresh?: () => void;
}

export function ScheduleRowDrawer({ 
  open, 
  onOpenChange, 
  scheduleId,
  workerId,
  date,
  onRefresh 
}: ScheduleRowDrawerProps) {
  const [isConverting, setIsConverting] = useState(false);

  // Fetch schedule details
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_schedules')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(id, project_name),
          trades(name)
        `)
        .eq('id', scheduleId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Fetch related time log
  const { data: timeLog } = useQuery({
    queryKey: ['time-log', workerId, date, schedule?.project_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('worker_id', workerId)
        .eq('date', date)
        .eq('schedule_id', scheduleId)
        .maybeSingle();
      return data;
    },
    enabled: open && !!schedule,
  });

  const handleConvertToTimeLog = async () => {
    if (!schedule) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(schedule.scheduled_date);

    if (scheduleDate >= today) {
      toast.error('Cannot convert future schedules to time logs');
      return;
    }

    setIsConverting(true);
    try {
      const { error } = await supabase
        .from('work_schedules')
        .update({ converted_to_timelog: true })
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success('Schedule converted to time log');
      onRefresh?.();
    } catch (error) {
      console.error('Error converting:', error);
      toast.error('Failed to convert schedule');
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <Skeleton className="h-96" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!schedule) return null;

  const cost = timeLog ? timeLog.hours_worked * (schedule.workers?.hourly_rate || 0) : 0;
  const isPastDate = new Date(schedule.scheduled_date) < new Date();
  isPastDate && new Date().setHours(0, 0, 0, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Schedule Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{format(new Date(schedule.scheduled_date), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{schedule.workers?.name}</span>
              <Badge variant="outline">{schedule.workers?.trade}</Badge>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{schedule.projects?.project_name}</span>
            </div>
          </div>

          <Separator />

          {/* Hours & Status */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Scheduled Hours
                </div>
                <p className="text-2xl font-bold text-blue-600">{schedule.scheduled_hours}h</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Logged Hours
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {timeLog ? `${timeLog.hours_worked}h` : '0h'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {timeLog ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Logged
                </Badge>
              ) : isPastDate ? (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No Log
                </Badge>
              ) : (
                <Badge variant="outline">Scheduled</Badge>
              )}
            </div>

            {timeLog && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pay Status</span>
                  {timeLog.payment_status === 'paid' ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cost</span>
                  <span className="font-semibold">${cost.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {!timeLog && isPastDate && (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleConvertToTimeLog}
                disabled={isConverting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Convert to Time Log
              </Button>
            )}

            {timeLog && timeLog.payment_status === 'unpaid' && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      Ready for Payment
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      This time log is unpaid and ready to be included in the next payment run.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {schedule.notes && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{schedule.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
