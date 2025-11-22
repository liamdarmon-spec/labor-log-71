import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Plus, TrendingUp, TrendingDown, Minus, FileText } from 'lucide-react';
import { AddSubToProjectDialog } from '@/components/subs/AddSubToProjectDialog';
import { SubDetailDrawer } from '@/components/subs/SubDetailDrawer';
import { SubsScheduleSection } from './SubsScheduleSection';
import { format } from 'date-fns';
import { AddSubInvoiceDialog } from '@/components/subs/AddSubInvoiceDialog';

interface ProjectSubsTabV3Props {
  projectId: string;
}

export function ProjectSubsTabV3({ projectId }: ProjectSubsTabV3Props) {
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [invoiceContractData, setInvoiceContractData] = useState<any>(null);

  // Fetch project subs via sub_contract_summary view
  const { data: projectSubs, isLoading } = useQuery({
    queryKey: ['project-subs-v3', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contract_summary')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all invoices for this project
  const { data: allInvoices } = useQuery({
    queryKey: ['project-sub-invoices', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_invoices')
        .select(`
          *,
          subs(name, company_name)
        `)
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary totals
  const totalContracted = projectSubs?.reduce((sum, s) => sum + Number(s.contract_value), 0) || 0;
  const totalBilled = projectSubs?.reduce((sum, s) => sum + Number(s.total_billed), 0) || 0;
  const totalPaid = projectSubs?.reduce((sum, s) => sum + Number(s.total_paid), 0) || 0;
  const totalRetention = projectSubs?.reduce((sum, s) => sum + Number(s.total_retention_held), 0) || 0;
  const totalRemaining = projectSubs?.reduce((sum, s) => sum + Number(s.remaining_to_bill), 0) || 0;

  const handleAddInvoice = (contract: any) => {
    setInvoiceContractData(contract);
    setAddInvoiceOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Subcontractors</h2>
            <p className="text-muted-foreground">Manage contracts, schedule, and invoices</p>
          </div>
          <Button onClick={() => setAddSubOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subcontractor
          </Button>
        </div>

        {/* SECTION 1: SUB ROSTER & CONTRACTS */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Sub Roster & Contracts</h3>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Contracted</div>
                <div className="text-2xl font-bold">${totalContracted.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Billed</div>
                <div className="text-2xl font-bold text-blue-600">${totalBilled.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Retention Held</div>
                <div className="text-2xl font-bold text-orange-600">${totalRetention.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Remaining to Bill</div>
                <div className="text-2xl font-bold">${totalRemaining.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Roster Table */}
          <Card>
            <CardContent className="pt-6">
              {projectSubs && projectSubs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead className="text-right">Contract Value</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectSubs.map((sub: any) => (
                      <TableRow 
                        key={sub.contract_id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setSelectedSubId(sub.sub_id);
                          setSelectedContractId(sub.contract_id);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-purple-600" />
                            <div>
                              <div className="font-medium">{sub.sub_name}</div>
                              {sub.company_name && (
                                <div className="text-xs text-muted-foreground">{sub.company_name}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.trade}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(sub.contract_value).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          ${Number(sub.total_billed).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          ${Number(sub.total_paid).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          ${Number(sub.total_retention_held).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${Number(sub.remaining_to_bill).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={Number(sub.outstanding_balance) > 0 ? 'font-bold text-orange-600' : ''}>
                            ${Number(sub.outstanding_balance).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddInvoice(sub);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No subcontractors on this project</p>
                  <p className="text-sm">Add a subcontractor to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: SUB SCHEDULE */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Sub Schedule</h3>
          <SubsScheduleSection projectId={projectId} />
        </div>

        {/* SECTION 3: INVOICES & PAYMENTS */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Invoices & Payments</h3>
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              {allInvoices && allInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.subs?.name}</div>
                          {invoice.subs?.company_name && (
                            <div className="text-xs text-muted-foreground">{invoice.subs.company_name}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{invoice.invoice_number || '—'}</TableCell>
                        <TableCell className="max-w-xs truncate">{invoice.notes || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(invoice.total).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          ${Number(invoice.retention_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {invoice.payment_status === 'paid' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                          ) : invoice.payment_status === 'approved' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Approved</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No invoices submitted yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddSubToProjectDialog
        open={addSubOpen}
        onOpenChange={setAddSubOpen}
        projectId={projectId}
      />

      {selectedSubId && (
        <SubDetailDrawer
          open={!!selectedSubId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSubId(null);
              setSelectedContractId(null);
            }
          }}
          subId={selectedSubId}
          projectId={projectId}
          contractId={selectedContractId || undefined}
        />
      )}

      {invoiceContractData && (
        <AddSubInvoiceDialog
          open={addInvoiceOpen}
          onOpenChange={setAddInvoiceOpen}
          contractId={invoiceContractData.contract_id}
          projectId={projectId}
          subId={invoiceContractData.sub_id}
          retentionPercentage={invoiceContractData.retention_percentage || 10}
        />
      )}
    </>
  );
}
