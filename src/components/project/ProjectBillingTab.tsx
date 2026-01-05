// Project Billing Hub - 3 Explicit States
// Big 3 Aligned: Canonical, Security, Performance
//
// State A: No Contract Baseline → Setup UI
// State B: Baseline with payment_schedule → Milestones tabs
// State C: Baseline with sov → SOV tabs

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Lock,
  Send,
  ArrowRight,
  FileCheck,
  Calendar,
  CreditCard,
  AlertCircle,
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
} from '@/hooks/useBillingHub';

interface ProjectBillingTabProps {
  projectId: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  // CANONICAL: Single source of truth for all billing metrics
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(projectId);
  const { data: billingLines = [] } = useBillingLines(projectId);
  const { data: baseline } = useContractBaseline(projectId);
  
  // Additional data
  const { data: changeOrders = [] } = useChangeOrders(projectId);
  const { data: invoices = [] } = useInvoices(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);

  // Mutations
  const createChangeOrder = useCreateChangeOrder();
  const approveChangeOrder = useApproveChangeOrder();
  const sendChangeOrder = useSendChangeOrder();
  const rejectChangeOrder = useRejectChangeOrder();
  const createPayment = useCreateCustomerPayment();

  // Determine billing state
  const hasBaseline = summary?.has_contract_baseline ?? false;
  const billingBasis = summary?.billing_basis as 'payment_schedule' | 'sov' | null;

  // Default tab based on billing basis
  const getDefaultTab = () => {
    if (!hasBaseline) return 'setup';
    if (billingBasis === 'sov') return 'sov';
    return 'milestones';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // Update default tab when baseline status changes
  useEffect(() => {
    if (!summaryLoading) {
      setActiveTab(getDefaultTab());
    }
  }, [hasBaseline, billingBasis, summaryLoading]);

  // Dialog states
  const [coDialogOpen, setCODialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [approveDialogCO, setApproveDialogCO] = useState<string | null>(null);
  const [rejectDialogCO, setRejectDialogCO] = useState<string | null>(null);

  // Form states
  const [newCO, setNewCO] = useState({ title: '', description: '', total_amount: 0 });
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: 'check', reference_number: '', notes: '' });

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  const formatPercent = (value: number | null | undefined) => {
    return `${(value ?? 0).toFixed(1)}%`;
  };

  // Handlers
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

