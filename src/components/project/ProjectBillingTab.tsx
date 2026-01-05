// Project Billing Hub - Contract, Change Orders, SOV, Invoices, Payments
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, FileText, DollarSign, Receipt, ClipboardList, TrendingUp } from 'lucide-react';
import {
  useBillingSummary,
  useSOVItems,
  useCreateSOVItem,
  useChangeOrders,
  useCreateChangeOrder,
  useInvoices,
  usePaymentApplications,
  useCreatePaymentApplication,
  useCustomerPayments,
  useCreateCustomerPayment,
} from '@/hooks/useBillingHub';

interface ProjectBillingTabProps {
  projectId: string;
}

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(projectId);
  const { data: sovItems = [] } = useSOVItems(projectId);
  const { data: changeOrders = [] } = useChangeOrders(projectId);
  const { data: invoices = [] } = useInvoices(projectId);
  const { data: payApps = [] } = usePaymentApplications(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);

  const createSOVItem = useCreateSOVItem();
  const createChangeOrder = useCreateChangeOrder();
  const createPayApp = useCreatePaymentApplication();
  const createPayment = useCreateCustomerPayment();

  const [activeTab, setActiveTab] = useState('summary');

  // Dialog states
  const [sovDialogOpen, setSOVDialogOpen] = useState(false);
  const [coDialogOpen, setCODialogOpen] = useState(false);
  const [payAppDialogOpen, setPayAppDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Form states
  const [newSOV, setNewSOV] = useState({ description: '', scheduled_value: 0 });
  const [newCO, setNewCO] = useState({ title: '', description: '', total_amount: 0 });
  const [newPayApp, setNewPayApp] = useState({ this_period: 0, retention_percent: 10 });
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const handleCreateSOV = () => {
    if (!newSOV.description.trim()) return;
    createSOVItem.mutate({ project_id: projectId, ...newSOV });
    setSOVDialogOpen(false);
    setNewSOV({ description: '', scheduled_value: 0 });
  };

  const handleCreateCO = () => {
    if (!newCO.title.trim()) return;
    createChangeOrder.mutate({ project_id: projectId, ...newCO });
    setCODialogOpen(false);
    setNewCO({ title: '', description: '', total_amount: 0 });
  };

  const handleCreatePayApp = () => {
    const scheduledValue = sovItems.reduce((sum, item) => sum + Number(item.scheduled_value), 0);
    createPayApp.mutate({
      project_id: projectId,
      scheduled_value: scheduledValue,
      ...newPayApp,
    });
    setPayAppDialogOpen(false);
    setNewPayApp({ this_period: 0, retention_percent: 10 });
  };

  const handleCreatePayment = () => {
    if (newPayment.amount <= 0) return;
    createPayment.mutate({
      project_id: projectId,
      payment_date: new Date().toISOString().split('T')[0],
      applied_to_retention: 0,
      ...newPayment,
    });
    setPaymentDialogOpen(false);
    setNewPayment({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contract Value</CardDescription>
            <CardTitle className="text-2xl">
              {summaryLoading ? '...' : formatCurrency(summary?.contract_value ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Base: {formatCurrency(summary?.base_contract_value ?? 0)} + CO: {formatCurrency(summary?.approved_change_orders ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {summaryLoading ? '...' : formatCurrency(summary?.invoiced_total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary?.invoice_count ?? 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {summaryLoading ? '...' : formatCurrency(summary?.paid_total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary?.payment_count ?? 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {summaryLoading ? '...' : formatCurrency(summary?.outstanding_balance ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Balance to finish: {formatCurrency(summary?.balance_to_finish ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="summary" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="sov" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            SOV
          </TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-2">
            <FileText className="w-4 h-4" />
            COs ({changeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="w-4 h-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Overview</CardTitle>
              <CardDescription>Contract vs Billed vs Collected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Base Contract</span>
                  <span className="font-semibold">{formatCurrency(summary?.base_contract_value ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Approved Change Orders ({summary?.change_order_count ?? 0})</span>
                  <span className="font-semibold">{formatCurrency(summary?.approved_change_orders ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 -mx-2 rounded">
                  <span className="font-medium">Total Contract Value</span>
                  <span className="font-bold text-lg">{formatCurrency(summary?.contract_value ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Invoiced to Date</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(summary?.invoiced_total ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Retention Held</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(summary?.retention_held ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Collected</span>
                  <span className="font-semibold text-green-600">{formatCurrency(summary?.paid_total ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-muted/50 px-2 -mx-2 rounded">
                  <span className="font-medium">Balance to Finish</span>
                  <span className="font-bold text-lg">{formatCurrency(summary?.balance_to_finish ?? 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOV Tab */}
        <TabsContent value="sov" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Schedule of Values</CardTitle>
                <CardDescription>Line items for progress billing</CardDescription>
              </div>
              <Dialog open={sovDialogOpen} onOpenChange={setSOVDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add SOV Item</DialogTitle>
                    <DialogDescription>Create a new schedule of values line item</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newSOV.description}
                        onChange={(e) => setNewSOV({ ...newSOV, description: e.target.value })}
                        placeholder="e.g., Framing - Phase 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scheduled Value ($)</Label>
                      <Input
                        type="number"
                        value={newSOV.scheduled_value}
                        onChange={(e) => setNewSOV({ ...newSOV, scheduled_value: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateSOV} disabled={createSOVItem.isPending}>
                      {createSOVItem.isPending ? 'Creating...' : 'Create Item'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {sovItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Scheduled Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sovItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(item.scheduled_value))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sovItems.reduce((sum, i) => sum + Number(i.scheduled_value), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No SOV items yet. Add items to enable progress billing.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Orders Tab */}
        <TabsContent value="change-orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Change Orders</CardTitle>
                <CardDescription>Contract modifications</CardDescription>
              </div>
              <Dialog open={coDialogOpen} onOpenChange={setCODialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> New CO</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Change Order</DialogTitle>
                    <DialogDescription>Add a new change order to this project</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={newCO.title}
                        onChange={(e) => setNewCO({ ...newCO, title: e.target.value })}
                        placeholder="e.g., Add electrical outlets"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newCO.description}
                        onChange={(e) => setNewCO({ ...newCO, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        value={newCO.total_amount}
                        onChange={(e) => setNewCO({ ...newCO, total_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateCO} disabled={createChangeOrder.isPending}>
                      {createChangeOrder.isPending ? 'Creating...' : 'Create CO'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {changeOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CO #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.map((co) => (
                      <TableRow key={co.id}>
                        <TableCell>{co.change_order_number || '-'}</TableCell>
                        <TableCell>{co.title}</TableCell>
                        <TableCell>
                          <Badge variant={co.status === 'approved' ? 'default' : 'secondary'}>
                            {co.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(co.total_amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No change orders yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Sent invoices for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'void' ? 'destructive' : 'secondary'}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(inv.total_amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Payments</CardTitle>
                <CardDescription>Track incoming payments</CardDescription>
              </div>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>Enter payment details from the client</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={newPayment.payment_method}
                        onValueChange={(v) => setNewPayment({ ...newPayment, payment_method: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Label>Reference #</Label>
                      <Input
                        value={newPayment.reference_number}
                        onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                        placeholder="Check # or transaction ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={newPayment.notes}
                        onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreatePayment} disabled={createPayment.isPending}>
                      {createPayment.isPending ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(Number(p.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.payment_method || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{p.reference_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payments recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
