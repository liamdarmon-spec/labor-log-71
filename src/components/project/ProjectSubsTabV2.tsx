import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AddSubToProjectDialog } from '@/components/subs/AddSubToProjectDialog';
import { SubDetailDrawer } from '@/components/subs/SubDetailDrawer';

interface ProjectSubsTabV2Props {
  projectId: string;
}

export function ProjectSubsTabV2({ projectId }: ProjectSubsTabV2Props) {
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Fetch project subs with contract summary
  const { data: projectSubs, isLoading } = useQuery({
    queryKey: ['project-subs-v2', projectId],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('sub_contracts')
        .select(`
          *,
          subs(id, name, company_name, trade_id, trades(name))
        `)
        .eq('project_id', projectId);

      if (!contracts) return [];

      // For each contract, fetch invoices and payments
      const enriched = await Promise.all(
        contracts.map(async (contract: any) => {
          const [invoices, payments] = await Promise.all([
            supabase
              .from('sub_invoices')
              .select('total, payment_status')
              .eq('contract_id', contract.id),
            supabase
              .from('sub_payments')
              .select('amount_paid, retention_released')
              .eq('project_subcontract_id', contract.id)
          ]);

          const totalInvoiced = invoices.data?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
          const unpaidInvoices = invoices.data?.filter(inv => inv.payment_status !== 'paid').length || 0;
          const totalPaid = payments.data?.reduce((sum, pay) => sum + Number(pay.amount_paid), 0) || 0;
          const retentionReleased = payments.data?.reduce((sum, pay) => sum + Number(pay.retention_released || 0), 0) || 0;

          const balanceToFinish = Number(contract.contract_value) - totalInvoiced;
          const retentionHeld = Number(contract.retention_held || 0);
          
          let status: 'good' | 'overbilled' | 'underbilled' = 'good';
          if (totalInvoiced > Number(contract.contract_value)) {
            status = 'overbilled';
          } else if (totalInvoiced > 0 && totalInvoiced < Number(contract.contract_value) * 0.5) {
            status = 'underbilled';
          }

          return {
            ...contract,
            sub: contract.subs,
            totalInvoiced,
            unpaidInvoices,
            totalPaid,
            retentionHeld,
            retentionReleased,
            balanceToFinish,
            status,
            invoiceCount: invoices.data?.length || 0,
          };
        })
      );

      return enriched;
    },
  });

  // Calculate summary totals
  const totalContracted = projectSubs?.reduce((sum, s) => sum + Number(s.contract_value), 0) || 0;
  const totalInvoiced = projectSubs?.reduce((sum, s) => sum + s.totalInvoiced, 0) || 0;
  const totalPaid = projectSubs?.reduce((sum, s) => sum + s.totalPaid, 0) || 0;
  const totalRetention = projectSubs?.reduce((sum, s) => sum + s.retentionHeld, 0) || 0;
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Subcontractors</h2>
            <p className="text-muted-foreground">Manage subcontract agreements and payments</p>
          </div>
          <Button onClick={() => setAddSubOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subcontractor
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Contracted</div>
              <div className="text-2xl font-bold">${totalContracted.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Invoiced</div>
              <div className="text-2xl font-bold text-blue-600">${totalInvoiced.toLocaleString()}</div>
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
        </div>

        {/* Subcontract Ledger */}
        <Card>
          <CardHeader>
            <CardTitle>Subcontract Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {projectSubs && projectSubs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subcontractor</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead className="text-right">Contract</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSubs.map((sub: any) => (
                    <TableRow 
                      key={sub.id} 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => {
                        setSelectedSubId(sub.sub.id);
                        setSelectedContractId(sub.id);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="font-medium">{sub.sub.name}</div>
                            {sub.sub.company_name && (
                              <div className="text-xs text-muted-foreground">{sub.sub.company_name}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.sub.trades?.name}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(sub.contract_value).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">${sub.totalInvoiced.toLocaleString()}</div>
                          {sub.invoiceCount > 0 && (
                            <div className="text-xs text-muted-foreground">{sub.invoiceCount} invoice(s)</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ${sub.totalPaid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        ${sub.retentionHeld.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${sub.balanceToFinish.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {sub.status === 'good' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Good
                          </Badge>
                        ) : sub.status === 'overbilled' ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Over
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                            <Minus className="h-3 w-3 mr-1" />
                            Under
                          </Badge>
                        )}
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
    </>
  );
}
