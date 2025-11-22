import { Layout } from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Financials = () => {
  const navigate = useNavigate();

  const { data: projectsFinancials, isLoading } = useQuery({
    queryKey: ['global-financials'],
    queryFn: async () => {
      // Fetch all projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('project_name');

      if (!projects) return [];

      // For each project, calculate financials
      const financials = await Promise.all(
        projects.map(async (project) => {
          // Get budget
          const { data: budget } = await supabase
            .from('project_budgets')
            .select('*')
            .eq('project_id', project.id)
            .maybeSingle();

          const totalBudget = (budget?.labor_budget || 0) + 
                            (budget?.subs_budget || 0) + 
                            (budget?.materials_budget || 0) + 
                            (budget?.other_budget || 0);

          // Get labor actuals
          const { data: logs } = await supabase
            .from('daily_logs')
            .select('hours_worked, worker_id, payment_status')
            .eq('project_id', project.id);

          const workerIds = [...new Set(logs?.map(l => l.worker_id) || [])];
          const { data: workers } = await supabase
            .from('workers')
            .select('id, hourly_rate')
            .in('id', workerIds);

          const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);

          let totalActual = 0;
          let unpaidLabor = 0;

          logs?.forEach(log => {
            const rate = workerRateMap.get(log.worker_id) || 0;
            const cost = (log.hours_worked || 0) * rate;
            totalActual += cost;
            if (log.payment_status === 'unpaid') {
              unpaidLabor += cost;
            }
          });

          const variance = totalBudget - totalActual;

          return {
            id: project.id,
            name: project.project_name,
            client: project.client_name,
            status: project.status,
            budget: totalBudget,
            actual: totalActual,
            variance,
            unpaidLabor,
          };
        })
      );

      return financials;
    },
  });

  const totals = projectsFinancials?.reduce(
    (acc, proj) => ({
      budget: acc.budget + proj.budget,
      actual: acc.actual + proj.actual,
      variance: acc.variance + proj.variance,
      unpaidLabor: acc.unpaidLabor + proj.unpaidLabor,
    }),
    { budget: 0, actual: 0, variance: 0, unpaidLabor: 0 }
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Global Financials</h1>
            <p className="text-muted-foreground">Company-wide financial overview</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Global Financials</h1>
          <p className="text-muted-foreground">
            Company-wide financial overview across all projects
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>
              <p className="text-3xl font-bold">
                ${totals?.budget.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Total Actual</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                ${totals?.actual.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${(totals?.variance || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {(totals?.variance || 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Total Variance</p>
              </div>
              <p className={`text-3xl font-bold ${(totals?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totals?.variance || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className={(totals?.unpaidLabor || 0) > 0 ? 'border-orange-200 bg-orange-50' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">Unpaid Labor</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                ${totals?.unpaidLabor.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Project Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Unpaid Labor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsFinancials?.map(project => (
                  <TableRow 
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${project.budget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${project.actual.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${project.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(project.variance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      ${project.unpaidLabor.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Financials;
