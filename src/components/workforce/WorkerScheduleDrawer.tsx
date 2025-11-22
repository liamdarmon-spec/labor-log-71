import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, DollarSign, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Worker {
  id: string;
  name: string;
  trade: string;
  hourly_rate: number;
}

interface WorkerScheduleDrawerProps {
  worker: Worker;
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkerScheduleDrawer({ worker, date, open, onOpenChange }: WorkerScheduleDrawerProps) {
  const navigate = useNavigate();
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['worker-day-detail', worker.id, dateStr],
    queryFn: async () => {
      // Fetch schedules for this date
      const { data: schedules } = await supabase
        .from('scheduled_shifts')
        .select('*, projects(id, project_name), trades(name)')
        .eq('worker_id', worker.id)
        .eq('scheduled_date', dateStr);

      // Fetch time logs for this date
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*, projects(id, project_name), payments(payment_date, paid_by, amount)')
        .eq('worker_id', worker.id)
        .eq('date', dateStr);

      const totalScheduled = schedules?.reduce((sum, s) => sum + s.scheduled_hours, 0) || 0;
      const totalLogged = logs?.reduce((sum, l) => sum + l.hours_worked, 0) || 0;
      const totalUnpaid = logs
        ?.filter(l => l.payment_status === 'unpaid')
        .reduce((sum, l) => sum + (l.hours_worked * worker.hourly_rate), 0) || 0;

      return {
        schedules: schedules || [],
        logs: logs || [],
        totalScheduled,
        totalLogged,
        totalUnpaid,
      };
    },
    enabled: open,
  });

  const handleOpenProjectSchedule = (projectId: string) => {
    navigate(`/projects/${projectId}?tab=schedule&date=${dateStr}`);
    onOpenChange(false);
  };

  const handleOpenTimeLogs = () => {
    navigate(`/view-logs?worker_id=${worker.id}&date=${dateStr}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {worker.name} – {format(date, 'EEEE, MMM d, yyyy')}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Quick Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scheduled vs Logged</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-600">
                        {data?.totalScheduled.toFixed(1)}h
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-2xl font-bold text-green-600">
                        {data?.totalLogged.toFixed(1)}h
                      </span>
                    </div>
                    {data && data.totalScheduled !== data.totalLogged && (
                      <div className="flex items-center gap-1 mt-1">
                        {data.totalLogged > data.totalScheduled ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-orange-600" />
                            <span className="text-xs text-orange-600">
                              +{(data.totalLogged - data.totalScheduled).toFixed(1)}h over
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {(data.totalScheduled - data.totalLogged).toFixed(1)}h under
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {data && data.totalUnpaid > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Unpaid</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                          Unpaid
                        </Badge>
                        <span className="text-xl font-bold text-orange-600">
                          ${data.totalUnpaid.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Section */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                Schedule ({data?.schedules.length || 0})
              </h3>
              {data?.schedules && data.schedules.length > 0 ? (
                <div className="space-y-2">
                  {data.schedules.map(schedule => (
                    <Card key={schedule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{schedule.projects?.project_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {schedule.trades?.name || worker.trade}
                            </p>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              <span className="font-semibold">{schedule.scheduled_hours}h scheduled</span>
                            </div>
                            {schedule.notes && (
                              <p className="text-xs text-muted-foreground mt-2">{schedule.notes}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenProjectSchedule(schedule.projects?.id)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No schedules for this date</p>
              )}
            </div>

            {/* Time Logs Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Logs ({data?.logs.length || 0})
                </h3>
                {data?.logs && data.logs.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleOpenTimeLogs}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in Time Logs
                  </Button>
                )}
              </div>
              {data?.logs && data.logs.length > 0 ? (
                <div className="space-y-2">
                  {data.logs.map(log => {
                    const cost = log.hours_worked * worker.hourly_rate;
                    return (
                      <Card key={log.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{log.projects?.project_name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1 text-sm">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-semibold">{log.hours_worked}h logged</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-semibold">${cost.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge variant={log.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {log.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </div>
                            {log.payment_status === 'paid' && log.payments && (
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                Paid by {log.payments.paid_by} on {format(new Date(log.payments.payment_date), 'MMM d, yyyy')}
                              </div>
                            )}
                            {log.notes && (
                              <p className="text-xs text-muted-foreground">{log.notes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No time logs for this date</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
