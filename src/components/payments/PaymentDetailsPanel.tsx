import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Payment {
  id: string;
  start_date: string;
  end_date: string;
  amount: number;
  paid_by: string;
  paid_via: string | null;
  payment_date: string;
  reimbursement_status: string | null;
  company_id: string | null;
}

interface DailyLog {
  id: string;
  date: string;
  hours_worked: number;
  paid_amount: number | null;
  workers: {
    name: string;
    hourly_rate: number;
  };
  projects: {
    project_name: string;
  };
}

interface PaymentDetailsPanelProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentDetailsPanel = ({ payment, open, onOpenChange }: PaymentDetailsPanelProps) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    if (payment) {
      fetchPaymentDetails();
    }
  }, [payment]);

  const fetchPaymentDetails = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      // Fetch company name
      if (payment.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', payment.company_id)
          .single();
        
        if (company) {
          setCompanyName(company.name);
        }
      }

      // Fetch linked daily logs
      const { data: logsData, error } = await supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          paid_amount,
          workers (name, hourly_rate),
          projects (project_name)
        `)
        .eq('payment_id', payment.id);

      if (error) throw error;
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  const totalHours = logs.reduce((sum, log) => sum + log.hours_worked, 0);
  const projectBreakdown = logs.reduce((acc, log) => {
    const projectName = log.projects.project_name;
    if (!acc[projectName]) {
      acc[projectName] = { hours: 0, cost: 0 };
    }
    acc[projectName].hours += log.hours_worked;
    acc[projectName].cost += log.paid_amount || 0;
    return acc;
  }, {} as Record<string, { hours: number; cost: number }>);

  const getReimbursementBadge = (status: string | null) => {
    if (!status) return null;
    if (status === 'reimbursed') return <Badge variant="default">Reimbursed</Badge>;
    if (status === 'pending') return <Badge variant="secondary">Pending</Badge>;
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Payment Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Payment Info */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <span className="font-medium">
                {format(new Date(payment.start_date), 'MMM d')} - {format(new Date(payment.end_date), 'MMM d, yyyy')}
              </span>
            </div>
            {companyName && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company:</span>
                <span className="font-medium">{companyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold text-lg">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Paid By:</span>
              <span className="font-medium">{payment.paid_by}</span>
            </div>
            {payment.paid_via && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Paid Via:</span>
                <span className="font-medium">{payment.paid_via}</span>
              </div>
            )}
            {payment.reimbursement_status && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reimbursement:</span>
                {getReimbursementBadge(payment.reimbursement_status)}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">Summary</h3>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Logs:</span>
                <span className="font-medium">{logs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Hours:</span>
                <span className="font-medium">{totalHours.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Project Breakdown */}
          {Object.keys(projectBreakdown).length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Project Breakdown</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(projectBreakdown).map(([project, data]) => (
                      <TableRow key={project}>
                        <TableCell className="font-medium">{project}</TableCell>
                        <TableCell className="text-right">{data.hours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${data.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Linked Logs */}
          <div className="space-y-3">
            <h3 className="font-semibold">Linked Daily Logs ({logs.length})</h3>
            {loading ? (
              <div className="text-muted-foreground text-center py-8">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">No logs found</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{log.workers.name}</TableCell>
                        <TableCell>{log.projects.project_name}</TableCell>
                        <TableCell className="text-right">{log.hours_worked.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${(log.paid_amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
