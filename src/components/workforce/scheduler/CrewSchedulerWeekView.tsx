import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, Edit2 } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay, isPast } from 'date-fns';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';
import { cn } from '@/lib/utils';

interface CrewSchedulerWeekViewProps {
  companyFilter: string;
  tradeFilter: string;
  projectFilter: string;
}

export function CrewSchedulerWeekView({ companyFilter, tradeFilter, projectFilter }: CrewSchedulerWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>(undefined);
  const [addDialogWorker, setAddDialogWorker] = useState<string | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch all active workers
  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['crew-scheduler-workers', tradeFilter],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('id, name, trade, trade_id, hourly_rate')
        .eq('active', true);

      if (tradeFilter !== 'all') {
        query = query.eq('trade_id', tradeFilter);
      }

      const { data } = await query.order('name');
      return data || [];
    },
  });

  // Fetch all schedules for the week
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['crew-scheduler-schedules', format(weekStart, 'yyyy-MM-dd'), companyFilter, projectFilter, refreshTrigger],
    queryFn: async () => {
      let query = supabase
        .from('work_schedules')
        .select(`
          *,
          worker_id,
          projects(id, project_name, company_id, companies(name))
        `)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      const { data: shifts } = await query;
      if (!shifts) return [];

      // Apply filters
      let filtered = shifts;

      if (companyFilter !== 'all') {
        filtered = filtered.filter(s => s.projects?.company_id === companyFilter);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(s => s.project_id === projectFilter);
      }

      return filtered;
    },
  });

  // Fetch time logs for past days (to show paid/unpaid status)
  const { data: logs } = useQuery({
    queryKey: ['crew-scheduler-logs', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('time_logs')
        .select('worker_id, date, project_id, hours_worked, payment_status')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  // Group schedules by worker and date
  const schedulesByWorkerDate = new Map<string, Map<string, any[]>>();
  schedules?.forEach(schedule => {
    const dateKey = schedule.scheduled_date;
    if (!schedulesByWorkerDate.has(schedule.worker_id)) {
      schedulesByWorkerDate.set(schedule.worker_id, new Map());
    }
    const workerSchedules = schedulesByWorkerDate.get(schedule.worker_id)!;
    if (!workerSchedules.has(dateKey)) {
      workerSchedules.set(dateKey, []);
    }
    workerSchedules.get(dateKey)!.push(schedule);
  });

  // Group logs by worker and date
  const logsByWorkerDate = new Map<string, Map<string, any[]>>();
  logs?.forEach(log => {
    const dateKey = log.date;
    if (!logsByWorkerDate.has(log.worker_id)) {
      logsByWorkerDate.set(log.worker_id, new Map());
    }
    const workerLogs = logsByWorkerDate.get(log.worker_id)!;
    if (!workerLogs.has(dateKey)) {
      workerLogs.set(dateKey, []);
    }
    workerLogs.get(dateKey)!.push(log);
  });

  const goToThisWeek = () => setCurrentWeek(new Date());

  const handleCellClick = (workerId: string, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const daySchedules = schedulesByWorkerDate.get(workerId)?.get(dateKey) || [];

    if (daySchedules.length > 0) {
      // Open day detail modal
      setSelectedWorker(workerId);
      setSelectedDate(date);
    } else {
      // Open add dialog with pre-filled worker
      setAddDialogDate(date);
      setAddDialogWorker(workerId);
      setIsAddDialogOpen(true);
    }
  };

  if (workersLoading || schedulesLoading) {
    return <Skeleton className="h-[600px]" />;
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold min-w-[240px] text-center">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToThisWeek}>
                This Week
              </Button>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Worker
                  </th>
                  {weekDays.map(day => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "p-3 text-center font-semibold min-w-[140px]",
                        isSameDay(day, new Date()) && "bg-primary/10"
                      )}
                    >
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-lg">{format(day, 'd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers?.map(worker => {
                  const workerSchedules = schedulesByWorkerDate.get(worker.id);
                  const workerLogs = logsByWorkerDate.get(worker.id);

                  return (
                    <tr key={worker.id} className="border-b hover:bg-accent/50">
                      <td className="p-3 sticky left-0 bg-background z-10">
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-muted-foreground">{worker.trade}</div>
                        </div>
                      </td>
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const daySchedules = workerSchedules?.get(dateKey) || [];
                        const dayLogs = workerLogs?.get(dateKey) || [];
                        const totalHours = daySchedules.reduce((sum, s) => sum + s.scheduled_hours, 0);
                        const projects = [...new Set(daySchedules.map(s => s.projects?.project_name))];
                        const companies = [...new Set(daySchedules.map(s => s.projects?.companies?.name))];
                        
                        const dayIsPast = isPast(day) && !isSameDay(day, new Date());
                        const hasUnpaidLogs = dayLogs.some(l => l.payment_status === 'unpaid');
                        const hasPaidLogs = dayLogs.some(l => l.payment_status === 'paid');

                        return (
                          <td
                            key={dateKey}
                            className={cn(
                              "p-2 text-center cursor-pointer hover:bg-accent transition-colors relative group",
                              isSameDay(day, new Date()) && "bg-primary/5"
                            )}
                            onClick={() => handleCellClick(worker.id, day)}
                          >
                            {daySchedules.length > 0 ? (
                              <div className="space-y-1 relative">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorker(worker.id);
                                    setSelectedDate(day);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <div className="font-semibold text-sm text-primary">
                                  {totalHours}h
                                </div>
                                {projects.slice(0, 2).map((project, i) => (
                                  <div key={i} className="text-xs truncate text-muted-foreground">
                                    {project}
                                  </div>
                                ))}
                                {projects.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{projects.length - 2}
                                  </div>
                                )}
                                {companies[0] && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {companies[0]}
                                  </Badge>
                                )}
                                {dayIsPast && (
                                  <div className="mt-1">
                                    {hasPaidLogs && (
                                      <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                                        Paid
                                      </Badge>
                                    )}
                                    {hasUnpaidLogs && (
                                      <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
                                        Unpaid
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center h-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Schedule Dialog */}
      <AddToScheduleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onScheduleCreated={() => setRefreshTrigger(prev => prev + 1)}
        defaultDate={addDialogDate}
      />

      {/* Day Detail Dialog */}
      {selectedWorker && selectedDate && (
        <UniversalDayDetailDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedWorker(null);
              setSelectedDate(null);
            }
          }}
          date={selectedDate}
          highlightWorkerId={selectedWorker}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
