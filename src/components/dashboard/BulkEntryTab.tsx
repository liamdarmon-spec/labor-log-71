import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Save, UserCheck, Plus, Trash2, Edit } from 'lucide-react';
import { z } from 'zod';

const jobEntrySchema = z.object({
  project_id: z.string().trim().nonempty({ message: 'Please select a project' }),
  hours_worked: z.number().positive({ message: 'Hours must be greater than 0' }).max(24, { message: 'Hours cannot exceed 24' }),
});

interface Worker {
  id: string;
  name: string;
  trades: { name: string } | null;
  hourly_rate: number;
  trade_id: string | null;
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

interface Trade {
  id: string;
  name: string;
}

interface JobEntry {
  id: string;
  project_id: string;
  hours_worked: string;
  trade_id: string;
}

interface BulkEntry {
  worker_id: string;
  isFullDay: boolean;
  jobEntries: JobEntry[];
  notes: string;
}

export const BulkEntryTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [entries, setEntries] = useState<Record<string, BulkEntry>>({});
  const [editingWorker, setEditingWorker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
    fetchCompanies();
    fetchTrades();
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, trades(name), hourly_rate, trade_id')
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
          isFullDay: true,
          jobEntries: [{ id: '1', project_id: '', hours_worked: '', trade_id: worker.trade_id || '' }],
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

  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load trades',
        variant: 'destructive',
      });
    } else {
      setTrades(data || []);
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

  const updateEntry = (workerId: string, field: 'isFullDay' | 'notes', value: boolean | string) => {
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value,
      },
    }));
  };


  const addJobEntry = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        isFullDay: false, // Disable full day when adding multiple projects
        jobEntries: [
          ...prev[workerId].jobEntries,
          {
            id: Date.now().toString(),
            project_id: '',
            hours_worked: '',
            trade_id: worker?.trade_id || '',
          }
        ]
      }
    }));
  };

  const removeJobEntry = (workerId: string, entryId: string) => {
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        jobEntries: prev[workerId].jobEntries.filter(e => e.id !== entryId)
      }
    }));
  };

  const updateJobEntry = (workerId: string, entryId: string, field: keyof JobEntry, value: string) => {
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        jobEntries: prev[workerId].jobEntries.map(e =>
          e.id === entryId
            ? {
                ...e,
                [field]: value,
              }
            : e
        )
      }
    }));
  };

  const getTotalHoursForWorker = (workerId: string) => {
    const entry = entries[workerId];
    if (!entry) return 0;
    
    if (entry.isFullDay) return 8;
    
    return entry.jobEntries.reduce((sum, job) => {
      return sum + (parseFloat(job.hours_worked) || 0);
    }, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validEntries: any[] = [];
      const errors: string[] = [];

      Object.values(entries).forEach((entry) => {
        const worker = workers.find(w => w.id === entry.worker_id);
        if (!worker) return;

        const totalHours = getTotalHoursForWorker(entry.worker_id);
        if (totalHours === 0) return;

        // Validate job entries
        entry.jobEntries.forEach((job, index) => {
          if (!job.project_id || (!entry.isFullDay && !job.hours_worked)) return;

          try {
            const hours = entry.isFullDay ? 8 : parseFloat(job.hours_worked);
            
            jobEntrySchema.parse({
              project_id: job.project_id,
              hours_worked: hours,
            });

            validEntries.push({
              date,
              worker_id: entry.worker_id,
              project_id: job.project_id,
              hours_worked: hours,
              trade_id: job.trade_id || null,
              notes: entry.notes || null,
            });
          } catch (error) {
            if (error instanceof z.ZodError) {
              errors.push(`${worker.name} - Entry ${index + 1}: ${error.errors[0].message}`);
            }
          }
        });
      });

      if (errors.length > 0) {
        toast({
          title: 'Validation Errors',
          description: errors.join(', '),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (validEntries.length === 0) {
        toast({
          title: 'No entries to save',
          description: 'Please add at least one entry with hours',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('daily_logs').insert(validEntries);

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
          isFullDay: true,
          jobEntries: [{ id: '1', project_id: '', hours_worked: '', trade_id: worker.trade_id || '' }],
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

  const totalHours = workers.reduce((sum, worker) => {
    return sum + getTotalHoursForWorker(worker.id);
  }, 0);

  const totalCost = workers.reduce((sum, worker) => {
    const hours = getTotalHoursForWorker(worker.id);
    return sum + (hours * worker.hourly_rate);
  }, 0);

  const workersWithHours = workers.filter(worker => {
    return getTotalHoursForWorker(worker.id) > 0;
  }).length;

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
                  <TableHead className="w-[180px]">Worker</TableHead>
                  <TableHead className="w-[120px]">Trade</TableHead>
                  <TableHead className="w-[120px]">Full Day</TableHead>
                  <TableHead className="w-[120px]">Hours</TableHead>
                  <TableHead className="w-[120px]">Cost</TableHead>
                  <TableHead className="w-[200px]">Notes</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => {
                  const entry = entries[worker.id] || { 
                    worker_id: worker.id, 
                    isFullDay: true,
                    jobEntries: [{ id: '1', company_id: '', project_id: '', hours_worked: '', trade_id: worker.trade_id || '' }],
                    notes: '' 
                  };
                  const totalHours = getTotalHoursForWorker(worker.id);
                  const cost = totalHours * worker.hourly_rate;

                  return (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {worker.trades?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={entry.isFullDay}
                          onCheckedChange={(checked) => updateEntry(worker.id, 'isFullDay', checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {totalHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {totalHours > 0 ? `$${cost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Notes..."
                          value={entry.notes}
                          onChange={(e) => updateEntry(worker.id, 'notes', e.target.value)}
                          className="min-h-[60px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingWorker(worker.id)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {entry.jobEntries.length > 0 && entry.jobEntries[0].project_id
                            ? `${entry.jobEntries.length} Project${entry.jobEntries.length > 1 ? 's' : ''}`
                            : 'Add Projects'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">Workers with Hours:</span> {workersWithHours} | 
              <span className="font-semibold ml-2">Total Hours:</span> {totalHours.toFixed(2)} | 
              <span className="font-semibold ml-2">Total Cost:</span> ${totalCost.toFixed(2)}
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              Save All Entries
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Entry Dialog */}
      <Dialog open={!!editingWorker} onOpenChange={(open) => !open && setEditingWorker(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add Projects for {workers.find(w => w.id === editingWorker)?.name}
            </DialogTitle>
          </DialogHeader>
          {editingWorker && entries[editingWorker] && (
            <div className="space-y-4">
              {entries[editingWorker].jobEntries.map((job, index) => {
                return (
                  <div key={job.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Project Entry {index + 1}</h4>
                      {entries[editingWorker].jobEntries.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJobEntry(editingWorker, job.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project</Label>
                        <Select
                          value={job.project_id}
                          onValueChange={(value) => updateJobEntry(editingWorker, job.id, 'project_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.project_name} - {project.client_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Trade</Label>
                        <Select
                          value={job.trade_id}
                          onValueChange={(value) => updateJobEntry(editingWorker, job.id, 'trade_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                          <SelectContent>
                            {trades.map((trade) => (
                              <SelectItem key={trade.id} value={trade.id}>
                                {trade.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!entries[editingWorker].isFullDay && (
                        <div className="space-y-2">
                          <Label>Hours</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="0.0"
                            value={job.hours_worked}
                            onChange={(e) => updateJobEntry(editingWorker, job.id, 'hours_worked', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => addJobEntry(editingWorker)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Project
                </Button>
                <Button
                  onClick={() => setEditingWorker(null)}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
