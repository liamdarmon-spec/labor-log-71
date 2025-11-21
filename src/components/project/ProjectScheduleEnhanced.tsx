import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Calendar, Clock, User, CheckCircle2, RefreshCw, GitBranch, Circle, List, BarChart3 } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, startOfDay, isSameDay } from 'date-fns';

interface ScheduleEntry {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  status: string;
  notes: string | null;
  workers?: { name: string; trade: string } | null;
  trades?: { name: string } | null;
}

export const ProjectScheduleEnhanced = ({ projectId }: { projectId: string }) => {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'timeline'>('list');

  useEffect(() => {
    fetchSchedules();
  }, [projectId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_schedule_view')
        .select('*, workers(name, trade), trades(name)')
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

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return {
          label: 'Confirmed',
          color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
          icon: CheckCircle2,
        };
      case 'synced':
        return {
          label: 'Synced',
          color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
          icon: RefreshCw,
        };
      case 'converted':
        return {
          label: 'Converted',
          color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
          icon: CheckCircle2,
        };
      case 'split_modified':
        return {
          label: 'Split (Modified)',
          color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
          icon: GitBranch,
        };
      case 'split_created':
        return {
          label: 'Split Entry',
          color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
          icon: GitBranch,
        };
      case 'planned':
        return {
          label: 'Planned',
          color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
          icon: Circle,
        };
      default:
        return {
          label: status || 'Planned',
          color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
          icon: Circle,
        };
    }
  };

  // Group schedules by worker for timeline view
  const workerSchedules = schedules.reduce((acc, schedule) => {
    const workerName = schedule.workers?.name || 'Unknown Worker';
    if (!acc[workerName]) {
      acc[workerName] = [];
    }
    acc[workerName].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  // Generate date range for timeline (next 30 days)
  const today = new Date();
  const timelineDates = Array.from({ length: 30 }, (_, i) => addDays(today, i));

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
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'timeline')}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scheduled Shifts (This Month)</h3>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-3 mt-4">
          {schedules.length === 0 ? (
            <Card className="p-8">
              <p className="text-center text-muted-foreground">
                No scheduled shifts for this project this month
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const statusConfig = getStatusConfig(schedule.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={schedule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-sm font-medium">
                            <User className="w-4 h-4" />
                            {schedule.workers?.name || 'Unknown Worker'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {schedule.workers?.trade || schedule.trades?.name || 'No Trade'}
                          </Badge>
                          <Badge className={`${statusConfig.color} gap-1.5`} variant="outline">
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
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
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          {schedules.length === 0 ? (
            <Card className="p-8">
              <p className="text-center text-muted-foreground">
                No scheduled shifts for this project this month
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px] space-y-4">
                {/* Date headers */}
                <div className="flex gap-1 pl-40">
                  {timelineDates.slice(0, 14).map((date) => (
                    <div key={date.toISOString()} className="flex-1 min-w-[50px] text-center">
                      <div className="text-xs font-medium">{format(date, 'EEE')}</div>
                      <div className="text-xs text-muted-foreground">{format(date, 'd')}</div>
                    </div>
                  ))}
                </div>

                {/* Worker rows */}
                {Object.entries(workerSchedules).map(([workerName, shifts]) => (
                  <div key={workerName} className="flex gap-1 items-center">
                    <div className="w-40 pr-4 text-sm font-medium truncate">{workerName}</div>
                    <div className="flex-1 flex gap-1">
                      {timelineDates.slice(0, 14).map((date) => {
                        const shift = shifts.find(s => 
                          isSameDay(new Date(s.scheduled_date), date)
                        );

                        return (
                          <div key={date.toISOString()} className="flex-1 min-w-[50px] h-12 relative">
                            {shift ? (
                              <div 
                                className="absolute inset-0 rounded bg-primary/20 border border-primary/40 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors"
                                title={`${shift.scheduled_hours}h - ${shift.status}`}
                              >
                                <span className="text-xs font-semibold">{shift.scheduled_hours}h</span>
                              </div>
                            ) : (
                              <div className="absolute inset-0 rounded bg-muted/30"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};