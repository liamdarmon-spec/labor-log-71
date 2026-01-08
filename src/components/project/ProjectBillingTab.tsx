// Project Billing Hub - Read-Only Financial Cockpit
// ============================================================
//
// UI SMOKE TEST CHECKLIST:
// □ "Billing Basis" shows correct value even if baseline missing
// □ Missing baseline: shows orange warning with clear CTA to proposals
// □ Approved but misconfigured billing: shows red banner (if detected via checks)
// □ Invoice creation dialog works for standalone (without baseline)
// □ Invoice creation for milestone/SOV blocked with helpful message if baseline missing
// □ Change Orders list links to /app/change-orders
// □ Payments and invoices display correctly
//
// Big 3: Canonical, Security, Performance
//
// HARD RULES:
// 1. Billing is EXECUTION ONLY (read-only structure, invoice creation only)
// 2. Change Orders are authored ELSEWHERE (this page only reflects impact)
// 3. Nothing is free-form - every number traces to a source
// 4. Billing basis is LOCKED at contract baseline
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  DollarSign, 
  Receipt, 
  ClipboardList, 
  TrendingUp,
  Lock,
  ArrowRight,
  FileCheck,
  CreditCard,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  useBillingSummary,
  useBillingLines,
  useChangeOrders,
  useInvoices,
  useCustomerPayments,
  useCreateCustomerPayment,
  useCreateInvoiceFromSource,
} from '@/hooks/useBillingHub';
import { toast } from 'sonner';

interface ProjectBillingTabProps {
  projectId: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProjectBillingTab({ projectId }: ProjectBillingTabProps) {
  // CANONICAL: Single source of truth
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(projectId);
  const { data: billingLines = [] } = useBillingLines(projectId);
  const { data: changeOrders = [] } = useChangeOrders(projectId);
  const { data: invoices = [] } = useInvoices(projectId);
  const { data: payments = [] } = useCustomerPayments(projectId);

  // Mutations (ONLY payment recording allowed on this page)
  const createPayment = useCreateCustomerPayment();
  const createInvoice = useCreateInvoiceFromSource();

  // UI State
  const hasBaseline = summary?.has_contract_baseline ?? false;
  const billingBasis = summary?.billing_basis as 'payment_schedule' | 'sov' | null;

  const getDefaultTab = () => {
    if (!hasBaseline) return 'summary';
    if (billingBasis === 'sov') return 'sov';
    return 'milestones';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_method: 'check', reference_number: '' });

  useEffect(() => {
    if (!summaryLoading) {
      setActiveTab(getDefaultTab());
    }
  }, [hasBaseline, billingBasis, summaryLoading]);

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  const formatPercent = (value: number | null | undefined) => {
    return `${(value ?? 0).toFixed(1)}%`;
  };

  const handleCreatePayment = () => {
    if (newPayment.amount <= 0) return;
    createPayment.mutate({
      project_id: projectId,
      payment_date: new Date().toISOString().split('T')[0],
      applied_to_retention: 0,
      notes: '',
      ...newPayment,
    });
    setPaymentDialogOpen(false);
    setNewPayment({ amount: 0, payment_method: 'check', reference_number: '' });
  };

  // Loading
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
  // NOTE: Standalone invoices must still be allowed without a baseline, so we
  // render the full shell even when baseline is missing.

