import { Layout } from '@/components/Layout';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, DollarSign, FileText, Calendar, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SubProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: sub } = useQuery({
    queryKey: ['sub', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select(`
          *,
          trades (name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ['sub-contracts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select(`
          *,
          projects (project_name)
        `)
        .eq('sub_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['sub-invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_invoices')
        .select(`
          *,
          projects (project_name)
        `)
        .eq('sub_id', id)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: schedule } = useQuery({
    queryKey: ['sub-schedule', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_scheduled_shifts')
        .select(`
          *,
          projects (project_name)
        `)
        .eq('sub_id', id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date');
      if (error) throw error;
      return data;
    },
  });

  const totalContracted = contracts?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
  const totalBilled = contracts?.reduce((sum, c) => sum + Number(c.amount_billed), 0) || 0;
  const totalPaid = contracts?.reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;
  const retentionHeld = contracts?.reduce((sum, c) => sum + Number(c.retention_held), 0) || 0;
  const outstandingBalance = totalBilled - totalPaid;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{sub?.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline">{sub?.trades?.name}</Badge>
              <Badge variant={sub?.active ? 'default' : 'secondary'}>
                {sub?.active ? 'Active' : 'Inactive'}
              </Badge>
              {sub?.company_name && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {sub.company_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Billed</span>
              </div>
              <div className="text-2xl font-bold">${totalBilled.toLocaleString()}</div>
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
                <span className="text-sm text-muted-foreground">Outstanding</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">${outstandingBalance.toLocaleString()}</div>
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

        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contracts</CardTitle>
                  <Button>Add Contract</Button>
                </div>
              </CardHeader>
              <CardContent>
                {contracts && contracts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Billed</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Retention</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract: any) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.projects?.project_name}</TableCell>
                          <TableCell>${Number(contract.contract_value).toLocaleString()}</TableCell>
                          <TableCell>${Number(contract.amount_billed).toLocaleString()}</TableCell>
                          <TableCell>${Number(contract.amount_paid).toLocaleString()}</TableCell>
                          <TableCell>${Number(contract.retention_held).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                              {contract.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contract.start_date && format(new Date(contract.start_date), 'MMM d, yyyy')}
                            {contract.end_date && ` - ${format(new Date(contract.end_date), 'MMM d, yyyy')}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No contracts found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <Button>Add Invoice</Button>
                </div>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Retention</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                          <TableCell>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{invoice.projects?.project_name}</TableCell>
                          <TableCell>${Number(invoice.total).toLocaleString()}</TableCell>
                          <TableCell>${Number(invoice.retention_amount).toLocaleString()}</TableCell>
                          <TableCell>${Number(invoice.amount_paid).toLocaleString()}</TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {schedule && schedule.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((shift: any) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">
                            {format(new Date(shift.scheduled_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{shift.projects?.project_name}</TableCell>
                          <TableCell>{shift.scheduled_hours || 8} hrs</TableCell>
                          <TableCell>{shift.notes || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{shift.status || 'planned'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming schedule found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Payment tracking coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
