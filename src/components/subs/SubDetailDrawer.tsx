import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Building2, FileText, DollarSign, Calendar, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { AddSubInvoiceDialog } from './AddSubInvoiceDialog';
import { useState } from 'react';

interface SubDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subId: string;
  projectId: string;
  contractId?: string;
}

export function SubDetailDrawer({
  open,
  onOpenChange,
  subId,
  projectId,
  contractId
}: SubDetailDrawerProps) {
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);

  // Fetch sub details
  const { data: sub } = useQuery({
    queryKey: ['sub-detail', subId],
    queryFn: async () => {
      const { data } = await supabase
        .from('subs')
        .select('*, trades(name)')
        .eq('id', subId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Fetch contract details
  const { data: contract } = useQuery({
    queryKey: ['sub-contract-detail', contractId || subId, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sub_contracts')
        .select('*')
        .eq('sub_id', subId)
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Fetch invoices
  const { data: invoices } = useQuery({
    queryKey: ['sub-invoices', subId, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sub_invoices')
        .select('*')
        .eq('sub_id', subId)
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  // Fetch payments
  const { data: payments } = useQuery({
    queryKey: ['sub-payments', contractId || subId],
    queryFn: async () => {
      if (!contract?.id) return [];
      const { data } = await supabase
        .from('sub_payments')
        .select('*')
        .eq('project_subcontract_id', contract.id)
        .order('payment_date', { ascending: false });
      return data || [];
    },
    enabled: open && !!contract?.id,
  });

  // Fetch schedule
  const { data: schedule } = useQuery({
    queryKey: ['sub-schedule-detail', subId, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sub_scheduled_shifts')
        .select('*')
        .eq('sub_id', subId)
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const totalInvoiced = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
  const totalPaid = payments?.reduce((sum, pay) => sum + Number(pay.amount_paid), 0) || 0;
  const retentionHeld = contract?.retention_held || 0;
  const outstanding = totalInvoiced - totalPaid;

  if (!sub) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {sub.name}
            </SheetTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{sub.trades?.name}</Badge>
              {sub.company_name && <span>• {sub.company_name}</span>}
            </div>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Contract Value</div>
                  <div className="text-2xl font-bold">${(contract?.contract_value || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Invoiced</div>
                  <div className="text-2xl font-bold text-blue-600">${totalInvoiced.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Paid</div>
                  <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
                  <div className={`text-2xl font-bold ${outstanding > 0 ? 'text-orange-600' : ''}`}>
                    ${outstanding.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="contract">Contract</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              {/* CONTRACT TAB */}
              <TabsContent value="contract" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contract Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contract ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Contract Value</span>
                          <span className="font-semibold">${contract.contract_value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Retention %</span>
                          <span className="font-semibold">{contract.retention_percentage || 0}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Retention Held</span>
                          <span className="font-semibold">${retentionHeld.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Terms</span>
                          <span>{contract.payment_terms || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                            {contract.status}
                          </Badge>
                        </div>
                        {contract.description && (
                          <>
                            <Separator />
                            <div>
                              <div className="text-sm font-medium mb-1">Description</div>
                              <p className="text-sm text-muted-foreground">{contract.description}</p>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No contract found for this project</p>
                        <Button variant="outline" size="sm" className="mt-3">
                          Create Contract
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* INVOICES TAB */}
              <TabsContent value="invoices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Invoices</CardTitle>
                      <Button size="sm" onClick={() => setAddInvoiceOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Invoice
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {invoices.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map(inv => (
                            <TableRow key={inv.id}>
                              <TableCell>{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell className="font-medium">{inv.invoice_number || 'N/A'}</TableCell>
                              <TableCell className="text-right">${Number(inv.total).toLocaleString()}</TableCell>
                              <TableCell>
                                {inv.payment_status === 'paid' ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No invoices yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PAYMENTS TAB */}
              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Retention Released</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map(payment => (
                            <TableRow key={payment.id}>
                              <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell className="text-right font-semibold">
                                ${Number(payment.amount_paid).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {payment.retention_released ? (
                                  <span className="text-sm text-green-600">${Number(payment.retention_released).toLocaleString()}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No payments yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SCHEDULE TAB */}
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scheduled Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {schedule.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedule.map(shift => (
                            <TableRow key={shift.id}>
                              <TableCell>{format(new Date(shift.scheduled_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{shift.scheduled_hours || 8}h</TableCell>
                              <TableCell>
                                <Badge variant="outline">{shift.status || 'planned'}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No scheduled days</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {contract?.id && (
        <AddSubInvoiceDialog
          open={addInvoiceOpen}
          onOpenChange={setAddInvoiceOpen}
          subId={subId}
          projectId={projectId}
          contractId={contract.id}
          retentionPercentage={contract.retention_percentage || 10}
        />
      )}
    </>
  );
}
