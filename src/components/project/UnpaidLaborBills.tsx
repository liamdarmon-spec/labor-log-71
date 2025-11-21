import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface UnpaidBill {
  company_id: string;
  company_name: string;
  log_count: number;
  total_hours: number;
  total_amount: number;
  earliest_date: string;
  latest_date: string;
}

interface UnpaidLaborBillsProps {
  projectId: string;
}

export const UnpaidLaborBills = ({ projectId }: UnpaidLaborBillsProps) => {
  const [bills, setBills] = useState<UnpaidBill[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnpaidBills();
  }, [projectId]);

  const fetchUnpaidBills = async () => {
    try {
      setLoading(true);
      
      // Get project to find company_id
      const { data: project } = await supabase
        .from('projects')
        .select('company_id, companies(name)')
        .eq('id', projectId)
        .single();

      if (!project || !project.company_id) {
        setBills([]);
        setLoading(false);
        return;
      }

      // Get unpaid logs for this project
      const { data: unpaidLogs, error } = await supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          workers (hourly_rate)
        `)
        .eq('project_id', projectId)
        .eq('payment_status', 'unpaid');

      if (error) throw error;

      if (!unpaidLogs || unpaidLogs.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }

      // Calculate totals
      const total_hours = unpaidLogs.reduce((sum, log) => sum + log.hours_worked, 0);
      const total_amount = unpaidLogs.reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );
      
      const dates = unpaidLogs.map(log => log.date).sort();
      const earliest_date = dates[0];
      const latest_date = dates[dates.length - 1];

      setBills([{
        company_id: project.company_id,
        company_name: (project.companies as any)?.name || 'Unknown Company',
        log_count: unpaidLogs.length,
        total_hours,
        total_amount,
        earliest_date,
        latest_date,
      }]);
    } catch (error) {
      console.error('Error fetching unpaid bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPayment = (bill: UnpaidBill) => {
    // Navigate to payments page with pre-filled filters
    navigate(`/payments?company=${bill.company_id}&startDate=${bill.earliest_date}&endDate=${bill.latest_date}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Unpaid Labor (Open Bills)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Unpaid Labor (Open Bills)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No unpaid labor for this project</p>
            <p className="text-sm mt-1">All labor costs have been paid</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Unpaid Labor (Open Bills)
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Outstanding amounts owed
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Logs</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Amount Owed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.company_id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{bill.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bill.earliest_date).toLocaleDateString()} - {new Date(bill.latest_date).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{bill.log_count}</TableCell>
                  <TableCell className="text-right">{bill.total_hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      ${bill.total_amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => handleRunPayment(bill)}
                      className="gap-2"
                    >
                      Run Payment
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
