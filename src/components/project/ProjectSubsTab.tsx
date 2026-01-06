import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ProjectSubsTabProps {
  projectId: string;
}

export function ProjectSubsTab({ projectId }: ProjectSubsTabProps) {
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: '',
    tax: '',
    total: '',
    notes: '',
  });

  const [contractForm, setContractForm] = useState({
    sub_id: '',
    contract_value: '',
    retention_percentage: '10',
    payment_terms: '',
    start_date: '',
    end_date: '',
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['project-contracts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select(`
          *,
          subs (
            id,
            name,
            company_name,
            trades (name)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allSubs } = useQuery({
    queryKey: ['subs-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select(`
          *,
          trades (name)
        `)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['project-invoices', projectId, selectedSub?.id],
    queryFn: async () => {
      if (!selectedSub) return [];
      const { data, error } = await supabase
        .from('sub_invoices')
        .select('*')
        .eq('project_id', projectId)
        .eq('sub_id', selectedSub.id)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSub,
  });

  const { data: schedule } = useQuery({
    queryKey: ['project-sub-schedule', projectId, selectedSub?.id],
    queryFn: async () => {
      if (!selectedSub) return [];
      const { data, error } = await supabase
        .from('sub_scheduled_shifts')
        .select('*')
        .eq('project_id', projectId)
        .eq('sub_id', selectedSub.id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSub,
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('sub_contracts')
        .insert([{
          project_id: projectId,
          ...data,
          contract_value: Number(data.contract_value),
          retention_percentage: Number(data.retention_percentage),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-contracts', projectId] });
      toast({ title: 'Contract added successfully' });
      setIsContractDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error adding contract', description: error.message, variant: 'destructive' });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const contract = contracts?.find(c => c.sub_id === selectedSub.id);
      if (!contract) throw new Error('No contract found for this sub');

      const retentionAmount = (Number(data.total) * Number(contract.retention_percentage)) / 100;
      
      const { error } = await supabase
        .from('sub_invoices')
        .insert([{
          project_id: projectId,
          sub_id: selectedSub.id,
          contract_id: contract.id,
          ...data,
          subtotal: Number(data.subtotal),
          tax: Number(data.tax),
          total: Number(data.total),
          retention_amount: retentionAmount,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invoices'] });
      toast({ title: 'Invoice added successfully' });
      setIsInvoiceDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error adding invoice', description: error.message, variant: 'destructive' });
    },
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Get invoice details
      const invoice = invoices?.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // Get sub details to find cost code
      const sub = allSubs?.find(s => s.id === selectedSub.id);
      if (!sub?.trade_id) throw new Error('Sub trade not found');

      // Find the trade's SUB cost code from the canonical catalog
      if (!activeCompanyId) throw new Error('No active company selected');
      const { data: catalogData, error: catalogError } = await supabase.rpc('get_cost_code_catalog', {
        p_company_id: activeCompanyId,
      });
      if (catalogError) throw catalogError;
      const rows = (catalogData || []) as any[];
      const subCode = rows.find((r) => r.trade_id === sub.trade_id && r.category === 'sub');
      if (!subCode?.cost_code_id) throw new Error('Sub cost code not found for trade');

      // Create sub_log entry (this feeds into project costs)
      const { error: logError } = await supabase
        .from('sub_logs')
        .insert([{
          project_id: projectId,
          sub_id: selectedSub.id,
          cost_code_id: subCode.cost_code_id,
          amount: Number(invoice.total),
          date: invoice.invoice_date,
          description: `Invoice ${invoice.invoice_number}`,
        }]);

      if (logError) throw logError;

      // Update invoice status
      const { error: updateError } = await supabase
        .from('sub_invoices')
        .update({ payment_status: 'unpaid' })
        .eq('id', invoiceId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger'] });
      toast({ title: 'Invoice approved and added to project costs' });
    },
    onError: (error) => {
      toast({ title: 'Error approving invoice', description: error.message, variant: 'destructive' });
    },
  });

  const totalContracted = contracts?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
  const totalBilled = contracts?.reduce((sum, c) => sum + Number(c.amount_billed), 0) || 0;
  const totalPaid = contracts?.reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;
  const retentionHeld = contracts?.reduce((sum, c) => sum + Number(c.retention_held), 0) || 0;
  const remaining = totalBilled - totalPaid;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Subs</span>
            </div>
            <div className="text-2xl font-bold">{contracts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Contracted</span>
            </div>
            <div className="text-2xl font-bold">${totalContracted.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
            <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Remaining</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">${remaining.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Retention</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">${retentionHeld.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Subs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Subcontractors</CardTitle>
            <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcontractor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subcontractor to Project</DialogTitle>
                </DialogHeader>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    createContractMutation.mutate(contractForm);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Subcontractor *</Label>
                    <Select
                      value={contractForm.sub_id}
                      onValueChange={(value) => setContractForm({ ...contractForm, sub_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcontractor" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSubs?.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name} - {sub.trades?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Contract Value *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={contractForm.contract_value}
                      onChange={(e) => setContractForm({ ...contractForm, contract_value: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Retention % *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={contractForm.retention_percentage}
                      onChange={(e) => setContractForm({ ...contractForm, retention_percentage: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Input
                      value={contractForm.payment_terms}
                      onChange={(e) => setContractForm({ ...contractForm, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={contractForm.start_date}
                        onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={contractForm.end_date}
                        onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add to Project</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : contracts && contracts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Contract $</TableHead>
                  <TableHead>Paid $</TableHead>
                  <TableHead>Remaining $</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract: any) => {
                  const remaining = Number(contract.amount_billed) - Number(contract.amount_paid);
                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.subs?.name}</div>
                          {contract.subs?.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {contract.subs.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{contract.subs?.trades?.name}</Badge>
                      </TableCell>
                      <TableCell>${Number(contract.contract_value).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">
                        ${Number(contract.amount_paid).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        ${remaining.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedSub(contract.subs)}
                            >
                              Open
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>{contract.subs?.name}</SheetTitle>
                            </SheetHeader>
                            
                            <Tabs defaultValue="contract" className="mt-6">
                              <TabsList className="grid grid-cols-4 w-full">
                                <TabsTrigger value="contract">Contract</TabsTrigger>
                                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                              </TabsList>

                              <TabsContent value="contract" className="space-y-4">
                                <Card>
                                  <CardContent className="pt-6 space-y-4">
                                    <div>
                                      <div className="text-sm text-muted-foreground">Contract Value</div>
                                      <div className="text-2xl font-bold">
                                        ${Number(contract.contract_value).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-sm text-muted-foreground">Retention %</div>
                                        <div className="font-medium">{contract.retention_percentage}%</div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-muted-foreground">Payment Terms</div>
                                        <div className="font-medium">{contract.payment_terms || '-'}</div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-muted-foreground">Start Date</div>
                                        <div className="font-medium">
                                          {contract.start_date ? format(new Date(contract.start_date), 'MMM d, yyyy') : '-'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-muted-foreground">End Date</div>
                                        <div className="font-medium">
                                          {contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </TabsContent>

                              <TabsContent value="invoices" className="space-y-4">
                                <div className="flex justify-end">
                                  <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Invoice
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Add Invoice</DialogTitle>
                                      </DialogHeader>
                                      <form
                                        onSubmit={(e) => {
                                          e.preventDefault();
                                          createInvoiceMutation.mutate(invoiceForm);
                                        }}
                                        className="space-y-4"
                                      >
                                        <div>
                                          <Label>Invoice Number</Label>
                                          <Input
                                            value={invoiceForm.invoice_number}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Invoice Date *</Label>
                                            <Input
                                              type="date"
                                              value={invoiceForm.invoice_date}
                                              onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                                              required
                                            />
                                          </div>
                                          <div>
                                            <Label>Due Date</Label>
                                            <Input
                                              type="date"
                                              value={invoiceForm.due_date}
                                              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                          <div>
                                            <Label>Subtotal *</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={invoiceForm.subtotal}
                                              onChange={(e) => {
                                                const subtotal = Number(e.target.value);
                                                const tax = Number(invoiceForm.tax);
                                                setInvoiceForm({ 
                                                  ...invoiceForm, 
                                                  subtotal: e.target.value,
                                                  total: (subtotal + tax).toString()
                                                });
                                              }}
                                              required
                                            />
                                          </div>
                                          <div>
                                            <Label>Tax</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={invoiceForm.tax}
                                              onChange={(e) => {
                                                const subtotal = Number(invoiceForm.subtotal);
                                                const tax = Number(e.target.value);
                                                setInvoiceForm({ 
                                                  ...invoiceForm, 
                                                  tax: e.target.value,
                                                  total: (subtotal + tax).toString()
                                                });
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <Label>Total *</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={invoiceForm.total}
                                              onChange={(e) => setInvoiceForm({ ...invoiceForm, total: e.target.value })}
                                              required
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label>Notes</Label>
                                          <Textarea
                                            value={invoiceForm.notes}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                                            Cancel
                                          </Button>
                                          <Button type="submit">Add Invoice</Button>
                                        </div>
                                      </form>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                {invoices && invoices.length > 0 ? (
                                  <div className="space-y-2">
                                    {invoices.map((invoice: any) => (
                                      <Card key={invoice.id}>
                                        <CardContent className="pt-6">
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="font-medium">
                                                Invoice {invoice.invoice_number || invoice.id.slice(0, 8)}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                                              </div>
                                              <div className="text-lg font-bold mt-2">
                                                ${Number(invoice.total).toLocaleString()}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                Retention: ${Number(invoice.retention_amount).toLocaleString()}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                              <Badge
                                                variant={
                                                  invoice.payment_status === 'paid'
                                                    ? 'default'
                                                    : invoice.payment_status === 'partial'
                                                    ? 'secondary'
                                                    : 'destructive'
                                                }
                                              >
                                                {invoice.payment_status}
                                              </Badge>
                                              {invoice.payment_status === 'unpaid' && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => approveInvoiceMutation.mutate(invoice.id)}
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                  Approve
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No invoices yet
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="schedule" className="space-y-4">
                                {schedule && schedule.length > 0 ? (
                                  <div className="space-y-2">
                                    {schedule.map((shift: any) => (
                                      <Card key={shift.id}>
                                        <CardContent className="pt-6">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="font-medium">
                                                {format(new Date(shift.scheduled_date), 'MMM d, yyyy')}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {shift.scheduled_hours || 8} hours
                                              </div>
                                              {shift.notes && (
                                                <div className="text-sm mt-1">{shift.notes}</div>
                                              )}
                                            </div>
                                            <Badge variant="outline">{shift.status || 'planned'}</Badge>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No upcoming schedule
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="notes" className="space-y-4">
                                <Textarea
                                  placeholder="Add notes about this subcontractor..."
                                  rows={10}
                                />
                                <Button>Save Notes</Button>
                              </TabsContent>
                            </Tabs>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No subcontractors on this project</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first subcontractor to get started
              </p>
              <Button onClick={() => setIsContractDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcontractor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
