import { useState, useEffect } from 'react';
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

export const BulkEntryTab = () => {
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

  const updateEntry = (workerId: string, field: keyof BulkEntry, value: string) => {
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value,
        // Clear project when company changes
        ...(field === 'company_id' ? { project_id: '' } : {})
      },
    }));
  };

  const getFilteredProjects = (companyId: string) => {
    if (!companyId) return [];
    return projects.filter(p => p.company_id === companyId);
  };

  const handleSubmit = async () => {
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
        description: `Logged ${validEntries.length} time entries for ${date}`,
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save entries',
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

  const totalCost = Object.values(entries).reduce((sum, entry) => {
    const hours = parseFloat(entry.hours_worked) || 0;
    const worker = workers.find(w => w.id === entry.worker_id);
    return sum + (hours * (worker?.hourly_rate || 0));
  }, 0);

  const workersWithHours = Object.values(entries).filter(
    entry => entry.hours_worked && parseFloat(entry.hours_worked) > 0
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Daily Time Entry</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span className="text-muted-foreground">{workersWithHours} workers</span>
              </div>
              <div className="text-muted-foreground">
                {totalHours.toFixed(2)} hrs
              </div>
              <div className="text-primary font-semibold">
                ${totalCost.toFixed(2)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Worker</TableHead>
                  <TableHead className="w-[150px]">Trade</TableHead>
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead className="w-[250px]">Project</TableHead>
                  <TableHead className="w-[120px]">Hours</TableHead>
                  <TableHead className="w-[120px]">Cost</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => {
                  const entry = entries[worker.id] || { worker_id: worker.id, company_id: '', project_id: '', hours_worked: '', notes: '' };
                  const hours = parseFloat(entry.hours_worked) || 0;
                  const cost = hours * worker.hourly_rate;
                  const filteredProjects = getFilteredProjects(entry.company_id);

                  return (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {worker.trades?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.company_id}
                          onValueChange={(value) => updateEntry(worker.id, 'company_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
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
                          value={entry.project_id}
                          onValueChange={(value) => updateEntry(worker.id, 'project_id', value)}
                          disabled={!entry.company_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={entry.company_id ? "Select project" : "Select company first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.project_name} - {project.client_name}
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
                          placeholder="0.0"
                          value={entry.hours_worked}
                          onChange={(e) => updateEntry(worker.id, 'hours_worked', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {hours > 0 ? `$${cost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Notes..."
                          value={entry.notes}
                          onChange={(e) => updateEntry(worker.id, 'notes', e.target.value)}
                          className="min-h-[60px]"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Workers with Hours: </span>
                <span className="font-semibold">{workersWithHours}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Hours: </span>
                <span className="font-semibold">{totalHours.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Cost: </span>
                <span className="font-semibold text-primary">${totalCost.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading} size="lg">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save All Entries'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
