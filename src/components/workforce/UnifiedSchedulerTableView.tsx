import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Users, Building2 } from 'lucide-react';
import { ScheduleRowDrawer } from './ScheduleRowDrawer';

interface UnifiedSchedulerTableViewProps {
  weekStart: Date;
  weekEnd: Date;
  selectedCompany: string;
  selectedTrade: string;
  onViewDay: (date: Date, workerId?: string) => void;
  onViewTimeLog: (workerId: string, date: string, projectId: string) => void;
  refreshTrigger?: number;
}

export function UnifiedSchedulerTableView({
  weekStart,
  weekEnd,
  selectedCompany,
  selectedTrade,
  onViewDay,
  onViewTimeLog,
  refreshTrigger
}: UnifiedSchedulerTableViewProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showType, setShowType] = useState<'workers' | 'subs' | 'both'>('workers');
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

  // Fetch worker schedules
  const { data: workerSchedules, isLoading: workersLoading } = useQuery({
    queryKey: ['scheduler-workers', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), selectedCompany, selectedTrade, projectFilter, refreshTrigger],
    queryFn: async () => {
      if (showType === 'subs') return [];

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

      // Fetch corresponding time logs
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('worker_id, date, project_id, hours_worked, payment_status')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      // Enrich shifts with logged hours
      const enriched = shifts.map(shift => {
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
          type: 'worker' as const,
          loggedHours,
          paymentStatus: matchingLog?.payment_status || 'N/A',
          status,
        };
      });

      // Apply filters
      let filtered = enriched;

      if (selectedCompany !== 'all') {
        filtered = filtered.filter(s => s.projects?.company_id === selectedCompany);
      }

      if (selectedTrade !== 'all') {
        filtered = filtered.filter(s => s.trade_id === selectedTrade);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(s => s.project_id === projectFilter);
      }

      return filtered;
    },
    enabled: showType !== 'subs',
  });

  // Fetch sub schedules
  const { data: subSchedules, isLoading: subsLoading } = useQuery({
    queryKey: ['scheduler-subs', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), selectedCompany, projectFilter, refreshTrigger],
    queryFn: async () => {
      if (showType === 'workers') return [];

      let query = supabase
        .from('sub_scheduled_shifts')
        .select(`
          *,
          subs(id, name, company_name, trade_id, trades(name)),
          projects(id, project_name, company_id, companies(name))
        `)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true });

      const { data: shifts } = await query;
      if (!shifts) return [];

      // Enrich with status
      const enriched = shifts.map(shift => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(shift.scheduled_date);
        const isPast = scheduleDate < today;

        return {
          ...shift,
          type: 'sub' as const,
          loggedHours: 0,
          paymentStatus: 'N/A',
          status: isPast ? 'Completed' : 'Scheduled',
        };
      });

      // Apply filters
      let filtered = enriched;

      if (selectedCompany !== 'all') {
        filtered = filtered.filter(s => s.projects?.company_id === selectedCompany);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(s => s.project_id === projectFilter);
      }

      return filtered;
    },
    enabled: showType !== 'workers',
  });

  // Combine datasets
  const allSchedules = [
    ...(workerSchedules || []),
    ...(subSchedules || [])
  ].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const isLoading = workersLoading || subsLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fully Logged':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Fully Logged</Badge>;
      case 'Partially Logged':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Partially Logged</Badge>;
      case 'No Log':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">No Log</Badge>;
      case 'Completed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Completed</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
    }
  };

  // Calculate summary
  const totalScheduledHours = allSchedules.reduce((sum, s) => {
    return sum + (s.type === 'worker' ? s.scheduled_hours : s.scheduled_hours || 8);
  }, 0);
  const totalLoggedHours = workerSchedules?.reduce((sum, s) => sum + (s.loggedHours || 0), 0) || 0;

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Type Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Tabs value={showType} onValueChange={(v) => setShowType(v as any)}>
                <TabsList>
                  <TabsTrigger value="workers">
                    <Users className="h-4 w-4 mr-2" />
                    Workers
                  </TabsTrigger>
                  <TabsTrigger value="subs">
                    <Building2 className="h-4 w-4 mr-2" />
                    Subs
                  </TabsTrigger>
                  <TabsTrigger value="both">Both</TabsTrigger>
                </TabsList>
              </Tabs>

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
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Scheduled Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalScheduledHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Logged Hours</p>
              <p className="text-2xl font-bold text-green-600">{totalLoggedHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Difference</p>
              <p className={`text-2xl font-bold ${totalLoggedHours - totalScheduledHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(totalLoggedHours - totalScheduledHours).toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Entries</p>
              <p className="text-2xl font-bold">{allSchedules.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Table */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule & Time Log Details</CardTitle>
          </CardHeader>
          <CardContent>
            {allSchedules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead className="text-right">Scheduled</TableHead>
                    <TableHead className="text-right">Logged</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSchedules.map((schedule: any) => (
                    <TableRow
                      key={`${schedule.type}-${schedule.id}`}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => {
                        if (schedule.type === 'worker') {
                          setSelectedScheduleId(schedule.id);
                          setSelectedWorkerId(schedule.worker_id);
                          setSelectedDate(schedule.scheduled_date);
                        }
                      }}
                    >
                      <TableCell>{format(new Date(schedule.scheduled_date), 'MMM d')}</TableCell>
                      <TableCell>
                        {schedule.type === 'worker' ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <Users className="h-3 w-3 mr-1" />
                            Worker
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                            <Building2 className="h-3 w-3 mr-1" />
                            Sub
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {schedule.type === 'worker' ? schedule.workers?.name : schedule.subs?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Company
                        </Badge>
                      </TableCell>
                      <TableCell>{schedule.projects?.project_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.type === 'worker' 
                          ? (schedule.trades?.name || schedule.workers?.trade)
                          : schedule.subs?.trades?.name
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {schedule.type === 'worker' ? schedule.scheduled_hours : (schedule.scheduled_hours || 8)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {schedule.type === 'worker' && schedule.loggedHours > 0 ? (
                          <span className="font-semibold text-green-600">{schedule.loggedHours}h</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        {schedule.type === 'worker' && getPaymentStatusBadge(schedule.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDay(
                              new Date(schedule.scheduled_date),
                              schedule.type === 'worker' ? schedule.worker_id : undefined
                            );
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
                <p>No scheduled entries for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Row Drawer (Workers only) */}
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
        />
      )}
    </>
  );
}
