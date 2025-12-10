/**
 * VendorPaymentsTab - Lists all vendor_payments (non-labor AP payments)
 * 
 * Shows payments from vendor_payments table with links to costs via vendor_payment_items.
 * This is the unified payment history for all non-labor costs (subs, materials, equipment, other).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useSubs } from '@/hooks/useSubs';

export function VendorPaymentsTab() {
  const navigate = useNavigate();
  const { data: subs } = useSubs();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['vendor-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payments')
        .select(`
          *,
          vendor_payment_items (
            id,
            applied_amount,
            cost_id,
            costs (
              id,
              description,
              project_id,
              projects (
                project_name
              )
            )
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getVendorName = (vendorType: string, vendorId: string) => {
    if (vendorType === 'sub' && subs) {
      const sub = subs.find((s) => s.id === vendorId);
      return sub?.name || sub?.company_name || vendorId;
    }
    return vendorId; // For suppliers/other, we'd need a suppliers table
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vendor Payments</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPayments)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Count</p>
              <p className="text-2xl font-bold">{payments?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Costs Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment: any) => {
                  const paymentItems = payment.vendor_payment_items || [];
                  const costCount = paymentItems.length;
                  const firstCost = paymentItems[0]?.costs;

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payment.vendor_type === 'sub' ? 'Subcontractor' : payment.vendor_type}
                      </TableCell>
                      <TableCell>
                        {getVendorName(payment.vendor_type, payment.vendor_id)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payment.method || '-'}
                      </TableCell>
                      <TableCell>
                        {payment.reference || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.amount || 0)}
                      </TableCell>
                      <TableCell>
                        {costCount > 0 && firstCost?.project_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary hover:underline"
                            onClick={() => navigate(`/projects/${firstCost.project_id}`)}
                          >
                            {costCount} cost(s)
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          `${costCount} cost(s)`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'recorded' ? 'default' : 'secondary'}>
                          {payment.status || 'recorded'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {(!payments || payments.length === 0) && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No vendor payments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
