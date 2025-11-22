import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, DollarSign } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function FinancialPayments() {
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type') || 'all';
  const projectFilter = searchParams.get('project') || 'all';
  const workerFilter = searchParams.get('worker') || null;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(typeFilter);
  const [selectedProject, setSelectedProject] = useState(projectFilter);

  // Fetch labor payments
  const { data: laborPayments, isLoading: loadingLabor } = useQuery({
    queryKey: ['financial-labor-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          companies(name),
          daily_logs(
            worker_id,
            hours_worked,
            workers(name),
            projects(project_name)
          )
        `)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      // Flatten for display
      return (data || []).flatMap(payment => {
        const logs = (payment as any).daily_logs || [];
        const workerGroups = logs.reduce((acc: any, log: any) => {
          const workerId = log.worker_id;
          if (!acc[workerId]) {
            acc[workerId] = {
              worker: log.workers?.name || 'Unknown',
              hours: 0,
              projects: new Set(),
            };
          }
          acc[workerId].hours += log.hours_worked || 0;
          if (log.projects?.project_name) {
            acc[workerId].projects.add(log.projects.project_name);
          }
          return acc;
        }, {});

        return Object.entries(workerGroups).map(([workerId, group]: [string, any]) => ({
          id: `${payment.id}-${workerId}`,
          date: payment.payment_date,
          type: 'Labor',
          related: group.worker,
          project: Array.from(group.projects).join(', ') || '-',
          amount: group.hours * 25, // Simplified calculation
          method: payment.paid_via || 'Cash',
          status: payment.reimbursement_status || 'cleared',
          paymentId: payment.id,
        }));
      });
    },
  });

  // Fetch sub payments
  const { data: subPayments, isLoading: loadingSubs } = useQuery({
    queryKey: ['financial-sub-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_payments')
        .select(`
          *,
          sub_invoices(
            sub_id,
            project_id,
            invoice_number,
            subs(name),
            projects(project_name)
          )
        `)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(payment => ({
        id: payment.id,
        date: payment.payment_date,
        type: 'Sub',
        related: (payment as any).sub_invoices?.subs?.name || 'Unknown',
        project: (payment as any).sub_invoices?.projects?.project_name || '-',
        amount: payment.amount_paid,
        method: 'Check',
        status: 'cleared',
        paymentId: payment.id,
      }));
    },
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingLabor || loadingSubs;

  const allPayments = [
    ...(laborPayments || []),
    ...(subPayments || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredPayments = allPayments.filter(payment => {
    if (selectedType !== 'all' && payment.type !== selectedType) return false;
    if (selectedProject !== 'all' && !payment.project.includes(projects?.find(p => p.id === selectedProject)?.project_name || '')) return false;
    if (searchTerm && !payment.related.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (workerFilter && !payment.related.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payments</h1>
          <p className="text-muted-foreground">
            All payment transactions across labor, subcontractors, and materials
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Labor">Labor</SelectItem>
                  <SelectItem value="Sub">Subcontractors</SelectItem>
                  <SelectItem value="Material">Materials</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={payment.type === 'Labor' ? 'default' : 'secondary'}>
                          {payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{payment.related}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.project}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'cleared' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
