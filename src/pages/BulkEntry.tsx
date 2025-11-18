import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Save, UserCheck } from 'lucide-react';
import { z } from 'zod';

interface Worker {
  id: string;
  name: string;
  trades: { name: string } | null;
  hourly_rate: number;
}

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface BulkEntry {
  worker_id: string;
  company_id: string;
  project_id: string;
  hours_worked: string;
  notes: string;
}

const BulkEntry = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<Record<string, BulkEntry>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
    fetchCompanies();
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, trades(name), hourly_rate')
      .eq('active', true)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load workers',
        variant: 'destructive',
      });
    } else {
      setWorkers(data || []);
      // Initialize entries for all workers
      const initialEntries: Record<string, BulkEntry> = {};
      data?.forEach(worker => {
        initialEntries[worker.id] = {
          worker_id: worker.id,
          company_id: '',
          project_id: '',
          hours_worked: '',
          notes: '',
        };
      });
      setEntries(initialEntries);
    }
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, client_name, company_id')
      .eq('status', 'Active')
      .order('project_name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } else {
      setProjects(data || []);
    }
  };

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive',
      });
    } else {
      setCompanies(data || []);
    }
  };

  const getFilteredProjects = (companyId: string) => {
    if (!companyId) return [];
    return projects.filter(p => p.company_id === companyId);
  };

  const updateEntry = (workerId: string, field: keyof BulkEntry, value: string) => {
    setEntries(prev => {
      const updated = {
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [field]: value,
        },
      };
      
      // If changing company, reset project selection
      if (field === 'company_id') {
        updated[workerId].project_id = '';
      }
      
      return updated;
    });
  };

  const handleSubmit = async () => {
    // Filter entries that have hours worked
    const validEntries = Object.values(entries).filter(
      entry => entry.hours_worked && parseFloat(entry.hours_worked) > 0 && entry.project_id
    );

    if (validEntries.length === 0) {
      toast({
        title: 'No Entries',
        description: 'Please add hours for at least one worker',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const logsToInsert = validEntries.map(entry => ({
        date,
        worker_id: entry.worker_id,
        project_id: entry.project_id,
        hours_worked: parseFloat(entry.hours_worked),
        notes: entry.notes || null,
      }));

      const { error } = await supabase.from('daily_logs').insert(logsToInsert);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Added ${validEntries.length} time entries for ${new Date(date).toLocaleDateString()}`,
      });

      // Reset entries
      const resetEntries: Record<string, BulkEntry> = {};
      workers.forEach(worker => {
        resetEntries[worker.id] = {
          worker_id: worker.id,
          company_id: '',
          project_id: '',
          hours_worked: '',
          notes: '',
        };
      });
      setEntries(resetEntries);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalHours = Object.values(entries).reduce((sum, entry) => {
    const hours = parseFloat(entry.hours_worked) || 0;
    return sum + hours;
  }, 0);

  const totalCost = workers.reduce((sum, worker) => {
    const hours = parseFloat(entries[worker.id]?.hours_worked || '0');
    return sum + (hours * worker.hourly_rate);
  }, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bulk Time Entry</h1>
            <p className="text-muted-foreground mt-2">
              Add hours for all workers at once
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border bg-gradient-to-br from-card to-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Select Date
              </CardTitle>
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={loading || totalHours === 0}
                  className="gap-2"
                  size="lg"
                >
                  <Save className="w-4 h-4" />
                  Save All Entries
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-[200px]">Worker</TableHead>
                    <TableHead className="font-semibold w-[120px]">Trade</TableHead>
                    <TableHead className="font-semibold w-[100px]">Rate/hr</TableHead>
                    <TableHead className="font-semibold w-[180px]">Company</TableHead>
                    <TableHead className="font-semibold w-[250px]">Project</TableHead>
                    <TableHead className="font-semibold w-[120px]">Hours</TableHead>
                    <TableHead className="font-semibold w-[100px]">Cost</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => {
                    const entry = entries[worker.id];
                    const hours = parseFloat(entry?.hours_worked || '0');
                    const cost = hours * worker.hourly_rate;

                    return (
                      <TableRow key={worker.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            {worker.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {worker.trades?.name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ${worker.hourly_rate.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry?.company_id || ''}
                            onValueChange={(value) => updateEntry(worker.id, 'company_id', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry?.project_id || ''}
                            onValueChange={(value) => updateEntry(worker.id, 'project_id', value)}
                            disabled={!entry?.company_id}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={entry?.company_id ? "Select project" : "Select company first"} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {getFilteredProjects(entry?.company_id || '').map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.project_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="0"
                            value={entry?.hours_worked || ''}
                            onChange={(e) => updateEntry(worker.id, 'hours_worked', e.target.value)}
                            className="h-9 w-20"
                          />
                        </TableCell>
                        <TableCell className="font-semibold">
                          {cost > 0 ? `$${cost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Optional notes..."
                            value={entry?.notes || ''}
                            onChange={(e) => updateEntry(worker.id, 'notes', e.target.value)}
                            className="h-9"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Workers with Hours</p>
              <p className="text-lg font-bold">
                {Object.values(entries).filter(e => parseFloat(e.hours_worked || '0') > 0).length} / {workers.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-xl font-bold text-primary">{totalHours.toFixed(2)}h</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Estimated Labor Cost</p>
              <p className="text-xl font-bold text-primary">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BulkEntry;
