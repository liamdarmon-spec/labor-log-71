import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UnpaidProject {
  project_id: string;
  project_name: string;
  log_count: number;
  total_hours: number;
  total_amount: number;
  earliest_date: string;
  latest_date: string;
}

interface UnpaidCompany {
  company_id: string;
  company_name: string;
  projects: UnpaidProject[];
  total_amount: number;
  total_hours: number;
  total_logs: number;
}

export const GlobalUnpaidLaborView = () => {
  const [companies, setCompanies] = useState<UnpaidCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchGlobalUnpaidLabor();
  }, []);

  const fetchGlobalUnpaidLabor = async () => {
    try {
      setLoading(true);

      // Get all unpaid logs with project and company info
      const { data: unpaidLogs, error } = await supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          project_id,
          workers (hourly_rate),
          projects (
            project_name,
            company_id,
            companies (name)
          )
        `)
        .eq('payment_status', 'unpaid');

      if (error) throw error;

      // Group by company and project
      const companyMap = new Map<string, UnpaidCompany>();

      unpaidLogs?.forEach((log: any) => {
        const companyId = log.projects?.company_id;
        const companyName = log.projects?.companies?.name || 'Unknown Company';
        const projectId = log.project_id;
        const projectName = log.projects?.project_name || 'Unknown Project';

        if (!companyId) return;

        if (!companyMap.has(companyId)) {
          companyMap.set(companyId, {
            company_id: companyId,
            company_name: companyName,
            projects: [],
            total_amount: 0,
            total_hours: 0,
            total_logs: 0,
          });
        }

        const company = companyMap.get(companyId)!;
        let project = company.projects.find(p => p.project_id === projectId);

        if (!project) {
          project = {
            project_id: projectId,
            project_name: projectName,
            log_count: 0,
            total_hours: 0,
            total_amount: 0,
            earliest_date: log.date,
            latest_date: log.date,
          };
          company.projects.push(project);
        }

        const amount = log.hours_worked * (log.workers?.hourly_rate || 0);
        project.log_count++;
        project.total_hours += log.hours_worked;
        project.total_amount += amount;
        project.earliest_date = log.date < project.earliest_date ? log.date : project.earliest_date;
        project.latest_date = log.date > project.latest_date ? log.date : project.latest_date;

        company.total_logs++;
        company.total_hours += log.hours_worked;
        company.total_amount += amount;
      });

      setCompanies(Array.from(companyMap.values()));
    } catch (error) {
      console.error('Error fetching global unpaid labor:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const handleRunPayment = (companyId: string, project?: UnpaidProject) => {
    const params = new URLSearchParams({ company: companyId });
    if (project) {
      params.set('startDate', project.earliest_date);
      params.set('endDate', project.latest_date);
    }
    navigate(`/payments?${params.toString()}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Labor by Company & Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Labor by Company & Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">All labor has been paid!</p>
            <p className="text-sm mt-1">There are no outstanding unpaid labor costs</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const grandTotal = companies.reduce((sum, c) => sum + c.total_amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Unpaid Labor by Company & Project
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              All outstanding labor costs across all projects
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              ${grandTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {companies.map((company) => {
          const isExpanded = expandedCompanies.has(company.company_id);

          return (
            <Collapsible
              key={company.company_id}
              open={isExpanded}
              onOpenChange={() => toggleCompany(company.company_id)}
            >
              <Card className="border-2">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        <div className="text-left">
                          <CardTitle className="text-lg">{company.company_name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {company.projects.length} project{company.projects.length !== 1 ? 's' : ''} • {company.total_logs} log{company.total_logs !== 1 ? 's' : ''} • {company.total_hours.toFixed(2)} hours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          ${company.total_amount.toLocaleString()}
                        </p>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunPayment(company.company_id);
                          }}
                          className="mt-2 gap-2"
                          size="sm"
                        >
                          Run Payment for All
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead className="text-right">Logs</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {company.projects.map((project) => (
                            <TableRow key={project.project_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{project.project_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(project.earliest_date).toLocaleDateString()} - {new Date(project.latest_date).toLocaleDateString()}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{project.log_count}</TableCell>
                              <TableCell className="text-right">{project.total_hours.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                ${project.total_amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => handleRunPayment(company.company_id, project)}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  Pay This Project
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
