import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';
import { UniversalTimeLogDrawer } from '@/components/unified/UniversalTimeLogDrawer';

export function WorkforceTimeLogsTab() {
  const [dateRange, setDateRange] = useState('7'); // days
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch workers
  const { data: workers } = useQuery({
    queryKey: ['workers-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workers')
        .select('id, name, trade')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      return data || [];
    },
  });

  // Fetch time logs
  const { data: timeLogs, isLoading, refetch } = useQuery({
    queryKey: ['workforce-time-logs', dateRange, selectedCompany, selectedWorker, selectedProject, paymentFilter],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          workers(name, trade, hourly_rate),
          projects(project_name, company_id, companies(name)),
          trades(name),
          cost_codes(code, name)
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      // Apply filters
      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter);
      }

      if (selectedCompany !== 'all') {
        // Filter by company through projects
        const { data: projectIds } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', selectedCompany);
        
        if (projectIds && projectIds.length > 0) {
          query = query.in('project_id', projectIds.map(p => p.id));
        }
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Calculate totals
  const totalHours = timeLogs?.reduce((sum, log) => sum + log.hours_worked, 0) || 0;
  const totalAmount = timeLogs?.reduce((sum, log) => {
    const rate = log.workers?.hourly_rate || 0;
    return sum + (log.hours_worked * rate);
  }, 0) || 0;

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Time Logs</h3>
        <p className="text-sm text-muted-foreground">
          View and manage actual hours worked
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Logs</p>
            <p className="text-2xl font-bold">{timeLogs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {timeLogs && timeLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeLogs.map((log: any) => {
                    const rate = log.workers?.hourly_rate || 0;
                    const amount = log.hours_worked * rate;
                    
                    return (
                      <TableRow 
                        key={log.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => setSelectedLogId(log.id)}
                      >
                        <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{log.workers?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.projects?.companies?.name || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.projects?.project_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.trades?.name || log.workers?.trade}
                        </TableCell>
                        <TableCell className="text-right">{log.hours_worked}h</TableCell>
                        <TableCell className="text-right">${rate.toFixed(2)}/hr</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(log.payment_status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLogId(log.id);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No time logs found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Log Drawer */}
      {selectedLogId && timeLogs && (
        <UniversalTimeLogDrawer
          open={!!selectedLogId}
          onOpenChange={(open) => {
            if (!open) setSelectedLogId(null);
          }}
          timeLog={timeLogs?.find(log => log.id === selectedLogId) ? {
            id: timeLogs.find(log => log.id === selectedLogId)!.id,
            worker_id: timeLogs.find(log => log.id === selectedLogId)!.worker_id,
            project_id: timeLogs.find(log => log.id === selectedLogId)!.project_id,
            trade_id: timeLogs.find(log => log.id === selectedLogId)!.trade_id,
            cost_code_id: timeLogs.find(log => log.id === selectedLogId)!.cost_code_id,
            date: timeLogs.find(log => log.id === selectedLogId)!.date,
            hours_worked: timeLogs.find(log => log.id === selectedLogId)!.hours_worked,
            notes: timeLogs.find(log => log.id === selectedLogId)!.notes,
            payment_status: timeLogs.find(log => log.id === selectedLogId)!.payment_status,
            paid_amount: timeLogs.find(log => log.id === selectedLogId)!.paid_amount,
            schedule_id: timeLogs.find(log => log.id === selectedLogId)!.source_schedule_id,
            worker: timeLogs.find(log => log.id === selectedLogId)!.workers ? {
              name: timeLogs.find(log => log.id === selectedLogId)!.workers!.name,
              trade: timeLogs.find(log => log.id === selectedLogId)!.workers!.trade,
              hourly_rate: timeLogs.find(log => log.id === selectedLogId)!.workers!.hourly_rate
            } : null,
            project: timeLogs.find(log => log.id === selectedLogId)!.projects ? {
              project_name: timeLogs.find(log => log.id === selectedLogId)!.projects!.project_name,
              client_name: ''
            } : null,
            trade: timeLogs.find(log => log.id === selectedLogId)!.trades ? {
              name: timeLogs.find(log => log.id === selectedLogId)!.trades!.name
            } : null,
            cost_code: timeLogs.find(log => log.id === selectedLogId)!.cost_codes ? {
              code: timeLogs.find(log => log.id === selectedLogId)!.cost_codes!.code,
              name: timeLogs.find(log => log.id === selectedLogId)!.cost_codes!.name
            } : null,
            payment: null
          } : null}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
