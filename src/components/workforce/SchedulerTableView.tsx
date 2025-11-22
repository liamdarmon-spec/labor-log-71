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

interface SchedulerTableViewProps {
  weekStart: Date;
  weekEnd: Date;
  selectedCompany: string;
  selectedTrade: string;
  onViewTimeLog: (workerId: string, date: string, projectId: string) => void;
}

export function SchedulerTableView({ 
  weekStart, 
  weekEnd, 
  selectedCompany,
  selectedTrade,
  onViewTimeLog
}: SchedulerTableViewProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');

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
    queryKey: ['scheduler-table', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), selectedCompany, selectedTrade, projectFilter, workerFilter],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_shifts')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(id, project_name, company_id, companies(name)),
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
        let status: 'Scheduled' | 'Partially Logged' | 'Fully Logged' = 'Scheduled';
        
        if (loggedHours > 0) {
          status = loggedHours >= shift.scheduled_hours ? 'Fully Logged' : 'Partially Logged';
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
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Fully Logged</Badge>;
      case 'Partially Logged':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Partially Logged</Badge>;
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
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scheduled Shifts</CardTitle>
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
                <TableRow key={schedule.id} className="cursor-pointer hover:bg-accent">
                  <TableCell>{format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{schedule.workers?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{schedule.projects?.companies?.name}</Badge>
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
                    <Button variant="ghost" size="sm">View</Button>
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
  );
}
