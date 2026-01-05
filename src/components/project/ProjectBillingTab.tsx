// Project Billing Hub - Canonical, Auditable, Production-Ready
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
  Lock,
  Send,
  Calendar,
} from 'lucide-react';
import {
  useBillingSummary,
  useBillingLines,
  useContractBaseline,
  useChangeOrders,
  useCreateChangeOrder,
  useApproveChangeOrder,
  useSendChangeOrder,
  useRejectChangeOrder,
  useInvoices,
  useCustomerPayments,
  useCreateCustomerPayment,
  useProposals,
  useAcceptProposalCreateBaseline,
  useUpdateProposalBillingBasis,
} from '@/hooks/useBillingHub';

interface ProjectBillingTabProps {
  projectId: string;
}

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  // CANONICAL: Single source of truth for all billing metrics
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(projectId);
  const { data: billingLines = [] } = useBillingLines(projectId);
  const { data: baseline } = useContractBaseline(projectId);
  
  // Additional data
  const { data: changeOrders = [] } = useChangeOrders(projectId);
  const { data: invoices = [] } = useInvoices(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);
  const { data: proposals = [] } = useProposals(projectId);

  // Mutations
  const createChangeOrder = useCreateChangeOrder();
  const approveChangeOrder = useApproveChangeOrder();
  const sendChangeOrder = useSendChangeOrder();
  const rejectChangeOrder = useRejectChangeOrder();
  const createPayment = useCreateCustomerPayment();
  const acceptProposal = useAcceptProposalCreateBaseline();
  const updateBillingBasis = useUpdateProposalBillingBasis();

  const [activeTab, setActiveTab] = useState('summary');

  // Dialog states
  const [coDialogOpen, setCODialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [approveDialogCO, setApproveDialogCO] = useState<string | null>(null);
  const [rejectDialogCO, setRejectDialogCO] = useState<string | null>(null);
  const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [selectedBillingBasis, setSelectedBillingBasis] = useState<'payment_schedule' | 'sov'>('payment_schedule');

  // Form states
  const [newCO, setNewCO] = useState({ title: '', description: '', total_amount: 0 });
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  const formatPercent = (value: number | null | undefined) => {
    return `${(value ?? 0).toFixed(1)}%`;
  };

  const handleCreateCO = () => {
    if (!newCO.title.trim()) return;
    createChangeOrder.mutate({ project_id: projectId, ...newCO });
    setCODialogOpen(false);
    setNewCO({ title: '', description: '', total_amount: 0 });
  };

  const handleApproveCO = () => {
    if (!approveDialogCO) return;
    approveChangeOrder.mutate({ changeOrderId: approveDialogCO, projectId });
    setApproveDialogCO(null);
  };

  const handleRejectCO = () => {
    if (!rejectDialogCO) return;
    rejectChangeOrder.mutate({ changeOrderId: rejectDialogCO, projectId });
    setRejectDialogCO(null);
  };

  const handleSendCO = (coId: string) => {
    sendChangeOrder.mutate({ changeOrderId: coId, projectId });
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

  const handleCreateBaseline = () => {
    if (!selectedProposalId) return;
    
    // First update billing basis if needed
    const proposal = proposals.find(p => p.id === selectedProposalId);
    if (proposal && proposal.billing_basis !== selectedBillingBasis) {
      updateBillingBasis.mutate({
        proposalId: selectedProposalId,
        projectId,
        billingBasis: selectedBillingBasis,
      }, {
        onSuccess: () => {
          acceptProposal.mutate({ proposalId: selectedProposalId, projectId });
        },
      });
    } else {
      acceptProposal.mutate({ proposalId: selectedProposalId, projectId });
    }
    setBaselineDialogOpen(false);
  };

  // Derived states
  const hasBaseline = summary?.has_contract_baseline ?? false;
  const billingBasis = summary?.billing_basis;
  const pendingProposals = proposals.filter(p => p.acceptance_status === 'pending');

  return (
    <div className="space-y-6">
      {/* No Baseline Warning */}
      {!hasBaseline && !summaryLoading && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">No Contract Baseline</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Accept a proposal to establish the contract baseline and lock the billing method.
                </p>
              </div>
            </div>
            {pendingProposals.length > 0 && (
              <Dialog open={baselineDialogOpen} onOpenChange={setBaselineDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create Baseline</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Contract Baseline</DialogTitle>
                    <DialogDescription>
                      Select a proposal and billing method. Once created, the billing method is LOCKED.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Proposal</Label>
                      <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                        <SelectTrigger><SelectValue placeholder="Select proposal" /></SelectTrigger>
                        <SelectContent>
                          {pendingProposals.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title} - {formatCurrency(p.total_amount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Method (LOCKED after creation)</Label>
                      <Select value={selectedBillingBasis} onValueChange={(v) => setSelectedBillingBasis(v as 'payment_schedule' | 'sov')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment_schedule">Payment Schedule (Milestones)</SelectItem>
                          <SelectItem value="sov">Schedule of Values (AIA Style)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <Lock className="w-4 h-4 inline mr-2" />
                      The billing method cannot be changed after the baseline is created. 
                      To change it, you would need a formal contract amendment.
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateBaseline} disabled={!selectedProposalId || acceptProposal.isPending}>
                      {acceptProposal.isPending ? 'Creating...' : 'Create Baseline'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}

      {/* Locked Billing Basis Badge */}
      {hasBaseline && billingBasis && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Billing Method:</span>
          <Badge variant="outline">
            {billingBasis === 'payment_schedule' ? 'Payment Schedule (Milestones)' : 'Schedule of Values (SOV)'}
          </Badge>
          <span className="text-xs text-muted-foreground">(Locked at contract baseline)</span>
        </div>
      )}

      {/* Summary Cards - ALL from canonical function */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contract Value</CardDescription>
            <CardTitle className="text-2xl">
              {summaryLoading ? '...' : formatCurrency(summary?.current_contract_total)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Base: {formatCurrency(summary?.base_contract_total)} + COs: {formatCurrency(summary?.approved_change_order_total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Billed to Date</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {summaryLoading ? '...' : formatCurrency(summary?.billed_to_date)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary?.invoice_count ?? 0} invoices sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open A/R</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {summaryLoading ? '...' : formatCurrency(summary?.open_ar)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Paid: {formatCurrency(summary?.paid_to_date)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining to Bill</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {summaryLoading ? '...' : formatCurrency(summary?.remaining_to_bill)}
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
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="summary" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="billing-lines" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            {billingBasis === 'sov' ? 'SOV' : 'Milestones'}
          </TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-2">
            <FileText className="w-4 h-4" />
            COs ({summary?.pending_change_order_count ?? 0}/{summary?.approved_change_order_count ?? 0})
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
              <CardTitle>Contract Summary</CardTitle>
              <CardDescription>Canonical billing overview - all values from database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Base Contract (Accepted Proposal)</span>
                  <span className="font-semibold">{formatCurrency(summary?.base_contract_total)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Approved Change Orders ({summary?.approved_change_order_count ?? 0})</span>
                  <span className="font-semibold">{formatCurrency(summary?.approved_change_order_total)}</span>
                </div>
                {(summary?.pending_change_order_count ?? 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                    <span>Pending Change Orders ({summary?.pending_change_order_count})</span>
                    <span className="font-semibold">{formatCurrency(summary?.pending_change_order_value)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 bg-muted/50 px-2 -mx-2 rounded font-medium">
                  <span>Current Contract Value</span>
                  <span className="text-lg">{formatCurrency(summary?.current_contract_total)}</span>
                </div>
                <div className="h-4" />
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Billed to Date</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(summary?.billed_to_date)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Collected</span>
                  <span className="font-semibold text-green-600">{formatCurrency(summary?.paid_to_date)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Open A/R (Invoiced - Paid)</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(summary?.open_ar)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Retention Held</span>
                  <span className="font-semibold">{formatCurrency(summary?.retention_held)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-muted/50 px-2 -mx-2 rounded font-medium">
                  <span>Remaining to Bill</span>
                  <span className="text-lg">{formatCurrency(summary?.remaining_to_bill)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>{summary?.payment_count ?? 0} payments recorded</CardDescription>
              </div>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
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

        {/* Billing Lines Tab (Milestones or SOV) */}
        <TabsContent value="billing-lines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {billingBasis === 'sov' ? 'Schedule of Values' : 'Payment Schedule Milestones'}
              </CardTitle>
              <CardDescription>
                {billingBasis === 'sov' 
                  ? 'AIA-style progress billing by line item'
                  : 'Milestone-based billing schedule'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasBaseline ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Create a contract baseline to see billing lines.</p>
                </div>
              ) : billingLines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Scheduled</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">% Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingLines.map((line, idx) => (
                      <TableRow key={line.line_id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{line.line_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.scheduled_amount)}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCurrency(line.invoiced_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.remaining_amount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={line.percent_complete >= 100 ? 'default' : 'secondary'}>
                            {formatPercent(line.percent_complete)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(billingLines.reduce((sum, l) => sum + l.scheduled_amount, 0))}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(billingLines.reduce((sum, l) => sum + l.invoiced_amount, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(billingLines.reduce((sum, l) => sum + l.remaining_amount, 0))}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No billing lines defined yet.</p>
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
                <CardDescription>Contract modifications - only approved COs affect contract value</CardDescription>
              </div>
              <Dialog open={coDialogOpen} onOpenChange={setCODialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!hasBaseline}>
                    <Plus className="w-4 h-4 mr-2" /> New CO
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Change Order</DialogTitle>
                    <DialogDescription>Add a contract modification</DialogDescription>
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
                      <p className="text-xs text-muted-foreground">Use negative for deductions</p>
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
              {!hasBaseline && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Create a contract baseline before adding change orders.
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
                        <TableCell>{co.change_order_number || `CO-${idx + 1}`}</TableCell>
                        <TableCell>{co.title}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              co.status === 'approved' ? 'default' : 
                              co.status === 'rejected' || co.status === 'void' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {co.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${co.total_amount < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(Number(co.total_amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          {co.status === 'draft' && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSendCO(co.id)}
                              >
                                <Send className="w-4 h-4 mr-1" /> Send
                              </Button>
                            </div>
                          )}
                          {co.status === 'sent' && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setApproveDialogCO(co.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Approve
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
                          {co.status === 'approved' && (
                            <span className="text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              {co.approved_at ? new Date(co.approved_at).toLocaleDateString() : 'Approved'}
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

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Billing documents for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
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
                        <TableCell>
                          <Badge variant="outline">
                            {inv.sov_based ? 'SOV' : inv.source_type || 'Manual'}
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

      {/* Approve CO Dialog */}
      <AlertDialog open={!!approveDialogCO} onOpenChange={(open) => !open && setApproveDialogCO(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the CO amount to the contract value. This action is permanent and audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveCO}>
              Approve CO
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
