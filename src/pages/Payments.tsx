import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  start_date: string;
  end_date: string;
  company_id: string | null;
  paid_by: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  paid_via: string | null;
  reimbursement_status: 'pending' | 'reimbursed' | null;
  reimbursement_date: string | null;
}

interface Company {
  id: string;
  name: string;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [reimbursementFilter, setReimbursementFilter] = useState<'all' | 'pending' | 'reimbursed'>('all');
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    paid_by: '',
    company_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    paid_via: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchCompanies();
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payments',
        variant: 'destructive',
      });
    } else {
      setPayments((data as Payment[]) || []);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

  const calculateAmountForDateRange = async (startDate: string, endDate: string, companyId?: string) => {
    if (!startDate || !endDate) {
      setCalculatedAmount(null);
      return;
    }

    setIsCalculating(true);
    try {
      let query = supabase
        .from('daily_logs')
        .select(`
          hours_worked,
          workers (hourly_rate),
          projects (company_id)
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      // Filter by company if provided
      if (companyId) {
        const { data: projectIds } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', companyId);
        
        if (projectIds && projectIds.length > 0) {
          query = query.in('project_id', projectIds.map(p => p.id));
        }
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      if (!logs || logs.length === 0) {
        setCalculatedAmount(0);
        toast({
          title: 'No logs found',
          description: `No time entries found between ${new Date(startDate).toLocaleDateString()} and ${new Date(endDate).toLocaleDateString()}`,
          variant: 'destructive',
        });
      } else {
        const total = logs.reduce((sum, log) => {
          const hours = parseFloat(log.hours_worked.toString());
          const rate = (log.workers as any).hourly_rate;
          return sum + (hours * rate);
        }, 0);

        setCalculatedAmount(total);
        setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));
        
        toast({
          title: 'Amount calculated',
          description: `Found ${logs.length} time entries totaling $${total.toFixed(2)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to calculate amount',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (formData.start_date && formData.end_date && formData.company_id) {
      const timeoutId = setTimeout(() => {
        calculateAmountForDateRange(formData.start_date, formData.end_date, formData.company_id);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCalculatedAmount(null);
    }
  }, [formData.start_date, formData.end_date, formData.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date || !formData.paid_by || !formData.amount || !formData.company_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate paid_via is required for Forma Homes
    const formaHomesCompany = companies.find(c => c.name === 'Forma Homes');
    if (formaHomesCompany && formData.company_id === formaHomesCompany.id && !formData.paid_via) {
      toast({
        title: 'Validation Error',
        description: 'Please select how the payment was made for Forma Homes',
        variant: 'destructive',
      });
      return;
    }

    // Auto-determine reimbursement status based on company and payment method
    const gaCompany = companies.find(c => c.name === 'GA Painting');
    const isGAPayment = formData.company_id === gaCompany?.id;
    const isDHYPayment = formData.paid_via === 'DHY';
    
    const paymentData = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      paid_by: formData.paid_by,
      company_id: formData.company_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      notes: formData.notes || null,
      paid_via: formData.paid_via || null,
      reimbursement_status: (isGAPayment || isDHYPayment) ? 'reimbursed' as const : 
                           formData.paid_via === 'Reimbursement Needed' ? 'pending' as const : null,
      reimbursement_date: (isGAPayment || isDHYPayment) ? new Date().toISOString().split("T")[0] : null,
    };

    if (editingPayment) {
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', editingPayment.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update payment',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Payment updated successfully',
        });
        fetchPayments();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add payment',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Payment added successfully',
        });
        fetchPayments();
        handleCloseDialog();
      }
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      start_date: payment.start_date,
      end_date: payment.end_date,
      paid_by: payment.paid_by,
      company_id: payment.company_id || '',
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      notes: payment.notes || '',
      paid_via: payment.paid_via || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete payment',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });
      fetchPayments();
    }
  };

  const handleMarkAsReimbursed = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          reimbursement_status: 'reimbursed',
          reimbursement_date: new Date().toISOString().split("T")[0],
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment marked as complete",
      });
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPayment(null);
    setCalculatedAmount(null);
    setFormData({
      start_date: '',
      end_date: '',
      paid_by: '',
      company_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
      paid_via: '',
    });
  };

  const filteredPayments = payments.filter((payment) => {
    if (reimbursementFilter === 'all') return true;
    if (reimbursementFilter === 'pending') return payment.reimbursement_status === 'pending';
    if (reimbursementFilter === 'reimbursed') return payment.reimbursement_status === 'reimbursed';
    return true;
  });

  const totalPayments = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const pendingReimbursements = payments.filter(p => p.reimbursement_status === 'pending');
  const totalPendingAmount = pendingReimbursements.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground mt-2">Track and manage payment records</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-primary">${totalPayments.toFixed(2)}</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </div>
        </div>

        {pendingReimbursements.length > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Pending Reimbursements
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {pendingReimbursements.length} payment{pendingReimbursements.length !== 1 ? 's' : ''} awaiting DHY reimbursement
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    ${totalPendingAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Total pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4 mb-4">
          <Select value={reimbursementFilter} onValueChange={(value: any) => setReimbursementFilter(value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reimbursed">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Payment Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date Range</TableHead>
                    <TableHead className="font-semibold">Paid By</TableHead>
                    <TableHead className="font-semibold">Payment Date</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">Paid Via</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(payment.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payment.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell>{payment.paid_by}</TableCell>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell>{companies.find(c => c.id === payment.company_id)?.name || '-'}</TableCell>
                        <TableCell>{payment.paid_via || '-'}</TableCell>
                        <TableCell>
                          {payment.reimbursement_status === 'pending' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700">
                              Complete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          ${parseFloat(payment.amount.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {payment.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            {payment.reimbursement_status === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleMarkAsReimbursed(payment.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Mark Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(payment)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid-by">Paid By *</Label>
                <Input
                  id="paid-by"
                  type="text"
                  placeholder="e.g., GA Painting, Forma Homes"
                  value={formData.paid_by}
                  onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.company_id === companies.find(c => c.name === 'Forma Homes')?.id && (
                <div className="space-y-2">
                  <Label htmlFor="paid_via">Paid Via *</Label>
                  <Select value={formData.paid_via} onValueChange={(value) => setFormData({ ...formData, paid_via: value })}>
                    <SelectTrigger id="paid_via">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="DHY">DHY</SelectItem>
                      <SelectItem value="Reimbursement Needed">Reimbursement Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      disabled={isCalculating}
                      className={calculatedAmount !== null ? 'pr-16' : ''}
                    />
                    {isCalculating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        Calculating...
                      </div>
                    )}
                    {calculatedAmount !== null && !isCalculating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium">
                        Auto-filled
                      </div>
                    )}
                  </div>
                  {calculatedAmount !== null && !isCalculating && (
                    <p className="text-xs text-muted-foreground">
                      Calculated from time logs in date range
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment Date *</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? 'Update' : 'Add'} Payment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Payments;