  // Loading state
  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading billing data...</div>
      </div>
    );
  }

  // ============================================================
  // STATE A: No Contract Baseline
  // ============================================================
  if (!hasBaseline) {
    return <NoBaselineState projectId={projectId} />;
  }

  // ============================================================
  // STATE B & C: Has Baseline (payment_schedule or sov)
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Locked Billing Basis Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {billingBasis === 'sov' ? 'Schedule of Values' : 'Payment Schedule'}
          </span>
          <Badge variant="secondary" className="text-xs">Locked</Badge>
        </div>
      </div>

      {/* Summary Cards - ALL from canonical function */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Contract Value"
          value={formatCurrency(summary?.current_contract_total)}
          subtitle={`Base: ${formatCurrency(summary?.base_contract_total)} + COs: ${formatCurrency(summary?.approved_change_order_total)}`}
          icon={<FileCheck className="w-5 h-5" />}
        />
        <SummaryCard
          title="Billed to Date"
          value={formatCurrency(summary?.billed_to_date)}
          subtitle={`${summary?.invoice_count ?? 0} invoices`}
          icon={<Receipt className="w-5 h-5" />}
          valueClassName="text-blue-600"
        />
        <SummaryCard
          title="Open A/R"
          value={formatCurrency(summary?.open_ar)}
          subtitle={`Paid: ${formatCurrency(summary?.paid_to_date)}`}
          icon={<DollarSign className="w-5 h-5" />}
          valueClassName="text-orange-600"
        />
        <SummaryCard
          title="Remaining to Bill"
          value={formatCurrency(summary?.remaining_to_bill)}
          subtitle={`Retention: ${formatCurrency(summary?.retention_held)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          valueClassName="text-green-600"
        />
      </div>

      {/* Tabs - Different based on billing basis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {billingBasis === 'sov' ? (
            <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
          ) : (
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          )}
          <TabsTrigger value="change-orders">
            Change Orders
            {(summary?.pending_change_order_count ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {summary?.pending_change_order_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <ContractSummaryCard summary={summary} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Milestones Tab (payment_schedule only) */}
        <TabsContent value="milestones" className="space-y-4">
          <BillingLinesTable 
            billingLines={billingLines} 
            billingBasis="payment_schedule"
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        </TabsContent>

        {/* SOV Tab (sov only) */}
        <TabsContent value="sov" className="space-y-4">
          <BillingLinesTable 
            billingLines={billingLines} 
            billingBasis="sov"
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        </TabsContent>

        {/* Change Orders Tab */}
        <TabsContent value="change-orders" className="space-y-4">
          <ChangeOrdersPanel
            changeOrders={changeOrders}
            formatCurrency={formatCurrency}
            onSend={handleSendCO}
            onApprove={setApproveDialogCO}
            onReject={setRejectDialogCO}
            dialogOpen={coDialogOpen}
            setDialogOpen={setCODialogOpen}
            newCO={newCO}
            setNewCO={setNewCO}
            onCreate={handleCreateCO}
            isCreating={createChangeOrder.isPending}
          />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <InvoicesPanel 
            invoices={invoices} 
            billingBasis={billingBasis}
            formatCurrency={formatCurrency} 
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentsPanel
            payments={payments}
            formatCurrency={formatCurrency}
            dialogOpen={paymentDialogOpen}
            setDialogOpen={setPaymentDialogOpen}
            newPayment={newPayment}
            setNewPayment={setNewPayment}
            onCreate={handleCreatePayment}
            isCreating={createPayment.isPending}
          />
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
            <AlertDialogAction onClick={handleApproveCO}>Approve</AlertDialogAction>
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
            <AlertDialogAction onClick={handleRejectCO} className="bg-destructive text-destructive-foreground">
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// STATE A: No Baseline Component
// ============================================================

function NoBaselineState({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
              No Contract Baseline
            </h3>
            <p className="text-orange-700 dark:text-orange-300 mt-1">
              Accept a proposal to establish the contract baseline and lock the billing method.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contract Setup Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Contract Setup</CardTitle>
                <CardDescription>Start by creating and accepting a proposal</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The billing system activates when you accept a proposal. This creates an immutable 
              contract baseline that locks your billing method.
            </p>
            <Link to={`/projects/${projectId}/proposals`}>
              <Button className="w-full">
                Go to Proposals <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* What Billing Includes Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <ClipboardList className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>What Billing Will Include</CardTitle>
                <CardDescription>Once a baseline is established</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <BillingFeatureItem 
                icon={<FileCheck className="w-4 h-4" />}
                title="Contract Value Tracking"
                description="Base contract + approved change orders"
              />
              <BillingFeatureItem 
                icon={<Receipt className="w-4 h-4" />}
                title="Invoice Management"
                description="Create and track invoices against the contract"
              />
              <BillingFeatureItem 
                icon={<DollarSign className="w-4 h-4" />}
                title="Payment Tracking"
                description="Record payments and track open A/R"
              />
              <BillingFeatureItem 
                icon={<TrendingUp className="w-4 h-4" />}
                title="Progress Billing"
                description="Milestone or SOV-based billing"
              />
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Empty KPI Cards (showing $0) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-50">
        <SummaryCard title="Contract Value" value="$0.00" subtitle="No baseline" icon={<FileCheck className="w-5 h-5" />} />
        <SummaryCard title="Billed to Date" value="$0.00" subtitle="0 invoices" icon={<Receipt className="w-5 h-5" />} />
        <SummaryCard title="Open A/R" value="$0.00" subtitle="—" icon={<DollarSign className="w-5 h-5" />} />
        <SummaryCard title="Remaining to Bill" value="$0.00" subtitle="—" icon={<TrendingUp className="w-5 h-5" />} />
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function BillingFeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="rounded bg-muted p-1.5 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  valueClassName = ''
}: { 
  title: string; 
  value: string; 
  subtitle: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="rounded-full bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractSummaryCard({ summary, formatCurrency }: { summary: any; formatCurrency: (v: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Summary</CardTitle>
        <CardDescription>All values derived from canonical database functions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <SummaryRow label="Base Contract" value={formatCurrency(summary?.base_contract_total)} />
          <SummaryRow 
            label={`Approved Change Orders (${summary?.approved_change_order_count ?? 0})`} 
            value={formatCurrency(summary?.approved_change_order_total)} 
          />
          {(summary?.pending_change_order_count ?? 0) > 0 && (
            <SummaryRow 
              label={`Pending Change Orders (${summary?.pending_change_order_count})`} 
              value={formatCurrency(summary?.pending_change_order_value)}
              muted
            />
          )}
          <SummaryRow 
            label="Current Contract Value" 
            value={formatCurrency(summary?.current_contract_total)} 
            highlight
          />
          <div className="h-4" />
          <SummaryRow label="Billed to Date" value={formatCurrency(summary?.billed_to_date)} valueClassName="text-blue-600" />
          <SummaryRow label="Collected" value={formatCurrency(summary?.paid_to_date)} valueClassName="text-green-600" />
          <SummaryRow label="Open A/R" value={formatCurrency(summary?.open_ar)} valueClassName="text-orange-600" />
          <SummaryRow label="Retention Held" value={formatCurrency(summary?.retention_held)} />
          <SummaryRow label="Remaining to Bill" value={formatCurrency(summary?.remaining_to_bill)} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ 
  label, 
  value, 
  highlight = false, 
  muted = false,
  valueClassName = ''
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  muted?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'bg-muted/50 px-3 -mx-3 rounded font-medium' : 'border-b'} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function BillingLinesTable({ 
  billingLines, 
  billingBasis,
  formatCurrency,
  formatPercent
}: { 
  billingLines: any[];
  billingBasis: 'payment_schedule' | 'sov';
  formatCurrency: (v: number) => string;
  formatPercent: (v: number) => string;
}) {
  const isSOV = billingBasis === 'sov';
  const title = isSOV ? 'Schedule of Values' : 'Payment Schedule Milestones';
  const description = isSOV 
    ? 'AIA G702/G703 style progress billing'
    : 'Milestone-based payment schedule';

  if (billingLines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<ClipboardList className="w-12 h-12" />}
            title={isSOV ? 'No SOV Lines' : 'No Milestones'}
            description={isSOV 
              ? 'Schedule of Values lines will appear here once defined.'
              : 'Payment milestones will appear here once defined.'}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Scheduled</TableHead>
              <TableHead className="text-right">{isSOV ? 'Billed' : 'Invoiced'}</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">% Complete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingLines.map((line, idx) => (
              <TableRow key={line.line_id}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{line.line_name}</TableCell>
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
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(billingLines.reduce((sum, l) => sum + (l.scheduled_amount || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-blue-600">
                {formatCurrency(billingLines.reduce((sum, l) => sum + (l.invoiced_amount || 0), 0))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(billingLines.reduce((sum, l) => sum + (l.remaining_amount || 0), 0))}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChangeOrdersPanel({
  changeOrders,
  formatCurrency,
  onSend,
  onApprove,
  onReject,
  dialogOpen,
  setDialogOpen,
  newCO,
  setNewCO,
  onCreate,
  isCreating,
}: {
  changeOrders: any[];
  formatCurrency: (v: number) => string;
  onSend: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  newCO: { title: string; description: string; total_amount: number };
  setNewCO: (co: any) => void;
  onCreate: () => void;
  isCreating: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
            <div>
          <CardTitle>Change Orders</CardTitle>
          <CardDescription>Only approved change orders affect contract value</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New CO</Button>
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
                  placeholder="e.g., Additional electrical work"
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
              <Button onClick={onCreate} disabled={isCreating || !newCO.title.trim()}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {changeOrders.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No Change Orders"
            description="Change orders modify the contract value when approved."
          />
        ) : (
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
                  <TableCell className="font-medium">{co.change_order_number || `CO-${idx + 1}`}</TableCell>
                  <TableCell>{co.title}</TableCell>
                  <TableCell>
                    <COStatusBadge status={co.status} />
                  </TableCell>
                  <TableCell className={`text-right font-medium ${co.total_amount < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(Number(co.total_amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <COActions
                      status={co.status}
                      approvedAt={co.approved_at}
                      onSend={() => onSend(co.id)}
                      onApprove={() => onApprove(co.id)}
                      onReject={() => onReject(co.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function COStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    rejected: 'destructive',
    void: 'destructive',
    draft: 'secondary',
    sent: 'outline',
  };
  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
}

function COActions({ 
  status, 
  approvedAt,
  onSend, 
  onApprove, 
  onReject 
}: { 
  status: string;
  approvedAt?: string;
  onSend: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (status === 'draft') {
    return (
      <Button size="sm" variant="outline" onClick={onSend}>
        <Send className="w-4 h-4 mr-1" /> Send
      </Button>
    );
  }
  if (status === 'sent') {
    return (
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onApprove}>
          <CheckCircle className="w-4 h-4 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          <XCircle className="w-4 h-4 mr-1" /> Reject
        </Button>
      </div>
    );
  }
  if (status === 'approved') {
    return (
      <span className="text-green-600 text-sm flex items-center justify-end gap-1">
        <CheckCircle className="w-4 h-4" />
        {approvedAt ? new Date(approvedAt).toLocaleDateString() : 'Approved'}
      </span>
    );
  }
  return null;
}

function InvoicesPanel({ 
  invoices, 
  billingBasis,
  formatCurrency 
}: { 
  invoices: any[];
  billingBasis: 'payment_schedule' | 'sov' | null;
  formatCurrency: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {billingBasis === 'sov' 
              ? 'Progress payment applications' 
              : 'Milestone-based invoices'}
          </CardDescription>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="No Invoices"
            description="Invoices will appear here once created."
          />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsPanel({
  payments,
  formatCurrency,
  dialogOpen,
  setDialogOpen,
  newPayment,
  setNewPayment,
  onCreate,
  isCreating,
}: {
  payments: any[];
  formatCurrency: (v: number) => string;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  newPayment: { amount: number; payment_method: string; reference_number: string; notes: string };
  setNewPayment: (p: any) => void;
  onCreate: () => void;
  isCreating: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Customer payments received</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Enter payment details</DialogDescription>
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
              <Button onClick={onCreate} disabled={isCreating || newPayment.amount <= 0}>
                {isCreating ? 'Recording...' : 'Record Payment'}
              </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-12 h-12" />}
            title="No Payments"
            description="Payments will appear here once recorded."
          />
        ) : (
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
                  <TableCell className="text-muted-foreground">{p.reference_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
        )}
        </CardContent>
      </Card>
  );
}

function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto mb-4 opacity-50">{icon}</div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}
