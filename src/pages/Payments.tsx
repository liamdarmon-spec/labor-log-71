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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Plus, Edit2, Trash2, Calendar, Eye, Check } from 'lucide-react';
import { format } from 'date-fns';
import { PayrollRunView } from '@/components/payments/PayrollRunView';
import { GlobalUnpaidLaborView } from '@/components/payments/GlobalUnpaidLaborView';

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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
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
      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .maybeSingle();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add payment',
          variant: 'destructive',
        });
      } else {
        // Mark daily_logs as paid for this date range and company
        const { data: projectIds } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', formData.company_id);

        if (projectIds && projectIds.length > 0 && newPayment) {
          // Get the logs to update and calculate paid amounts
          const { data: logsToUpdate } = await supabase
            .from('daily_logs')
            .select('id, hours_worked, workers(hourly_rate)')
            .gte('date', formData.start_date)
            .lte('date', formData.end_date)
            .in('project_id', projectIds.map(p => p.id))
            .eq('payment_status', 'unpaid');

          // Update each log with calculated paid_amount
          if (logsToUpdate && logsToUpdate.length > 0) {
            const updates = logsToUpdate.map((log: any) => ({
              id: log.id,
              payment_status: 'paid',
              payment_id: newPayment.id,
              paid_amount: log.hours_worked * (log.workers?.hourly_rate || 0),
            }));

            for (const update of updates) {
              await supabase
                .from('daily_logs')
                .update({
                  payment_status: update.payment_status,
                  payment_id: update.payment_id,
                  paid_amount: update.paid_amount,
                })
                .eq('id', update.id);
            }
          }
        }

        toast({
          title: 'Success',
          description: 'Payment recorded and labor marked as paid',
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
    // Reimbursement status filter
    let matchesStatus = true;
    if (reimbursementFilter === 'pending') {
      matchesStatus = payment.paid_via === 'Reimbursement Needed' && payment.reimbursement_status !== 'reimbursed';
    } else if (reimbursementFilter === 'reimbursed') {
      matchesStatus = payment.paid_via !== 'Reimbursement Needed' || payment.reimbursement_status === 'reimbursed';
    }

    // Month filter
    let matchesMonth = true;
    if (selectedMonth && selectedMonth !== 'all') {
      const paymentMonth = format(new Date(payment.payment_date), 'yyyy-MM');
      matchesMonth = paymentMonth === selectedMonth;
    }

    // Company filter
    let matchesCompany = true;
    if (selectedCompany && selectedCompany !== 'all') {
      matchesCompany = payment.company_id === selectedCompany;
    }

    return matchesStatus && matchesMonth && matchesCompany;
  });

  const totalPayments = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const allPendingReimbursements = payments.filter(p => 
    p.paid_via === 'Reimbursement Needed' && p.reimbursement_status !== 'reimbursed'
  );
  const totalPendingAmount = allPendingReimbursements.reduce((sum, p) => sum + p.amount, 0);

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  // Show payroll run view if a payment is selected
  if (selectedPaymentId) {
    return (
      <Layout>
        <PayrollRunView 
          paymentId={selectedPaymentId} 
          onClose={() => setSelectedPaymentId(null)} 
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Costs</h1>
        <p className="text-muted-foreground mt-1">Review and record payments for labor and other job costs.</p>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments & Payroll</h1>
            <p className="text-muted-foreground mt-2">Track payment records and view payroll breakdowns</p>
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

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Payments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                    ${totalPayments.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Total Outstanding</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                    ${totalPendingAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {allPendingReimbursements.length} pending reimbursement{allPendingReimbursements.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-200 dark:bg-amber-900 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-900 dark:text-amber-100" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Completed Payments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                    ${(totalPayments - totalPendingAmount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredPayments.length - allPendingReimbursements.length} completed
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={reimbursementFilter} onValueChange={(value: any) => setReimbursementFilter(value)}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reimbursed">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="month-filter" className="text-sm font-medium mb-2 block">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-filter">
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="company-filter" className="text-sm font-medium mb-2 block">Company</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger id="company-filter">
                    <SelectValue placeholder="All companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setReimbursementFilter('all');
                    setSelectedMonth('all');
                    setSelectedCompany('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Interface for Different Views */}
        <Tabs defaultValue="labor-runs" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="labor-runs">Labor Pay Runs</TabsTrigger>
            <TabsTrigger value="all-payments">All Payments</TabsTrigger>
            <TabsTrigger value="unpaid-labor">Unpaid Labor</TabsTrigger>
          </TabsList>

          {/* Labor Pay Runs Tab */}
          <TabsContent value="labor-runs">
            <Card className="shadow-medium">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Labor Pay Runs
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Payment records for labor costs grouped by date range and company
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Date Range</TableHead>
                        <TableHead className="font-semibold">Paid By</TableHead>
                        <TableHead className="font-semibold">Company</TableHead>
                        <TableHead className="font-semibold">Paid Via</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Amount</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No payment records found
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
                            <TableCell>{companies.find(c => c.id === payment.company_id)?.name || '-'}</TableCell>
                            <TableCell>{payment.paid_via || '-'}</TableCell>
                            <TableCell>
                              {payment.reimbursement_status === 'reimbursed' ? (
                                <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Reimbursed
                                </Badge>
                              ) : payment.reimbursement_status === 'pending' || payment.paid_via === 'Reimbursement Needed' ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                                  Pending Reimbursement
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-700">
                                  Complete
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              ${parseFloat(payment.amount.toString()).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPaymentId(payment.id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                {payment.reimbursement_status === 'pending' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleMarkAsReimbursed(payment.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Mark Reimbursed
                                  </Button>
                                )}
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
          </TabsContent>

          {/* All Payments Tab */}
          <TabsContent value="all-payments">
            <Card className="shadow-medium">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  All Payment Records
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete payment history with detailed information
                </p>
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
                      {filteredPayments.length === 0 ? (
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
                              {payment.reimbursement_status === 'reimbursed' ? (
                                <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Reimbursed
                                </Badge>
                              ) : payment.reimbursement_status === 'pending' || payment.paid_via === 'Reimbursement Needed' ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                                  Pending Reimbursement
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-700">
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPaymentId(payment.id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                {payment.reimbursement_status === 'pending' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleMarkAsReimbursed(payment.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Mark Reimbursed
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
          </TabsContent>

          {/* Unpaid Labor Tab */}
          <TabsContent value="unpaid-labor">
            <GlobalUnpaidLaborView />
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
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

              {editingPayment && editingPayment.reimbursement_status === 'reimbursed' && editingPayment.reimbursement_date && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground">
                      Reimbursed on{' '}
                      <span className="font-semibold text-foreground">
                        {new Date(editingPayment.reimbursement_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </span>
                  </div>
                </div>
              )}

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
