import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function WorkforcePayCenterTab() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('7');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'worker' | 'project'>('worker');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any>(null);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch unpaid time logs
  const { data: unpaidLogs, isLoading } = useQuery({
    queryKey: ['workforce-unpaid-logs', dateRange, selectedCompany],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(id, project_name, company_id, companies(name)),
          trades(name)
        `)
        .eq('payment_status', 'unpaid')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (selectedCompany !== 'all') {
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

  // Group data by worker or project
  const groupedData = unpaidLogs?.reduce((acc: any, log: any) => {
    const key = groupBy === 'worker' ? log.worker_id : log.project_id;
    const name = groupBy === 'worker' ? log.workers?.name : log.projects?.project_name;
    const company = log.projects?.companies?.name;
    
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name,
        company,
        totalHours: 0,
        totalAmount: 0,
        logs: [],
        projectCount: groupBy === 'worker' ? new Set() : undefined,
      };
    }

    const amount = log.hours_worked * (log.workers?.hourly_rate || 0);
    acc[key].totalHours += log.hours_worked;
    acc[key].totalAmount += amount;
    acc[key].logs.push(log);
    
    if (groupBy === 'worker') {
      acc[key].projectCount.add(log.project_id);
    }

    return acc;
  }, {});

  const groupedArray = groupedData ? Object.values(groupedData).map((group: any) => ({
    ...group,
    projectCount: group.projectCount ? group.projectCount.size : group.logs.length,
  })) : [];

  // Calculate totals
  const totalUnpaidHours = unpaidLogs?.reduce((sum, log) => sum + log.hours_worked, 0) || 0;
  const totalUnpaidAmount = unpaidLogs?.reduce((sum, log) => {
    const rate = log.workers?.hourly_rate || 0;
    return sum + (log.hours_worked * rate);
  }, 0) || 0;

  const handleViewDetails = (group: any) => {
    setSelectedGroupDetails(group);
    setDrawerOpen(true);
  };

  const handleOpenPaymentDialog = () => {
    const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const params = new URLSearchParams();
    
    if (selectedCompany !== 'all') {
      params.set('company', selectedCompany);
    }
    params.set('start', startDate);
    params.set('end', endDate);
    
    navigate(`/financials/payments?${params.toString()}`);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Pay Center</h3>
        <p className="text-sm text-muted-foreground">
          Track unpaid labor and manage payments
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <TabsList>
                <TabsTrigger value="worker">By Worker</TabsTrigger>
                <TabsTrigger value="project">By Project</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Unpaid Logs</span>
            </div>
            <p className="text-2xl font-bold">{unpaidLogs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalUnpaidHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Unpaid</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${totalUnpaidAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{groupBy === 'worker' ? 'Workers' : 'Projects'}</span>
            </div>
            <p className="text-2xl font-bold">{groupedArray.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unpaid Labor Summary</CardTitle>
            {unpaidLogs && unpaidLogs.length > 0 && (
              <Button onClick={handleOpenPaymentDialog}>
                Create Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {groupedArray.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === 'worker' ? 'Worker' : 'Project'}</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">
                    {groupBy === 'worker' ? 'Projects' : 'Logs'}
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedArray.map((group: any) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{group.company}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{group.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${group.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{group.projectCount}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(group)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">All caught up!</p>
              <p className="text-sm">No unpaid labor for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Unpaid Logs - {selectedGroupDetails?.name}</SheetTitle>
          </SheetHeader>
          
          {selectedGroupDetails && (
            <div className="mt-6 space-y-6">
              {/* Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-xl font-bold text-blue-600">
                        {selectedGroupDetails.totalHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold text-orange-600">
                        ${selectedGroupDetails.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Logs */}
              <div className="space-y-3">
                <h4 className="font-semibold">Individual Logs</h4>
                {selectedGroupDetails.logs.map((log: any) => {
                  const amount = log.hours_worked * (log.workers?.hourly_rate || 0);
                  return (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">
                              {format(new Date(log.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {groupBy === 'worker' 
                                ? log.projects?.project_name 
                                : log.workers?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.hours_worked}h
                            </p>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{log.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Action Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => {
                  setDrawerOpen(false);
                  handleOpenPaymentDialog();
                }}
              >
                Open Payment Dialog
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
