import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { ScheduleRowDrawer } from './ScheduleRowDrawer';

interface SchedulerTableViewProps {
  weekStart: Date;
  weekEnd: Date;
  selectedCompany: string;
  selectedTrade: string;
  onViewDay: (date: Date, workerId: string) => void;
  onViewTimeLog: (workerId: string, date: string, projectId: string) => void;
  refreshTrigger?: number;
}

export function SchedulerTableView({ 
  weekStart, 
  weekEnd, 
  selectedCompany,
  selectedTrade,
  onViewDay,
  onViewTimeLog,
  refreshTrigger
}: SchedulerTableViewProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('status', 'Active')
        .order('project_name');
      return data || [];
    },
  });

  // Fetch workers for filter
  const { data: workers } = useQuery({
    queryKey: ['workers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch scheduled shifts with logged hours
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['scheduler-table', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), selectedCompany, selectedTrade, projectFilter, workerFilter, refreshTrigger],
    queryFn: async () => {
      let query = supabase
        .from('work_schedules')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(id, project_name, company_id),
          trades(name)
        `)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true });

      const { data: shifts } = await query;
      if (!shifts) return [];

      // Fetch corresponding time logs for these shifts
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('worker_id, date, project_id, hours_worked, payment_status')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      // Enrich shifts with logged hours data
      const enrichedShifts = shifts.map(shift => {
        const matchingLog = logs?.find(
          log => 
            log.worker_id === shift.worker_id &&
            log.date === shift.scheduled_date &&
            log.project_id === shift.project_id
        );

        const loggedHours = matchingLog?.hours_worked || 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(shift.scheduled_date);
        const isPast = scheduleDate < today;
        
        let status: 'Scheduled' | 'Partially Logged' | 'Fully Logged' | 'No Log' = 'Scheduled';
        
        if (isPast) {
          if (loggedHours === 0) {
            status = 'No Log';
          } else if (loggedHours >= shift.scheduled_hours) {
            status = 'Fully Logged';
          } else {
            status = 'Partially Logged';
          }
        }

        return {
          ...shift,
          loggedHours,
          paymentStatus: matchingLog?.payment_status || 'N/A',
          status,
        };
      });

      // Apply filters
      let filtered = enrichedShifts;

      if (selectedCompany !== 'all') {
        filtered = filtered.filter(s => s.projects?.company_id === selectedCompany);
      }

      if (selectedTrade !== 'all') {
        filtered = filtered.filter(s => s.trade_id === selectedTrade);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(s => s.project_id === projectFilter);
      }

      if (workerFilter !== 'all') {
        filtered = filtered.filter(s => s.worker_id === workerFilter);
      }

      return filtered;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fully Logged':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">Fully Logged</Badge>;
      case 'Partially Logged':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300">Partially Logged</Badge>;
      case 'No Log':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">No Log</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300">Unpaid</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
    }
  };

  // Calculate summary stats
  const totalScheduledHours = schedules?.reduce((sum, s) => sum + s.scheduled_hours, 0) || 0;
  const totalLoggedHours = schedules?.reduce((sum, s) => sum + (s.loggedHours || 0), 0) || 0;
  const uniqueWorkers = new Set(schedules?.map(s => s.worker_id)).size;
  const workersWithLogs = new Set(schedules?.filter(s => s.loggedHours > 0).map(s => s.worker_id)).size;

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Scheduled Hours</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalScheduledHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Logged Hours</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalLoggedHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Difference</p>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalLoggedHours - totalScheduledHours >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {(totalLoggedHours - totalScheduledHours).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Workers</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workersWithLogs}/{uniqueWorkers} logged</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule & Time Log Details</CardTitle>
          <div className="flex gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {schedules && schedules.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="text-right">Scheduled Hours</TableHead>
                <TableHead className="text-right">Logged Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pay Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow 
                  key={schedule.id} 
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => {
                    setSelectedScheduleId(schedule.id);
                    setSelectedWorkerId(schedule.worker_id);
                    setSelectedDate(schedule.scheduled_date);
                  }}
                >
                  <TableCell>{format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{schedule.workers?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Company</Badge>
                  </TableCell>
                  <TableCell>{schedule.projects?.project_name}</TableCell>
                  <TableCell className="text-muted-foreground">{schedule.trades?.name || schedule.workers?.trade}</TableCell>
                  <TableCell className="text-right">{schedule.scheduled_hours}h</TableCell>
                  <TableCell className="text-right">
                    {schedule.loggedHours > 0 ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTimeLog(schedule.worker_id, schedule.scheduled_date, schedule.project_id);
                        }}
                      >
                        {schedule.loggedHours}h <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">0h</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(schedule.paymentStatus)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDay(new Date(schedule.scheduled_date), schedule.worker_id);
                      }}
                    >
                      View Day
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No scheduled shifts found for this period</p>
          </div>
        )}
      </CardContent>
      </Card>

      {/* Schedule Row Drawer */}
      {selectedScheduleId && (
        <ScheduleRowDrawer
          open={!!selectedScheduleId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedScheduleId(null);
              setSelectedWorkerId('');
              setSelectedDate('');
            }
          }}
          scheduleId={selectedScheduleId}
          workerId={selectedWorkerId}
          date={selectedDate}
          onRefresh={() => {
            if (refreshTrigger !== undefined) {
              // Parent will handle refresh via refreshTrigger prop
            }
          }}
        />
      )}
    </div>
  );
}
