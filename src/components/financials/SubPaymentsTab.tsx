import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Users, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function SubPaymentsTab() {
  const queryClient = useQueryClient();
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Fetch unpaid sub invoices
  const { data: unpaidInvoices, isLoading } = useQuery({
    queryKey: ['unpaid-sub-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_invoices')
        .select(`
          *,
          subs(name, company_name, trade),
          projects(project_name),
          sub_contracts(contract_id:id, contract_value, retention_percentage)
        `)
        .eq('payment_status', 'unpaid')
        .order('invoice_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const payInvoicesMutation = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      // Mark invoices as paid
      const { error: updateError } = await supabase
        .from('sub_invoices')
        .update({ payment_status: 'paid' })
        .in('id', invoiceIds);

      if (updateError) throw updateError;

      // Create payment records
      const payments = await Promise.all(
        invoiceIds.map(async (invoiceId) => {
          const invoice = unpaidInvoices?.find(inv => inv.id === invoiceId);
          if (!invoice) return null;

          const payableAmount = invoice.total - (invoice.retention_amount || 0);

          const { data, error } = await supabase
            .from('sub_payments')
            .insert({
              project_subcontract_id: invoice.contract_id,
              sub_invoice_id: invoiceId,
              amount_paid: payableAmount,
              payment_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );

      return payments;
    },
    onSuccess: () => {
      toast.success('Invoices marked as paid');
      queryClient.invalidateQueries({ queryKey: ['unpaid-sub-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sub-contract-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      setSelectedInvoices(new Set());
    },
    onError: (error) => {
      toast.error('Failed to process payment: ' + error.message);
    },
  });

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const handlePaySelected = () => {
    if (selectedInvoices.size === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    payInvoicesMutation.mutate(Array.from(selectedInvoices));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalUnpaid = unpaidInvoices?.reduce((sum, inv) => {
    const payable = inv.total - (inv.retention_amount || 0);
    return sum + payable;
  }, 0) || 0;

  const totalRetention = unpaidInvoices?.reduce((sum, inv) => sum + (inv.retention_amount || 0), 0) || 0;

  const selectedTotal = Array.from(selectedInvoices).reduce((sum, id) => {
    const invoice = unpaidInvoices?.find(inv => inv.id === id);
    if (!invoice) return sum;
    return sum + (invoice.total - (invoice.retention_amount || 0));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unpaid</p>
                <p className="text-2xl font-bold">${totalUnpaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention Held</p>
                <p className="text-2xl font-bold">${totalRetention.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Invoices</p>
                <p className="text-2xl font-bold">{unpaidInvoices?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unpaid Sub Invoices</CardTitle>
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-semibold">{selectedInvoices.size}</span> selected
                  <span className="text-muted-foreground ml-2">
                    (${selectedTotal.toLocaleString()})
                  </span>
                </div>
                <Button
                  onClick={handlePaySelected}
                  disabled={payInvoicesMutation.isPending}
                  className="gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  {payInvoicesMutation.isPending ? 'Processing...' : 'Mark as Paid'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!unpaidInvoices || unpaidInvoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No unpaid invoices</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.map((invoice) => {
                  const payableAmount = invoice.total - (invoice.retention_amount || 0);
                  const invoiceDate = new Date(invoice.invoice_date);
                  const daysOld = Math.floor((Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysOld > 30;

                  return (
                    <TableRow key={invoice.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={() => toggleInvoice(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                      <TableCell>
                        <div>
                          {(invoice as any).subs?.name}
                          {(invoice as any).subs?.company_name && (
                            <div className="text-xs text-muted-foreground">
                              {(invoice as any).subs?.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{(invoice as any).projects?.project_name}</TableCell>
                      <TableCell>{invoiceDate.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${invoice.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-600">
                        ${(invoice.retention_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${payableAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                          {daysOld}d old
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
