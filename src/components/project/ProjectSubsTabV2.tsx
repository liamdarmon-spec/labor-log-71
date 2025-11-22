import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hammer, Plus, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AddSubToProjectDialog } from '@/components/subs/AddSubToProjectDialog';
import { AddSubInvoiceDialog } from '@/components/subs/AddSubInvoiceDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ProjectSubsTabV2Props {
  projectId: string;
}

export function ProjectSubsTabV2({ projectId }: ProjectSubsTabV2Props) {
  const [addSubDialogOpen, setAddSubDialogOpen] = useState(false);
  const [addInvoiceDialogOpen, setAddInvoiceDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch contract summaries
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['sub-contract-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contract_summary')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices for expanded rows
  const { data: allInvoices } = useQuery({
    queryKey: ['sub-invoices', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: expandedRows.size > 0,
  });

  // Fetch payments
  const { data: allPayments } = useQuery({
    queryKey: ['sub-payments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_payments')
        .select('*, sub_invoices(invoice_number)')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: expandedRows.size > 0,
  });

  const toggleRow = (contractId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };

  const handleAddInvoice = (contract: any) => {
    setSelectedContract(contract);
    setAddInvoiceDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalContractValue = contracts?.reduce((sum, c) => sum + (c.contract_value || 0), 0) || 0;
  const totalPaid = contracts?.reduce((sum, c) => sum + (c.total_paid || 0), 0) || 0;
  const totalRetention = contracts?.reduce((sum, c) => sum + (c.total_retention_held || 0), 0) || 0;
  const totalOutstanding = contracts?.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0) || 0;
  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Subs on Project</p>
            </div>
            <p className="text-2xl font-bold">{contracts?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Contract Value</p>
            </div>
            <p className="text-2xl font-bold">${totalContractValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Paid to Subs</p>
            </div>
            <p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-muted-foreground">Retention Held</p>
            </div>
            <p className="text-2xl font-bold">${totalRetention.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Subcontractors
            </CardTitle>
            <Button onClick={() => setAddSubDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Subcontractor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!contracts || contracts.length === 0 ? (
            <div className="text-center py-12">
              <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No subcontractors added yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add subcontractors to track contracts, invoices, and payments
              </p>
              <Button onClick={() => setAddSubDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Subcontractor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">Contract Value</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const isExpanded = expandedRows.has(contract.contract_id);
                  const contractInvoices = allInvoices?.filter(inv => inv.contract_id === contract.contract_id) || [];
                  const contractPayments = allPayments?.filter(pay => pay.project_subcontract_id === contract.contract_id) || [];

                  return (
                    <>
                      <TableRow key={contract.contract_id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild onClick={() => toggleRow(contract.contract_id)}>
                            <Button variant="ghost" size="sm">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {contract.sub_name}
                            {contract.company_name && (
                              <div className="text-xs text-muted-foreground">{contract.company_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contract.trade || '-'}</TableCell>
                        <TableCell className="text-right">${contract.contract_value?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">${contract.total_billed?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">${contract.total_paid?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right text-amber-600">
                          ${(contract.total_retention_held - contract.total_retention_released)?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${contract.outstanding_balance?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddInvoice(contract);
                            }}
                          >
                            Add Invoice
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              {/* Invoices Section */}
                              <div>
                                <h4 className="font-semibold mb-2">Invoices</h4>
                                {contractInvoices.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Retention</TableHead>
                                        <TableHead className="text-right">Payable</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {contractInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                          <TableCell>{invoice.invoice_number || '-'}</TableCell>
                                          <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                                          <TableCell className="text-right">${invoice.total?.toLocaleString()}</TableCell>
                                          <TableCell className="text-right text-amber-600">
                                            ${invoice.retention_amount?.toLocaleString() || 0}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            ${(invoice.total - (invoice.retention_amount || 0))?.toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                                              {invoice.payment_status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>

                              {/* Payments Section */}
                              <div>
                                <h4 className="font-semibold mb-2">Payments</h4>
                                {contractPayments.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No payments yet</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead className="text-right">Amount Paid</TableHead>
                                        <TableHead className="text-right">Retention Released</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {contractPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                          <TableCell>{(payment as any).sub_invoices?.invoice_number || '-'}</TableCell>
                                          <TableCell className="text-right">${payment.amount_paid?.toLocaleString()}</TableCell>
                                          <TableCell className="text-right">
                                            ${payment.retention_released?.toLocaleString() || 0}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddSubToProjectDialog
        open={addSubDialogOpen}
        onOpenChange={setAddSubDialogOpen}
        projectId={projectId}
      />

      {selectedContract && (
        <AddSubInvoiceDialog
          open={addInvoiceDialogOpen}
          onOpenChange={setAddInvoiceDialogOpen}
          contractId={selectedContract.contract_id}
          projectId={projectId}
          subId={selectedContract.sub_id}
          retentionPercentage={selectedContract.retention_percentage || 0}
        />
      )}
    </div>
  );
}
