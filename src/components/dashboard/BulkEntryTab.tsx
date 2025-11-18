import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Save, UserCheck, Plus, Trash2, Edit, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const jobEntrySchema = z.object({
  project_id: z.string().trim().nonempty({ message: 'Please select a project' }),
  hours_worked: z.number().positive({ message: 'Hours must be greater than 0' }).max(24, { message: 'Hours cannot exceed 24' }),
});

const workerSchema = z.object({
  name: z.string().trim().nonempty({ message: 'Name is required' }).max(100),
  trade_id: z.string().trim().nonempty({ message: 'Please select a trade' }),
  hourly_rate: z.number().positive({ message: 'Rate must be greater than 0' }).max(1000),
  phone: z.string().max(20).optional(),
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

export const BulkEntryTab = ({ onSuccess }: { onSuccess?: () => void }) => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [entries, setEntries] = useState<Record<string, BulkEntry>>({});
  const [excludedWorkers, setExcludedWorkers] = useState<Set<string>>(new Set());
  const [editingWorker, setEditingWorker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    trade_id: '',
    hourly_rate: '',
    phone: '',
  });
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

  const toggleWorkerExclusion = (workerId: string) => {
    setExcludedWorkers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      return newSet;
    });
  };

  const handleAddWorker = async () => {
    try {
      const validatedData = workerSchema.parse({
        name: newWorkerForm.name,
        trade_id: newWorkerForm.trade_id,
        hourly_rate: parseFloat(newWorkerForm.hourly_rate),
        phone: newWorkerForm.phone || undefined,
      });

      const { data, error } = await supabase
        .from('workers')
        .insert({
          name: validatedData.name,
          trade_id: validatedData.trade_id,
          hourly_rate: validatedData.hourly_rate,
          phone: validatedData.phone || null,
          trade: trades.find(t => t.id === validatedData.trade_id)?.name || '',
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Worker ${validatedData.name} added successfully`,
      });

      setIsAddWorkerDialogOpen(false);
      setNewWorkerForm({ name: '', trade_id: '', hourly_rate: '', phone: '' });
      fetchWorkers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
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

      // Call onSuccess callback if provided (for dialog close)
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to view logs page only if not in a dialog
        navigate('/view-logs');
      }

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

  const activeWorkers = workers.filter(w => !excludedWorkers.has(w.id));

  const totalHours = activeWorkers.reduce((sum, worker) => {
    return sum + getTotalHoursForWorker(worker.id);
  }, 0);

  const totalCost = activeWorkers.reduce((sum, worker) => {
    const hours = getTotalHoursForWorker(worker.id);
    return sum + (hours * worker.hourly_rate);
  }, 0);

  const workersWithHours = activeWorkers.filter(worker => {
    const entry = entries[worker.id];
    if (!entry) return false;
    const totalHours = getTotalHoursForWorker(worker.id);
    const hasProjects = entry.jobEntries.some(j => j.project_id);
    return totalHours > 0 && hasProjects;
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
          <div className="flex items-center justify-between gap-4">
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
            <Button
              variant="outline"
              onClick={() => setIsAddWorkerDialogOpen(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Worker
            </Button>
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
                {activeWorkers.map((worker) => {
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
                        <div className="flex items-center gap-2">
                          {entry.jobEntries.length > 0 && entry.jobEntries[0].project_id ? (
                            <div className="flex flex-col gap-1 flex-1">
                              {entry.jobEntries.map((job, idx) => {
                                const project = projects.find(p => p.id === job.project_id);
                                return project ? (
                                  <Badge key={idx} variant="secondary" className="text-xs gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    {project.project_name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          ) : null}
                          <Button
                            variant={entry.jobEntries.length > 0 && entry.jobEntries[0].project_id ? "outline" : "default"}
                            size="sm"
                            onClick={() => setEditingWorker(worker.id)}
                            className="whitespace-nowrap"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {entry.jobEntries.length > 0 && entry.jobEntries[0].project_id
                              ? 'Edit'
                              : 'Add Projects'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWorkerExclusion(worker.id)}
                            title="Remove worker from this entry"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Submission Summary Panel */}
          {workersWithHours > 0 && (
            <Card className="bg-muted/50 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Submission Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Workers</p>
                    <p className="text-2xl font-bold text-foreground">{workersWithHours}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Projects Breakdown:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {activeWorkers
                      .filter(worker => {
                        const entry = entries[worker.id];
                        return entry?.jobEntries.some(j => j.project_id);
                      })
                      .map(worker => {
                        const entry = entries[worker.id];
                        const workerProjects = entry?.jobEntries.filter(j => j.project_id) || [];
                        return (
                          <div key={worker.id} className="text-sm flex items-start gap-2">
                            <span className="font-medium text-foreground min-w-[120px]">{worker.name}:</span>
                            <div className="flex flex-wrap gap-1">
                              {workerProjects.map((job, idx) => {
                                const project = projects.find(p => p.id === job.project_id);
                                return project ? (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {project.project_name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end items-center pt-4">
            <Button onClick={handleSubmit} disabled={loading || workersWithHours === 0} className="gap-2">
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
                  onClick={() => {
                    setEditingWorker(null);
                    toast({
                      title: 'Projects saved',
                      description: `${entries[editingWorker]?.jobEntries.filter(j => j.project_id).length || 0} project(s) added successfully`,
                    });
                  }}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Worker Dialog */}
      <Dialog open={isAddWorkerDialogOpen} onOpenChange={setIsAddWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="worker-name">Name</Label>
              <Input
                id="worker-name"
                value={newWorkerForm.name}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                placeholder="Worker name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-trade">Trade</Label>
              <Select
                value={newWorkerForm.trade_id}
                onValueChange={(value) => setNewWorkerForm({ ...newWorkerForm, trade_id: value })}
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
            <div className="space-y-2">
              <Label htmlFor="worker-rate">Hourly Rate</Label>
              <Input
                id="worker-rate"
                type="number"
                step="0.01"
                value={newWorkerForm.hourly_rate}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, hourly_rate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-phone">Phone (Optional)</Label>
              <Input
                id="worker-phone"
                value={newWorkerForm.phone}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWorkerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWorker}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
