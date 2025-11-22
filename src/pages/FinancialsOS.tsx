import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Briefcase, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCostEntries } from '@/hooks/useProjectFinancials';
import { useNavigate } from 'react-router-dom';

export default function FinancialsOS() {
  const navigate = useNavigate();

  const { data: allProjects } = useQuery({
    queryKey: ['all-projects-financials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_financials_snapshot(*)
        `);
      if (error) throw error;
      return data;
    },
  });

  const totalAR = (allProjects || []).reduce((sum, p: any) => 
    sum + (p.project_financials_snapshot?.open_ar || 0), 0);
  
  const totalAP = (allProjects || []).reduce((sum, p: any) => 
    sum + (p.project_financials_snapshot?.open_ap_labor || 0) + 
          (p.project_financials_snapshot?.open_ap_subs || 0), 0);

  const totalProfit = (allProjects || []).reduce((sum, p: any) => 
    sum + (p.project_financials_snapshot?.profit_amount || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financial OS</h1>
          <p className="text-muted-foreground mt-1">Company-wide financial overview & job costing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total AR
                <DollarSign className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${totalAR.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total AP
                <Briefcase className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">${totalAP.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Profit
                <TrendingUp className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalProfit.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList>
            <TabsTrigger value="projects">
              <BarChart3 className="w-4 h-4 mr-2" />
              Job Costing
            </TabsTrigger>
            <TabsTrigger value="ledger">Cost Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>Job costing summary across all active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual Cost</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allProjects || []).map((project: any) => {
                      const snap = project.project_financials_snapshot;
                      return (
                        <TableRow 
                          key={project.id}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <TableCell className="font-medium">{project.project_name}</TableCell>
                          <TableCell className="text-right">${(snap?.revised_budget || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">${(snap?.actual_cost_total || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">${(snap?.billed_to_date || 0).toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${
                            (snap?.profit_amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${Math.abs(snap?.profit_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(snap?.profit_percent || 0).toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger">
            <Card>
              <CardHeader>
                <CardTitle>Global Cost Ledger</CardTitle>
                <CardDescription>All cost entries across projects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Unified cost ledger with advanced filtering coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
