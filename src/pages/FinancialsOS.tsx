import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Briefcase, BarChart3 } from 'lucide-react';
import { useGlobalFinancials } from '@/hooks/useGlobalFinancials';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';

export default function FinancialsOS() {
  const navigate = useNavigate();
  const { data: allProjects } = useProjects();
  const { data: globalFinancials } = useGlobalFinancials();

  // Use global financials from canonical tables
  const totalAR = globalFinancials?.totalOutstanding || 0;
  const totalAP = (globalFinancials?.laborUnpaid || 0) + (globalFinancials?.subsUnpaid || 0);
  const totalProfit = globalFinancials?.totalProfit || 0;

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
                      // Calculate from canonical project data
                      const budget = Number(project.contract_value || 0);
                      const actualCost = 0; // Would need per-project aggregation
                      const billed = 0;
                      const profit = budget - actualCost;
                      const marginPercent = budget > 0 ? (profit / budget) * 100 : 0;
                      
                      return (
                        <TableRow 
                          key={project.id}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <TableCell className="font-medium">{project.project_name}</TableCell>
                          <TableCell className="text-right">${budget.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${actualCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${billed.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${
                            profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${Math.abs(profit).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {marginPercent.toFixed(1)}%
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
