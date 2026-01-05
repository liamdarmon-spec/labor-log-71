// Project Billing Hub - Canonical Data Layer
// Big 3 Aligned:
// 1. CANONICAL: All totals from get_project_billing_summary - NO frontend math
// 2. SECURITY: All data via RLS-protected queries
// 3. PERFORMANCE: Single summary call + minimal additional queries

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  FileText, 
  DollarSign, 
  Receipt, 
  ClipboardList, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  useBillingSummary,
  useSOVItems,
  useCreateSOVItem,
  useChangeOrders,
  useCreateChangeOrder,
  useAcceptChangeOrder,
  useRejectChangeOrder,
  useInvoices,
  usePaymentMilestones,
  useCustomerPayments,
  useCreateCustomerPayment,
  useBaseProposal,
} from '@/hooks/useBillingHub';

interface ProjectBillingTabProps {
  projectId: string;
}

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  // CANONICAL: Single source of truth for all billing metrics
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(projectId);
  
  // Additional data for lists (minimal queries)
  const { data: sovItems = [] } = useSOVItems(projectId);
  const { data: changeOrders = [] } = useChangeOrders(projectId);
  const { data: invoices = [] } = useInvoices(projectId);
  const { data: milestones = [] } = usePaymentMilestones(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);
  const { data: baseProposal } = useBaseProposal(projectId);

  // Mutations
  const createSOVItem = useCreateSOVItem();
  const createChangeOrder = useCreateChangeOrder();
  const acceptChangeOrder = useAcceptChangeOrder();
  const rejectChangeOrder = useRejectChangeOrder();
  const createPayment = useCreateCustomerPayment();

  const [activeTab, setActiveTab] = useState('summary');

  // Dialog states
  const [sovDialogOpen, setSOVDialogOpen] = useState(false);
  const [coDialogOpen, setCODialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [acceptDialogCO, setAcceptDialogCO] = useState<string | null>(null);
  const [rejectDialogCO, setRejectDialogCO] = useState<string | null>(null);

  // Form states
  const [newSOV, setNewSOV] = useState({ description: '', scheduled_value: 0 });
  const [newCO, setNewCO] = useState({ title: '', description: '', total_amount: 0 });
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  const handleCreateSOV = () => {
    if (!newSOV.description.trim()) return;
    createSOVItem.mutate({ project_id: projectId, ...newSOV });
    setSOVDialogOpen(false);
    setNewSOV({ description: '', scheduled_value: 0 });
  };

  const handleCreateCO = () => {
    if (!newCO.title.trim()) return;
    if (!baseProposal?.id) {
      return; // Need base proposal to create CO
    }
    createChangeOrder.mutate({ 
      project_id: projectId, 
      parent_proposal_id: baseProposal.id,
      ...newCO 
    });
    setCODialogOpen(false);
    setNewCO({ title: '', description: '', total_amount: 0 });
  };

  const handleAcceptCO = () => {
    if (!acceptDialogCO) return;
    acceptChangeOrder.mutate({ proposalId: acceptDialogCO, projectId });
    setAcceptDialogCO(null);
  };

  const handleRejectCO = () => {
    if (!rejectDialogCO) return;
    rejectChangeOrder.mutate({ proposalId: rejectDialogCO, projectId });
    setRejectDialogCO(null);
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

  // Banner state based on canonical data
  const showNoBannerProposal = !summary?.has_base_proposal;
  const sovVarianceWarning = summary?.sov_variance !== 0 && (summary?.sov_item_count ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Warning Banners */}
      {showNoBannerProposal && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">No Base Contract</p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Accept a proposal to establish the base contract value.
              </p>
            </div>
          </div>
        </div>
      )}

      {sovVarianceWarning && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">SOV Variance</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                SOV total ({formatCurrency(summary?.sov_total)}) differs from contract value by {formatCurrency(summary?.sov_variance)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - ALL from canonical function */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contract Value</CardDescription>
            <CardTitle className="text-2xl">
              {summaryLoading ? '...' : formatCurrency(summary?.contract_value)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Base: {formatCurrency(summary?.base_contract_value)} + COs: {formatCurrency(summary?.approved_change_orders)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SOV Total</CardDescription>
            <CardTitle className="text-2xl">
              {summaryLoading ? '...' : formatCurrency(summary?.sov_total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary?.sov_item_count ?? 0} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {summaryLoading ? '...' : formatCurrency(summary?.outstanding_balance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Invoiced: {formatCurrency(summary?.invoiced_total)} - Paid: {formatCurrency(summary?.paid_total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Balance to Finish</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {summaryLoading ? '...' : formatCurrency(summary?.balance_to_finish)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Retention held: {formatCurrency(summary?.retention_held)}
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
          <TabsTrigger value="milestones" className="gap-2">
            <Calendar className="w-4 h-4" />
            Payment Schedule
          </TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-2">
            <FileText className="w-4 h-4" />
            COs ({summary?.change_order_count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="sov" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            SOV ({summary?.sov_item_count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="w-4 h-4" />
            Invoices ({summary?.invoice_count ?? 0})
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
                  <span className="font-semibold">{formatCurrency(summary?.base_contract_value)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Approved Change Orders ({summary?.change_order_count ?? 0})</span>
                  <span className="font-semibold">{formatCurrency(summary?.approved_change_orders)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 -mx-2 rounded">
                  <span className="font-medium">Total Contract Value</span>
                  <span className="font-bold text-lg">{formatCurrency(summary?.contract_value)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Schedule of Values Total</span>
                  <span className={`font-semibold ${sovVarianceWarning ? 'text-yellow-600' : ''}`}>
                    {formatCurrency(summary?.sov_total)}
                    {sovVarianceWarning && <span className="text-xs ml-2">(variance: {formatCurrency(summary?.sov_variance)})</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Invoiced to Date</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(summary?.invoiced_total)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Retention Held</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(summary?.retention_held)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Collected</span>
                  <span className="font-semibold text-green-600">{formatCurrency(summary?.paid_total)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-muted/50 px-2 -mx-2 rounded">
                  <span className="font-medium">Balance to Finish</span>
                  <span className="font-bold text-lg">{formatCurrency(summary?.balance_to_finish)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>{summary?.payment_count ?? 0} payments recorded</CardDescription>
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
                    {payments.slice(0, 5).map((p: any) => (
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
                <div className="text-center py-6 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedule / Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>Billing milestones for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{m.status}</Badge>
                        </TableCell>
                        <TableCell>{m.item_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(m.total_amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payment schedules yet.</p>
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
                <CardDescription>Contract modifications - accepted COs update contract value</CardDescription>
              </div>
              <Dialog open={coDialogOpen} onOpenChange={setCODialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!baseProposal}>
                    <Plus className="w-4 h-4 mr-2" /> New CO
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Change Order</DialogTitle>
                    <DialogDescription>
                      This CO will be linked to base proposal: {baseProposal?.title ?? 'N/A'}
                    </DialogDescription>
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
              {!baseProposal && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Accept a base proposal first before creating change orders.
                </div>
              )}
              {changeOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CO #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.map((co, idx) => (
                      <TableRow key={co.id}>
                        <TableCell>{co.proposal_number || `CO-${idx + 1}`}</TableCell>
                        <TableCell>{co.title}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              co.acceptance_status === 'accepted' ? 'default' : 
                              co.acceptance_status === 'rejected' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {co.acceptance_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(co.total_amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          {co.acceptance_status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setAcceptDialogCO(co.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setRejectDialogCO(co.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                          {co.acceptance_status === 'accepted' && (
                            <span className="text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              {co.acceptance_date ? new Date(co.acceptance_date).toLocaleDateString() : 'Accepted'}
                            </span>
                          )}
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
                      <TableCell colSpan={2}>Total (from canonical function)</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(summary?.sov_total)}
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
      </Tabs>

      {/* Accept CO Dialog */}
      <AlertDialog open={!!acceptDialogCO} onOpenChange={(open) => !open && setAcceptDialogCO(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the CO amount to the contract value. This action is recorded for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptCO}>
              Accept CO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject CO Dialog */}
      <AlertDialog open={!!rejectDialogCO} onOpenChange={(open) => !open && setRejectDialogCO(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This change order will be marked as rejected and will not affect the contract value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectCO} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reject CO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
