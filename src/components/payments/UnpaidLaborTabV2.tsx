import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UnpaidLaborTabV2() {
  const navigate = useNavigate();
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  const { data: unpaidLogs, isLoading } = useQuery({
    queryKey: ['unpaid-labor-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          workers(name, hourly_rate, trade),
          projects(project_name, company_id, companies(name)),
          trades(name)
        `)
        .eq('payment_status', 'unpaid')
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((log: any) => ({
        id: log.id,
        date: log.date,
        workerName: log.workers?.name || 'Unknown',
        companyName: log.projects?.companies?.name || 'N/A',
        projectName: log.projects?.project_name || 'Unknown',
        trade: log.trades?.name || log.workers?.trade || 'N/A',
        hours: log.hours_worked,
        rate: log.workers?.hourly_rate || 0,
        cost: (log.hours_worked || 0) * (log.workers?.hourly_rate || 0),
      }));
    },
  });

  const handleToggleLog = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedLogs.size === unpaidLogs?.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(unpaidLogs?.map(log => log.id) || []));
    }
  };

  const totalSelected = unpaidLogs
    ?.filter(log => selectedLogs.has(log.id))
    .reduce((sum, log) => sum + log.cost, 0) || 0;

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!unpaidLogs || unpaidLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Unpaid Labor</h3>
          <p className="text-muted-foreground">All time logs have been paid.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Unpaid Labor</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {unpaidLogs.length} unpaid time logs
            </p>
          </div>
          {selectedLogs.size > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Selected Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalSelected.toLocaleString()}
                </p>
              </div>
              <Button onClick={() => navigate('/payments')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Create Pay Run
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedLogs.size === unpaidLogs.length}
                  onCheckedChange={handleToggleAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unpaidLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedLogs.has(log.id)}
                    onCheckedChange={() => handleToggleLog(log.id)}
                  />
                </TableCell>
                <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                <TableCell>{log.workerName}</TableCell>
                <TableCell>{log.companyName}</TableCell>
                <TableCell>{log.projectName}</TableCell>
                <TableCell>{log.trade}</TableCell>
                <TableCell className="text-right">{log.hours}</TableCell>
                <TableCell className="text-right">${log.rate}</TableCell>
                <TableCell className="text-right font-medium">
                  ${log.cost.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
