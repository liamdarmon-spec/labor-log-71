import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  hourly_rate: number;
}

interface Project {
  id: string;
  project_name: string;
}

interface ReportData {
  worker_name?: string;
  project_name?: string;
  total_hours: number;
  labor_cost: number;
  date?: string;
}

export const ReportsTab = () => {
  const [reportType, setReportType] = useState<'project' | 'worker' | 'daterange'>('project');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState({ totalHours: 0, totalCost: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
  }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('id, name, hourly_rate')
      .eq('active', true)
      .order('name');
    setWorkers(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('status', 'Active')
      .order('project_name');
    setProjects(data || []);
  };

  const generateReport = async () => {
    try {
      if (reportType === 'project' && !selectedProject) {
        toast({
          title: 'Error',
          description: 'Please select a project',
          variant: 'destructive',
        });
        return;
      }

      if (reportType === 'worker' && !selectedWorker) {
        toast({
          title: 'Error',
          description: 'Please select a worker',
          variant: 'destructive',
        });
        return;
      }

      if (reportType === 'daterange' && (!startDate || !endDate)) {
        toast({
          title: 'Error',
          description: 'Please select date range',
          variant: 'destructive',
        });
        return;
      }

      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers (name, hourly_rate),
          projects (project_name)
        `);

      if (reportType === 'project') {
        query = query.eq('project_id', selectedProject);
      } else if (reportType === 'worker') {
        query = query.eq('worker_id', selectedWorker);
      } else if (reportType === 'daterange') {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data for reporting
      const processed = data?.map((log: any) => ({
        worker_name: log.workers.name,
        project_name: log.projects.project_name,
        date: log.date,
        total_hours: parseFloat(log.hours_worked),
        labor_cost: parseFloat(log.hours_worked) * parseFloat(log.workers.hourly_rate),
      })) || [];

      setReportData(processed);

      // Calculate summary
      const totalHours = processed.reduce((sum, item) => sum + item.total_hours, 0);
      const totalCost = processed.reduce((sum, item) => sum + item.labor_cost, 0);
      setSummary({ totalHours, totalCost });

      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(2)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="project">By Project</SelectItem>
                  <SelectItem value="worker">By Worker</SelectItem>
                  <SelectItem value="daterange">By Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'project' && (
              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'worker' && (
              <div className="space-y-2">
                <Label>Select Worker</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose worker" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'daterange' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <Button onClick={generateReport} className="w-full">
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {reportType === 'daterange' && <TableHead>Date</TableHead>}
                    {reportType !== 'worker' && <TableHead>Worker</TableHead>}
                    {reportType !== 'project' && <TableHead>Project</TableHead>}
                    <TableHead>Hours</TableHead>
                    <TableHead>Labor Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      {reportType === 'daterange' && (
                        <TableCell>{new Date(row.date!).toLocaleDateString()}</TableCell>
                      )}
                      {reportType !== 'worker' && <TableCell>{row.worker_name}</TableCell>}
                      {reportType !== 'project' && <TableCell>{row.project_name}</TableCell>}
                      <TableCell>{row.total_hours.toFixed(2)}h</TableCell>
                      <TableCell>${row.labor_cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
