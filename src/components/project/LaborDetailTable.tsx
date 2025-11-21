import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LaborLog {
  id: string;
  date: string;
  hours_worked: number;
  payment_status: string | null;
  workers: {
    name: string;
    hourly_rate: number;
  };
  cost_codes?: {
    code: string;
    name: string;
  };
}

interface LaborDetailTableProps {
  projectId: string;
}

export const LaborDetailTable = ({ projectId }: LaborDetailTableProps) => {
  const [logs, setLogs] = useState<LaborLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    fetchLaborLogs();
  }, [projectId]);

  const fetchLaborLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          payment_status,
          workers (name, hourly_rate),
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching labor logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'paid') return log.payment_status === 'paid';
    if (filter === 'unpaid') return log.payment_status !== 'paid';
    return true;
  });

  const totalHours = filteredLogs.reduce((sum, log) => sum + log.hours_worked, 0);
  const totalCost = filteredLogs.reduce((sum, log) => 
    sum + (log.hours_worked * log.workers.hourly_rate), 0
  );

  const getPaymentStatusBadge = (status: string | null) => {
    if (status === 'paid') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-900">
        <Circle className="w-3 h-3 mr-1" />
        Unpaid
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Labor Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Labor Detail</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              All daily labor logs for this project
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('paid')}
            >
              Paid
            </Button>
            <Button
              variant={filter === 'unpaid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unpaid')}
            >
              Unpaid
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{filteredLogs.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Cost Code</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Payment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No labor logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const cost = log.hours_worked * log.workers.hourly_rate;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{log.workers.name}</TableCell>
                      <TableCell>
                        {log.cost_codes ? (
                          <div>
                            <span className="font-mono text-xs">{log.cost_codes.code}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {log.cost_codes.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{log.hours_worked.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${log.workers.hourly_rate.toFixed(2)}/hr</TableCell>
                      <TableCell className="text-right font-semibold">${cost.toFixed(2)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(log.payment_status)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
