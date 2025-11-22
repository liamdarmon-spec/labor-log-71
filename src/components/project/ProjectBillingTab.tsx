import { useState } from 'react';
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
import { Plus, FileText, DollarSign, Receipt } from 'lucide-react';
import { useSOVItems, useCreateSOVItem, useUpdateSOVItem, useGenerateSOVFromEstimate } from '@/hooks/useScheduleOfValues';
import { useCustomerPayments, useCreateCustomerPayment } from '@/hooks/useProjectFinancials';
import { useEstimatesV2 } from '@/hooks/useEstimatesV2';
import { toast } from 'sonner';

interface ProjectBillingTabProps {
  projectId: string;
}

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  const { data: sovItems = [] } = useSOVItems(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);
  const { data: estimates = [] } = useEstimatesV2(projectId);
  const createSOVItem = useCreateSOVItem();
  const updateSOVItem = useUpdateSOVItem();
  const generateSOV = useGenerateSOVFromEstimate();
  const createPayment = useCreateCustomerPayment();

  const [sovDialogOpen, setSOVDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newSOVItem, setNewSOVItem] = useState({
    description: '',
    scheduled_value: 0,
  });
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: 'check',
    reference_number: '',
    notes: '',
  });

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + item.scheduled_value, 0);
  const totalCompleted = sovItems.reduce((sum, item) => sum + item.total_completed, 0);
  const retentionHeld = sovItems.reduce((sum, item) => 
    sum + (item.total_completed * (item.retention_percent / 100)), 0
  );
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const openAR = totalCompleted - retentionHeld - totalPaid;

  const handleCreateSOVItem = () => {
    createSOVItem.mutate({
      project_id: projectId,
      description: newSOVItem.description,
      scheduled_value: newSOVItem.scheduled_value,
      sort_order: sovItems.length,
    });
    setSOVDialogOpen(false);
    setNewSOVItem({ description: '', scheduled_value: 0 });
  };

  const handleGenerateSOV = () => {
    const acceptedEstimate = estimates.find(e => e.status === 'accepted');
    if (!acceptedEstimate) {
      toast.error('No accepted estimate found');
      return;
    }
    generateSOV.mutate({ projectId, estimateId: acceptedEstimate.id });
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
      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalScheduledValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Billed to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCompleted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalScheduledValue > 0 ? ((totalCompleted / totalScheduledValue) * 100).toFixed(1) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retention Held
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${retentionHeld.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open AR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${openAR.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule of Values */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedule of Values</CardTitle>
              <CardDescription>Track billing progress and retention</CardDescription>
            </div>
            <div className="flex gap-2">
              {sovItems.length === 0 && estimates.some(e => e.status === 'accepted') && (
                <Button variant="outline" onClick={handleGenerateSOV}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate from Estimate
                </Button>
              )}
              <Dialog open={sovDialogOpen} onOpenChange={setSOVDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Line Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add SOV Line Item</DialogTitle>
                    <DialogDescription>
                      Create a new line item in the schedule of values
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={newSOVItem.description}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, description: e.target.value })}
                        placeholder="Framing labor and materials"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">Scheduled Value</Label>
                      <Input
                        id="value"
                        type="number"
                        value={newSOVItem.scheduled_value}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, scheduled_value: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateSOVItem}>Create Line Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sovItems.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Scheduled Value</TableHead>
                    <TableHead className="text-right">This Period</TableHead>
                    <TableHead className="text-right">Total Complete</TableHead>
                    <TableHead className="text-right">% Complete</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sovItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_number || index + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">${item.scheduled_value.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-24 h-8 text-right"
                          value={item.this_period_completed}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateSOVItem.mutate({
                              id: item.id,
                              projectId,
                              this_period_completed: value,
                              previously_completed: item.previously_completed,
                              scheduled_value: item.scheduled_value,
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.total_completed.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.percent_complete >= 100 ? 'default' : 'secondary'}>
                          {item.percent_complete.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        ${(item.total_completed * (item.retention_percent / 100)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.balance_to_finish.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right">${totalScheduledValue.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">${totalCompleted.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {totalScheduledValue > 0 ? ((totalCompleted / totalScheduledValue) * 100).toFixed(1) : 0}%
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      ${retentionHeld.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(totalScheduledValue - totalCompleted).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No SOV items yet. Generate from estimate or add manually.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Payments */}
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
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention Held</p>
                <p className="text-xl font-bold text-orange-600">${retentionHeld.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open AR</p>
                <p className="text-xl font-bold text-primary">${openAR.toLocaleString()}</p>
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
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payments recorded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
