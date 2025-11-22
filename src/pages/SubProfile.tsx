import { Layout } from '@/components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, Phone, Mail, Briefcase } from 'lucide-react';
import { SubDocumentsSection } from '@/components/subs/SubDocumentsSection';

export default function SubProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch sub details
  const { data: sub, isLoading } = useQuery({
    queryKey: ['sub-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select('*, trades(id, name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all contracts for this sub
  const { data: contracts } = useQuery({
    queryKey: ['sub-all-contracts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select(`
          *,
          projects(id, project_name, status)
        `)
        .eq('sub_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch summary via sub_contract_summary view
  const { data: summary } = useQuery({
    queryKey: ['sub-summary', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contract_summary')
        .select('*')
        .eq('sub_id', id!);
      if (error) throw error;

      // Aggregate across all projects
      const totals = data.reduce(
        (acc, row) => ({
          totalContracted: acc.totalContracted + Number(row.contract_value),
          totalBilled: acc.totalBilled + Number(row.total_billed),
          totalPaid: acc.totalPaid + Number(row.total_paid),
          retentionHeld: acc.retentionHeld + Number(row.total_retention_held),
          outstanding: acc.outstanding + Number(row.outstanding_balance),
        }),
        { totalContracted: 0, totalBilled: 0, totalPaid: 0, retentionHeld: 0, outstanding: 0 }
      );

      return totals;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!sub) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Subcontractor not found</p>
          <Button onClick={() => navigate('/subs')} className="mt-4">
            Back to Subs
          </Button>
        </div>
      </Layout>
    );
  }

  const activeProjects = contracts?.filter(c => c.projects?.status === 'Active').length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/subs')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{sub.name}</h1>
                <Badge variant={sub.active ? 'default' : 'secondary'}>
                  {sub.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {sub.company_name && (
                <p className="text-muted-foreground mt-1">{sub.company_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Trade Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Trade</div>
                  <div className="font-medium">{sub.trades?.name || 'N/A'}</div>
                </div>
              </div>
              {sub.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{sub.phone}</div>
                  </div>
                </div>
              )}
              {sub.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{sub.email}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Active Projects</div>
              <div className="text-2xl font-bold">{activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Contracted</div>
              <div className="text-2xl font-bold">${(summary?.totalContracted || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Billed</div>
              <div className="text-2xl font-bold text-blue-600">${(summary?.totalBilled || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">${(summary?.totalPaid || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Outstanding</div>
              <div className="text-2xl font-bold text-orange-600">${(summary?.outstanding || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <SubDocumentsSection subId={id!} />

        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {contracts && contracts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract: any) => {
                    const billed = Number(contract.amount_billed || 0);
                    const paid = Number(contract.amount_paid || 0);
                    const outstanding = billed - paid;

                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.projects?.project_name || 'Unknown Project'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contract.projects?.status === 'Active' ? 'default' : 'secondary'}>
                            {contract.projects?.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(contract.contract_value).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${billed.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          ${paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={outstanding > 0 ? 'text-orange-600 font-medium' : ''}>
                            ${outstanding.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/projects/${contract.projects?.id}?tab=subs`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