  // ============================================================
  // STATE B & C: Has Baseline (Billing Active)
  // ============================================================
  const approvedCOs = changeOrders.filter(co => co.status === 'approved');
  const pendingCOs = changeOrders.filter(co => co.status === 'sent' || co.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Contract Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Billing Basis:{' '}
              {!billingBasis
                ? 'Not set'
                : billingBasis === 'sov'
                  ? 'Schedule of Values'
                  : 'Payment Schedule'}
            </span>
            {hasBaseline ? (
            <Badge variant="secondary" className="text-xs">Locked</Badge>
            ) : billingBasis ? (
              <Badge variant="outline" className="text-xs">Pending Baseline</Badge>
            ) : null}
          </div>
        </div>
        <Button onClick={() => setInvoiceDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </div>

      {!hasBaseline && !billingBasis && (
        <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
                Billing not configured
              </h3>
              <p className="text-orange-700 dark:text-orange-300 mt-2 text-sm">
                Set up billing from an accepted proposal to enable progress invoicing. You can create standalone invoices in the meantime.
              </p>
              <div className="mt-4 flex gap-2">
                <Link to={`/app/projects/${projectId}?tab=proposals`}>
                  <Button variant="outline" size="sm">
                    View Proposals <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasBaseline && billingBasis && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                Contract baseline pending
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mt-2 text-sm">
                Billing basis is set to <strong>{billingBasis === 'sov' ? 'Schedule of Values' : 'Payment Schedule'}</strong>, but the contract baseline hasn't been created yet. 
                Approve a proposal to enable progress/SOV invoicing.
              </p>
              <div className="mt-4 flex gap-2">
                <Link to={`/app/projects/${projectId}?tab=proposals`}>
                  <Button variant="outline" size="sm">
                    View Proposals <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards - ALL from canonical function */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Contract Value"
          value={formatCurrency(summary?.current_contract_total)}
          breakdown={`Base: ${formatCurrency(summary?.base_contract_total)} + COs: ${formatCurrency(summary?.approved_change_order_total)}`}
          icon={<FileCheck className="w-5 h-5" />}
        />
        <KPICard
          title="Billed to Date"
          value={formatCurrency(summary?.billed_to_date)}
          breakdown={`${summary?.invoice_count ?? 0} invoices`}
          icon={<Receipt className="w-5 h-5" />}
          valueClassName="text-blue-600"
        />
        <KPICard
          title="Open A/R"
          value={formatCurrency(summary?.open_ar)}
          breakdown={`Collected: ${formatCurrency(summary?.paid_to_date)}`}
          icon={<DollarSign className="w-5 h-5" />}
          valueClassName="text-orange-600"
        />
        <KPICard
          title="Remaining to Bill"
          value={formatCurrency(summary?.remaining_to_bill)}
          breakdown={`Retention: ${formatCurrency(summary?.retention_held)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          valueClassName="text-green-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {hasBaseline && (billingBasis === 'sov' ? (
            <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
          ) : (
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          ))}
          <TabsTrigger value="change-orders" className="gap-2">
            Change Orders
            {pendingCOs.length > 0 && (
              <Badge variant="outline" className="text-xs">{pendingCOs.length} pending</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <ContractSummaryPanel summary={summary} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <BillingStructurePanel
            billingLines={billingLines}
            billingBasis="payment_schedule"
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        </TabsContent>

        {/* SOV Tab */}
        <TabsContent value="sov">
          <BillingStructurePanel
            billingLines={billingLines}
            billingBasis="sov"
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        </TabsContent>

        {/* Change Orders Tab (READ-ONLY REFLECTION) */}
        <TabsContent value="change-orders">
          <ChangeOrdersReflection
            changeOrders={changeOrders}
            projectId={projectId}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <InvoicesPanel
            invoices={invoices}
            billingBasis={billingBasis}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <PaymentsPanel
            payments={payments}
            formatCurrency={formatCurrency}
            onRecordPayment={() => setPaymentDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment received from the client</DialogDescription>
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
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePayment} disabled={createPayment.isPending || newPayment.amount <= 0}>
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Creation Dialog */}
      <InvoiceCreationDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        projectId={projectId}
        billingBasis={billingBasis}
        billingLines={billingLines}
        changeOrders={approvedCOs}
        formatCurrency={formatCurrency}
        hasBaseline={hasBaseline}
        isCreating={createInvoice.isPending}
        onCreate={async (params) => {
          try {
            await createInvoice.mutateAsync({ projectId, ...params });
            setInvoiceDialogOpen(false);
          } catch (err: any) {
            // Hook already toasts; keep dialog open for visible failure state.
            console.error('Invoice create failed:', err);
          }
        }}
      />
    </div>
  );
}

// ============================================================
// STATE A: No Baseline
// ============================================================

function NoBaselineState({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      {/* Blocking Banner */}
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-8">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
              Billing isn't active yet
            </h3>
            <p className="text-orange-700 dark:text-orange-300 mt-2">
              Accept a proposal to establish the contract baseline and lock the billing method.
              Once established, you'll be able to create invoices and track payments.
            </p>
            <div className="mt-4">
              <Link to={`/app/projects/${projectId}`}>
                <Button>
                  View Proposals <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* What Billing Will Include */}
      <Card>
        <CardHeader>
          <CardTitle>What Billing Will Include</CardTitle>
          <CardDescription>Once a contract baseline is established</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <FeaturePreview
              icon={<FileCheck />}
              title="Contract Value Tracking"
              description="Base contract + approved change orders = current contract total"
            />
            <FeaturePreview
              icon={<ClipboardList />}
              title="Billing Structure"
              description="Either Payment Schedule (milestones) or Schedule of Values (AIA style)"
            />
            <FeaturePreview
              icon={<Receipt />}
              title="Invoice Management"
              description="Create invoices against milestones, SOV periods, or change orders"
            />
            <FeaturePreview
              icon={<DollarSign />}
              title="Payment Tracking"
              description="Record payments and track open accounts receivable"
            />
          </div>
        </CardContent>
      </Card>

      {/* Disabled KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-40 pointer-events-none">
        <KPICard title="Contract Value" value="$0.00" breakdown="No baseline" icon={<FileCheck className="w-5 h-5" />} />
        <KPICard title="Billed to Date" value="$0.00" breakdown="—" icon={<Receipt className="w-5 h-5" />} />
        <KPICard title="Open A/R" value="$0.00" breakdown="—" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard title="Remaining to Bill" value="$0.00" breakdown="—" icon={<TrendingUp className="w-5 h-5" />} />
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function FeaturePreview({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="rounded-lg bg-muted p-2 h-fit text-muted-foreground">{icon}</div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function KPICard({ title, value, breakdown, icon, valueClassName = '' }: {
  title: string;
  value: string;
  breakdown: string;
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
            <p className="text-xs text-muted-foreground mt-1">{breakdown}</p>
          </div>
          <div className="rounded-full bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractSummaryPanel({ summary, formatCurrency }: { summary: any; formatCurrency: (v: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Summary</CardTitle>
        <CardDescription>All values derived from canonical database functions — no client-side math</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <SummaryRow label="Base Contract Value" value={formatCurrency(summary?.base_contract_total)} />
          <SummaryRow 
            label={`Approved Change Orders (${summary?.approved_change_order_count ?? 0})`} 
            value={formatCurrency(summary?.approved_change_order_total)} 
          />
          <SummaryRow 
            label="Current Contract Total" 
            value={formatCurrency(summary?.current_contract_total)} 
            highlight
          />
        </div>
        <div className="border-t pt-4 grid gap-3">
          <SummaryRow label="Billed to Date" value={formatCurrency(summary?.billed_to_date)} valueClassName="text-blue-600" />
          <SummaryRow label="Paid to Date" value={formatCurrency(summary?.paid_to_date)} valueClassName="text-green-600" />
          <SummaryRow label="Open A/R" value={formatCurrency(summary?.open_ar)} valueClassName="text-orange-600" />
          <SummaryRow label="Retention Held" value={formatCurrency(summary?.retention_held)} />
          <SummaryRow label="Remaining to Bill" value={formatCurrency(summary?.remaining_to_bill)} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, highlight = false, valueClassName = '' }: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'bg-muted/50 px-3 -mx-3 rounded' : ''}`}>
      <span className={highlight ? 'font-medium' : ''}>{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function BillingStructurePanel({ billingLines, billingBasis, formatCurrency, formatPercent }: {
  billingLines: any[];
  billingBasis: 'payment_schedule' | 'sov';
  formatCurrency: (v: number) => string;
  formatPercent: (v: number) => string;
}) {
  const isSOV = billingBasis === 'sov';
  const title = isSOV ? 'Schedule of Values' : 'Payment Schedule';
  const description = isSOV 
    ? 'AIA G702/G703 style progress billing — read-only structure'
    : 'Milestone-based payment schedule — read-only structure';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline"><Lock className="w-3 h-3 mr-1" /> Structure Locked</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {billingLines.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-12 h-12" />}
            title={isSOV ? 'No SOV Lines Defined' : 'No Milestones Defined'}
            description="The billing structure will appear once items are added to the contract baseline."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
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
        )}
      </CardContent>
    </Card>
  );
}

function ChangeOrdersReflection({ changeOrders, projectId, formatCurrency }: {
  changeOrders: any[];
  projectId: string;
  formatCurrency: (v: number) => string;
}) {
  const approved = changeOrders.filter(co => co.status === 'approved');
  const pending = changeOrders.filter(co => co.status === 'sent' || co.status === 'draft');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Change Orders</CardTitle>
            <CardDescription>
              Approved COs affect contract value — manage COs from the Change Orders module
            </CardDescription>
          </div>
          <Link to={`/app/change-orders?projectId=${projectId}`}>
            <Button variant="outline" size="sm">
              Manage COs <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
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
                <TableHead className="text-right">Impact</TableHead>
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
                    {co.status === 'approved' ? (
                      <span className="text-green-600 text-sm">Affects Contract</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Pending</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3}>Approved Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(approved.reduce((sum, co) => sum + Number(co.total_amount), 0))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function COStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    approved: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
    sent: { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
    draft: { variant: 'secondary', icon: null },
    rejected: { variant: 'destructive', icon: null },
    void: { variant: 'destructive', icon: null },
  };
  const c = config[status] || { variant: 'secondary', icon: null };
  return (
    <Badge variant={c.variant} className="gap-1">
      {c.icon} {status}
    </Badge>
  );
}

function InvoicesPanel({ invoices, billingBasis, formatCurrency }: {
  invoices: any[];
  billingBasis: 'payment_schedule' | 'sov' | null;
  formatCurrency: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>
          {billingBasis === 'sov' ? 'Progress payment applications' : 'Milestone-based invoices'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="No Invoices"
            description="Create an invoice to bill against the contract."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number || 'Draft'}</TableCell>
                  <TableCell>{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {inv.source_type || (inv.sov_based ? 'SOV' : 'Standard')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
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

function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    paid: 'default',
    sent: 'outline',
    draft: 'secondary',
    void: 'destructive',
  };
  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
}

function PaymentsPanel({ payments, formatCurrency, onRecordPayment }: {
  payments: any[];
  formatCurrency: (v: number) => string;
  onRecordPayment: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Customer payments received</CardDescription>
        </div>
        <Button onClick={onRecordPayment}>
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-12 h-12" />}
            title="No Payments Recorded"
            description="Payments will appear here once recorded."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.payment_method || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.reference_number || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(Number(p.amount))}
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

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto mb-4 opacity-50">{icon}</div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}

// ============================================================
// INVOICE CREATION DIALOG
// Every invoice must have a source - no free-form billing
// ============================================================

function InvoiceCreationDialog({ open, onOpenChange, projectId, billingBasis, billingLines, changeOrders, formatCurrency, hasBaseline, isCreating, onCreate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  billingBasis: 'payment_schedule' | 'sov' | null;
  billingLines: any[];
  changeOrders: any[];
  formatCurrency: (v: number) => string;
  hasBaseline: boolean;
  isCreating: boolean;
  onCreate: (params: {
    sourceType: 'milestone' | 'sov_period' | 'change_order' | 'deposit' | 'manual';
    sourceId?: string;
    amount?: number;
    milestoneAllocations?: Array<{ milestone_id: string; amount: number }>;
    sovLines?: Array<{ sov_line_id: string; this_period_amount: number }>;
    notes?: string;
    billingPeriodFrom?: string;
    billingPeriodTo?: string;
  }) => Promise<void>;
}) {
  const [invoiceType, setInvoiceType] = useState<'progress' | 'change_order' | 'deposit' | 'standalone'>(
    hasBaseline ? 'progress' : 'standalone'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<any>(null);

  const [milestoneAmounts, setMilestoneAmounts] = useState<Record<string, number>>({});
  const [sovAmounts, setSovAmounts] = useState<Record<string, number>>({});
  const [selectedCoId, setSelectedCoId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setError(null);
      setNotes('');
      setMilestoneAmounts({});
      setSovAmounts({});
      setSelectedCoId('');
      setAmount(0);
      setInvoiceType(hasBaseline ? 'progress' : 'standalone');
    }
  }, [open, hasBaseline]);

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      toast.success('Copied error');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCreate = async () => {
    setError(null);
    try {
      if (isCreating) return;
      if (invoiceType === 'standalone') {
        if (!amount || amount <= 0) throw new Error('Amount is required');
        await onCreate({ sourceType: 'manual', amount, notes: notes || undefined });
        return;
      }

      if (!hasBaseline) {
        throw new Error('Progress/SOV/CO invoices require a contract baseline');
      }

      if (invoiceType === 'progress') {
        if (billingBasis === 'payment_schedule') {
          const allocations = billingLines
            .map((l) => ({
              milestone_id: String(l.line_id),
              amount: Number(milestoneAmounts[String(l.line_id)] || 0),
            }))
            .filter((a) => a.amount > 0);
          if (allocations.length === 0) throw new Error('Select at least one milestone amount');
          await onCreate({ sourceType: 'milestone', milestoneAllocations: allocations, notes: notes || undefined });
          return;
        }
        if (billingBasis === 'sov') {
          const sovLinesPayload = billingLines
            .map((l) => ({
              sov_line_id: String(l.line_id),
              this_period_amount: Number(sovAmounts[String(l.line_id)] || 0),
            }))
            .filter((a) => a.this_period_amount > 0);
          if (sovLinesPayload.length === 0) throw new Error('Enter at least one “this period” amount');
          await onCreate({ sourceType: 'sov_period', sovLines: sovLinesPayload, notes: notes || undefined });
          return;
        }
        throw new Error('Billing basis not configured');
      }

      if (invoiceType === 'change_order') {
        if (!selectedCoId) throw new Error('Select a change order');
        const amt = amount && amount > 0 ? amount : undefined;
        await onCreate({ sourceType: 'change_order', sourceId: selectedCoId, amount: amt, notes: notes || undefined });
        return;
      }

      if (invoiceType === 'deposit') {
        if (!amount || amount <= 0) throw new Error('Deposit amount is required');
        await onCreate({ sourceType: 'deposit', amount, notes: notes || undefined });
        return;
      }
    } catch (e: any) {
      setError(e);
      throw e;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Every invoice must reference a billing source — no free-form invoicing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">
                  {billingBasis === 'sov' ? 'Progress Payment (SOV Period)' : 'Progress Payment (Milestones)'}
                </SelectItem>
                <SelectItem value="change_order" disabled={changeOrders.length === 0}>
                  Change Order Invoice {changeOrders.length === 0 && '(none available)'}
                </SelectItem>
                <SelectItem value="deposit">Deposit / Retainer</SelectItem>
                <SelectItem value="standalone">Standalone Invoice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!hasBaseline && invoiceType !== 'standalone' && (
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              Progress/SOV/Change Order invoices require a contract baseline. Create a standalone invoice instead.
            </div>
          )}

          {invoiceType === 'progress' && hasBaseline && billingBasis === 'payment_schedule' && (
            <div className="space-y-2">
              <Label>Milestones (enter amounts to bill)</Label>
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Milestone</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right w-40">This Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingLines.map((l) => (
                      <TableRow key={l.line_id}>
                        <TableCell className="font-medium">{l.line_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(l.remaining_amount || 0))}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={milestoneAmounts[String(l.line_id)] ?? ''}
                            onChange={(e) =>
                              setMilestoneAmounts((prev) => ({
                                ...prev,
                                [String(l.line_id)]: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {invoiceType === 'progress' && hasBaseline && billingBasis === 'sov' && (
            <div className="space-y-2">
              <Label>SOV Lines (enter “this period” amounts)</Label>
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right w-40">This Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingLines.map((l) => (
                      <TableRow key={l.line_id}>
                        <TableCell className="font-medium">{l.line_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(l.remaining_amount || 0))}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={sovAmounts[String(l.line_id)] ?? ''}
                            onChange={(e) =>
                              setSovAmounts((prev) => ({
                                ...prev,
                                [String(l.line_id)]: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {invoiceType === 'change_order' && hasBaseline && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Change Order</Label>
                <Select value={selectedCoId} onValueChange={setSelectedCoId}>
                  <SelectTrigger><SelectValue placeholder="Select change order" /></SelectTrigger>
                  <SelectContent>
                    {changeOrders.map((co) => (
                      <SelectItem key={co.id} value={co.id}>
                        {co.change_order_number || co.title} ({formatCurrency(Number(co.total_amount || 0))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value || 0))}
                  placeholder="Leave blank to invoice remaining CO balance"
                />
              </div>
            </div>
          )}

          {(invoiceType === 'deposit' || invoiceType === 'standalone') && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value || 0))}
              />
            {invoiceType === 'deposit' && (
                <p className="text-xs text-muted-foreground">
                  Deposit invoices require a baseline in this system and do not affect contract value.
                </p>
              )}
              {invoiceType === 'standalone' && (
                <p className="text-xs text-muted-foreground">
                  Standalone invoices are always allowed and do not depend on the contract baseline.
                </p>
            )}
          </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-destructive">Save failed</div>
                <Button variant="outline" size="sm" onClick={copyError}>
                  Copy error
                </Button>
              </div>
              <div className="mt-2 text-muted-foreground break-words">
                {String((error as any)?.message || error)}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
