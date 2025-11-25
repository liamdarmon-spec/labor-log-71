import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PayRunDetailDrawerProps {
  payRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PayRunDetailDrawer({ payRunId, open, onOpenChange, onSuccess }: PayRunDetailDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pay run with items
  const { data: payRun, isLoading } = useQuery({
    queryKey: ['labor-pay-run-detail', payRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_pay_runs')
        .select(`
          *,
          payer_company:companies!labor_pay_runs_payer_company_id_fkey(name),
          payee_company:companies!labor_pay_runs_payee_company_id_fkey(name)
        `)
        .eq('id', payRunId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!payRunId && open,
  });

  const { data: payRunItems } = useQuery({
    queryKey: ['labor-pay-run-items', payRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_pay_run_items')
        .select(`
          *,
          time_log:time_logs(
            id,
            date,
            hours_worked,
            labor_cost,
            payment_status,
            worker:workers(name),
            project:projects(project_name)
          )
        `)
        .eq('pay_run_id', payRunId)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: !!payRunId && open,
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('labor_pay_runs')
        .update({ status: 'paid' })
        .eq('id', payRunId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-pay-run-detail', payRunId] });
      queryClient.invalidateQueries({ queryKey: ['labor-pay-run-items', payRunId] });
      queryClient.invalidateQueries({ queryKey: ['labor-pay-runs'] });
      toast({
        title: 'Pay run marked as paid',
        description: 'All time logs have been updated to paid status',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePayRun = useMutation({
    mutationFn: async () => {
      // First delete items
      const { error: itemsError } = await supabase
        .from('labor_pay_run_items')
        .delete()
        .eq('pay_run_id', payRunId);

      if (itemsError) throw itemsError;

      // Then delete pay run
      const { error } = await supabase
        .from('labor_pay_runs')
        .delete()
        .eq('id', payRunId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-pay-runs'] });
      toast({
        title: 'Pay run deleted',
        description: 'Pay run and all items have been removed',
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading || !payRun) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <Skeleton className="h-96" />
        </SheetContent>
      </Sheet>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const totalHours = payRunItems?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pay Run Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Date Range</div>
                <div className="text-lg font-semibold">
                  {format(new Date(payRun.date_range_start), 'MMM d, yyyy')} -{' '}
                  {format(new Date(payRun.date_range_end), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge variant={getStatusColor(payRun.status)}>
                    {payRun.status || 'draft'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Payer Company</div>
                <div className="text-lg font-semibold">
                  {payRun.payer_company?.name || 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-lg font-semibold">
                  ${(payRun.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                  <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time Logs</div>
                  <div className="text-2xl font-bold">{payRunItems?.length || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Logs Table */}
          <div>
            <h3 className="font-semibold mb-3">Time Log Details</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payRunItems?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.time_log?.worker?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.time_log?.project?.project_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.time_log?.date ? format(new Date(item.time_log.date), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.hours?.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.rate?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.time_log?.payment_status === 'paid' ? 'default' : 'outline'}>
                          {item.time_log?.payment_status || 'unpaid'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Actions */}
          {payRun.status === 'draft' && (
            <div className="flex gap-3">
              <Button 
                onClick={() => markPaid.mutate()}
                disabled={markPaid.isPending}
                className="flex-1 gap-2"
              >
                {markPaid.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Mark as Paid
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Pay Run?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this pay run and all associated items. Time logs will remain as unpaid.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePayRun.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
