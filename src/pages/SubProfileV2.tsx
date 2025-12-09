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
import { SubProjectsTab } from '@/components/subs/SubProjectsTab';
import { useSubFinancialsSummary } from '@/hooks/useSubFinancials';

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
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Subcontractor not found');
      }
      return data;
    },
  });

  // Fetch unified financial summary using single source of truth
  const { data: summary } = useSubFinancialsSummary(id!);

  // Count active projects from contracts
  const { data: contracts } = useQuery({
    queryKey: ['sub-contracts-count', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select('project_id, projects(status)')
        .eq('sub_id', id!);
      if (error) throw error;
      return data;
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
                  <div className="text-2xl font-bold">{summary?.activeProjectsCount || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Contract Total</div>
                  <div className="text-2xl font-bold">${(summary?.totalContractTotal || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Actual Cost</div>
                  <div className="text-2xl font-bold text-purple-600">${(summary?.totalActualCost || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Remaining</div>
                  <div className="text-2xl font-bold text-foreground">${(summary?.totalRemaining || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Billed</div>
                  <div className="text-2xl font-bold text-blue-600">${(summary?.totalBilled || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Outstanding</div>
                  <div className="text-2xl font-bold text-orange-600">${(summary?.totalOutstanding || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Quick View */}
            <SubComplianceCard sub={sub} />
          </TabsContent>

          {/* PROJECTS & CONTRACTS TAB */}
          <TabsContent value="projects" className="space-y-6">
            <SubProjectsTab subId={id!} />
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
