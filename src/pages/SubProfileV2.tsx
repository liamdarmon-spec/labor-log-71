import { Layout } from '@/components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Phone, Mail, Briefcase, Building2, FileUp } from 'lucide-react';
import { SubComplianceCard } from '@/components/subs/SubComplianceCard';
import { SubDocumentsSection } from '@/components/subs/SubDocumentsSection';
import { SubCostsTab } from '@/components/subs/SubCostsTab';
import { SubScheduleTab } from '@/components/subs/SubScheduleTab';
import { useSubCostsSummary } from '@/hooks/useSubCosts';

export default function SubProfileV2() {
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
          projects(id, project_name, status, company_id, companies(name))
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
          remainingToBill: acc.remainingToBill + Number(row.remaining_to_bill),
        }),
        { totalContracted: 0, totalBilled: 0, totalPaid: 0, retentionHeld: 0, outstanding: 0, remainingToBill: 0 }
      );

      return totals;
    },
  });

  // Get cost summary from costs table
  const { data: costSummary } = useSubCostsSummary(id!);

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
  const getComplianceStatus = () => {
    const now = new Date();
    const coiExpired = sub.compliance_coi_expiration && new Date(sub.compliance_coi_expiration) < now;
    const licenseExpired = sub.compliance_license_expiration && new Date(sub.compliance_license_expiration) < now;
    
    if (coiExpired || licenseExpired) return { variant: 'destructive' as const, label: '⚠ Non-Compliant' };
    if (!sub.compliance_w9_received || !sub.compliance_coi_expiration || !sub.compliance_license_expiration) {
      return { variant: 'secondary' as const, label: 'Incomplete' };
    }
    return { variant: 'default' as const, label: '✓ Compliant' };
  };

  const compliance = getComplianceStatus();

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
                <Badge variant={compliance.variant}>
                  {compliance.label}
                </Badge>
              </div>
              {sub.company_name && (
                <p className="text-muted-foreground mt-1">{sub.company_name}</p>
              )}
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <FileUp className="h-4 w-4" />
            Upload Compliance Docs
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects & Contracts</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Contact & Trade Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Active Projects</div>
                  <div className="text-2xl font-bold">{activeProjects}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Contract Value</div>
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
                  <div className="text-sm text-muted-foreground mb-1">Total Costs</div>
                  <div className="text-2xl font-bold text-purple-600">${(costSummary?.totalCost || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Outstanding</div>
                  <div className="text-2xl font-bold text-orange-600">${(summary?.outstanding || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Quick View */}
            <SubComplianceCard sub={sub} />
          </TabsContent>

          {/* PROJECTS & CONTRACTS TAB */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {contracts && contracts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Contract Value</TableHead>
                        <TableHead className="text-right">Billed</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract: any) => {
                        const billed = Number(contract.amount_billed || 0);
                        const paid = Number(contract.amount_paid || 0);
                        const value = Number(contract.contract_value || 0);
                        const remaining = value - billed;
                        const outstanding = billed - paid;

                        return (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">
                              {contract.projects?.project_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {contract.projects?.companies?.name || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={contract.projects?.status === 'Active' ? 'default' : 'secondary'}>
                                {contract.projects?.status || contract.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${value.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-blue-600">
                              ${billed.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              ${paid.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${remaining.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={outstanding > 0 ? 'text-orange-600 font-bold' : ''}>
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
          </TabsContent>

          {/* COSTS TAB */}
          <TabsContent value="costs">
            <SubCostsTab subId={id!} />
          </TabsContent>

          {/* COMPLIANCE TAB */}
          <TabsContent value="compliance" className="space-y-6">
            <SubComplianceCard sub={sub} />
            <SubDocumentsSection subId={id!} />
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule">
            <SubScheduleTab subId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
