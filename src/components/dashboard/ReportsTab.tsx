import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText } from 'lucide-react';

interface ReportData {
  project: string;
  client: string;
  totalHours: number;
  totalCost: number;
  workers: Array<{ name: string; hours: number; cost: number }>;
}

export const ReportsTab = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name');
    setProjects(data || []);
  };

  const generateReport = async () => {
    try {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers (name, hourly_rate),
          projects (project_name, client_name)
        `);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (projectFilter !== 'all') query = query.eq('project_id', projectFilter);

      const { data: logs, error } = await query;
      if (error) throw error;

      if (!logs || logs.length === 0) {
        setReportData([]);
        toast({
          title: 'No Data',
          description: 'No logs found for the selected filters',
          variant: 'destructive',
        });
        return;
      }

      // Group by project
      const projectMap = logs.reduce((acc: any, log) => {
        const projectName = (log.projects as any).project_name;
        const clientName = (log.projects as any).client_name;
        const workerName = (log.workers as any).name;
        const hours = parseFloat(log.hours_worked.toString());
        const rate = (log.workers as any).hourly_rate;
        const cost = hours * rate;

        if (!acc[projectName]) {
          acc[projectName] = {
            project: projectName,
            client: clientName,
            totalHours: 0,
            totalCost: 0,
            workers: {},
          };
        }

        acc[projectName].totalHours += hours;
        acc[projectName].totalCost += cost;

        if (!acc[projectName].workers[workerName]) {
          acc[projectName].workers[workerName] = { name: workerName, hours: 0, cost: 0 };
        }
        acc[projectName].workers[workerName].hours += hours;
        acc[projectName].workers[workerName].cost += cost;

        return acc;
      }, {});

      const report = Object.values(projectMap).map((p: any) => ({
        ...p,
        workers: Object.values(p.workers),
      }));

      setReportData(report);
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-start-date">Start Date</Label>
              <Input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end-date">End Date</Label>
              <Input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-project">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger id="report-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateReport} className="gap-2">
            <FileText className="w-4 h-4" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <div className="space-y-4">
          {reportData.map((project, idx) => (
            <Card key={idx}>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{project.project}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{project.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Total Hours: {project.totalHours.toFixed(1)}h</p>
                    <p className="text-lg font-bold text-primary">
                      Total Cost: ${project.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.workers.map((worker, widx) => (
                      <TableRow key={widx}>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell className="text-right">{worker.hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">${worker.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
