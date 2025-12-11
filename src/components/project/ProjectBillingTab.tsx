// NOTE: DEPRECATED — Schedule of Values (SOV) logic is being phased out. Do not build on this.
// Use Budget, Costs, and Billing modules for all financial workflows instead.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileText, AlertTriangle, ExternalLink, Receipt } from 'lucide-react';
import { useCustomerPayments, useCreateCustomerPayment } from '@/hooks/useProjectFinancials';
import { useInvoices, useInvoicesSummary } from '@/hooks/useInvoices';
import { format } from 'date-fns';

interface ProjectBillingTabProps {
  projectId: string;
}

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  const navigate = useNavigate();
  const { data: payments = [] } = useCustomerPayments(projectId);
  const createPayment = useCreateCustomerPayment();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ projectId });
  const { data: invoiceSummary } = useInvoicesSummary({ projectId });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: 'check',
    reference_number: '',
    notes: '',
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleRecordPayment = () => {
    createPayment.mutate({
      project_id: projectId,
      amount: newPayment.amount,
      payment_method: newPayment.payment_method,
      reference_number: newPayment.reference_number,
      notes: newPayment.notes,
      payment_date: new Date().toISOString().split('T')[0],
      applied_to_retention: 0,
    });
    setPaymentDialogOpen(false);
    setNewPayment({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      {/* SOV Deprecation Notice */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">Schedule of Values has been deprecated.</p>
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              Please use Budget, Costs, and Billing modules for all financial workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Payments - Keep this section as it's useful */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Payments</CardTitle>
              <CardDescription>Track incoming payments from client</CardDescription>
            </div>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Customer Payment</DialogTitle>
                  <DialogDescription>
                    Enter payment details received from the client
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method</Label>
                    <Select
                      value={newPayment.payment_method}
                      onValueChange={(value) => setNewPayment({ ...newPayment, payment_method: value })}
                    >
                      <SelectTrigger id="method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="wire">Wire</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      value={newPayment.reference_number}
                      onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                      placeholder="Check # or transaction ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleRecordPayment}>Record Payment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payments Recorded</p>
                <p className="text-xl font-bold">{payments.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Payment</p>
                <p className="text-xl font-bold">
                  {payments.length > 0 
                    ? new Date(payments[0].payment_date).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>

            {/* Payments Table */}
            {payments.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">${payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.payment_method || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{payment.reference_number || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payments recorded yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Client invoices for this project</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/financials/receivables')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View All Invoices
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  <p className="text-xl font-bold">{formatCurrency(invoiceSummary?.totalInvoiced || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(invoiceSummary?.outstanding || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="text-xl font-bold">{invoices.length}</p>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow 
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate('/financials/receivables')}
                      >
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {invoice.issue_date 
                            ? format(new Date(invoice.issue_date), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {invoice.due_date 
                            ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(invoice.total_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.retention_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/financials/receivables')}
              >
                Create Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
