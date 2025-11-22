import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, subWeeks } from 'date-fns';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CrewSchedulerHistoryViewProps {
  companyFilter: string;
  projectFilter: string;
}

export function CrewSchedulerHistoryView({ companyFilter, projectFilter }: CrewSchedulerHistoryViewProps) {
  const [startDate, setStartDate] = useState<Date>(subWeeks(new Date(), 2));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // Fetch time logs grouped by worker-day
  const { data: workerDays, isLoading } = useQuery({
    queryKey: [
      'crew-history-logs',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      companyFilter,
      projectFilter,
      workerFilter,
      showUnpaidOnly
    ],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers(name, trade, hourly_rate),
          projects(project_name, company_id, companies(name)),
          cost_codes(code, name),
          payments(id, paid_by, payment_date)
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      const { data } = await query;
      if (!data) return [];

      // Apply filters
      let filtered = data;

      if (companyFilter !== 'all') {
        filtered = filtered.filter(log => log.projects?.company_id === companyFilter);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(log => log.project_id === projectFilter);
      }

      if (workerFilter !== 'all') {
        filtered = filtered.filter(log => log.worker_id === workerFilter);
      }

      if (showUnpaidOnly) {
        filtered = filtered.filter(log => log.payment_status === 'unpaid');
      }

      // Group by worker + date
      const grouped = new Map<string, {
        worker: any;
        date: string;
        totalHours: number;
        projects: Array<{
          projectName: string;
          hours: number;
          costCode?: string;
          notes?: string;
          paymentStatus: string;
          payment?: any;
        }>;
        hasUnpaid: boolean;
        hasPaid: boolean;
      }>();

      filtered.forEach(log => {
        const key = `${log.worker_id}-${log.date}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            worker: log.workers,
            date: log.date,
            totalHours: 0,
            projects: [],
            hasUnpaid: false,
            hasPaid: false,
          });
        }

        const entry = grouped.get(key)!;
        entry.totalHours += log.hours_worked;
        entry.projects.push({
          projectName: log.projects?.project_name || 'Unknown',
          hours: log.hours_worked,
          costCode: log.cost_codes ? `${log.cost_codes.code} - ${log.cost_codes.name}` : undefined,
          notes: log.notes || undefined,
          paymentStatus: log.payment_status || 'unpaid',
          payment: log.payments,
        });

        if (log.payment_status === 'unpaid') entry.hasUnpaid = true;
        if (log.payment_status === 'paid') entry.hasPaid = true;
      });

      return Array.from(grouped.entries()).map(([key, value]) => ({
        key,
        ...value,
      }));
    },
  });

  // Calculate summary
  const totalHours = workerDays?.reduce((sum, wd) => sum + wd.totalHours, 0) || 0;
  const totalCost = workerDays?.reduce((sum, wd) => {
    const rate = wd.worker?.hourly_rate || 0;
    return sum + (wd.totalHours * rate);
  }, 0) || 0;
  const unpaidHours = workerDays?.filter(wd => wd.hasUnpaid)
    .reduce((sum, wd) => sum + wd.totalHours, 0) || 0;
  const unpaidCost = workerDays?.filter(wd => wd.hasUnpaid)
    .reduce((sum, wd) => {
      const rate = wd.worker?.hourly_rate || 0;
      return sum + (wd.totalHours * rate);
    }, 0) || 0;

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>From:</Label>
              <DatePickerWithPresets date={startDate} onDateChange={setStartDate} />
            </div>
            <div className="flex items-center gap-2">
              <Label>To:</Label>
              <DatePickerWithPresets date={endDate} onDateChange={setEndDate} />
            </div>

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

            <div className="flex items-center gap-2">
              <Switch
                id="unpaid-only"
                checked={showUnpaidOnly}
                onCheckedChange={setShowUnpaidOnly}
              />
              <Label htmlFor="unpaid-only">Show unpaid only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Hours</p>
            <p className="text-2xl font-bold text-red-600">{unpaidHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Cost</p>
            <p className="text-2xl font-bold text-red-600">${unpaidCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table - One row per worker-day */}
      <Card>
        <CardHeader>
          <CardTitle>Work History (Grouped by Worker-Day)</CardTitle>
        </CardHeader>
        <CardContent>
          {workerDays && workerDays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerDays.map((wd) => (
                  <>
                    <TableRow
                      key={wd.key}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => toggleRow(wd.key)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedRows.has(wd.key) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>{format(new Date(wd.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{wd.worker?.name}</TableCell>
                      <TableCell className="text-right font-semibold">{wd.totalHours}h</TableCell>
                      <TableCell>
                        {wd.hasUnpaid && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mr-2">
                            Unpaid
                          </Badge>
                        )}
                        {wd.hasPaid && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Paid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(wd.key) && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/50">
                          <div className="space-y-2 py-2">
                            {wd.projects.map((proj, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm border-l-2 border-primary pl-4">
                                <div>
                                  <div className="font-medium">{proj.projectName}</div>
                                  {proj.costCode && (
                                    <div className="text-xs text-muted-foreground">{proj.costCode}</div>
                                  )}
                                  {proj.notes && (
                                    <div className="text-xs text-muted-foreground italic">{proj.notes}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold">{proj.hours}h</span>
                                  {proj.paymentStatus === 'paid' ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                      Paid
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                      Unpaid
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No work history found for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
