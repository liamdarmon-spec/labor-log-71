import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, FileText, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { AddProjectDialog } from './AddProjectDialog';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { useCostCodes } from '@/hooks/useCostCodes';

const jobEntrySchema = z.object({
  project_id: z.string().trim().nonempty({ message: 'Please select a project' }),
  hours_worked: z.number().positive({ message: 'Hours must be greater than 0' }).max(24, { message: 'Hours cannot exceed 24' }),
});

const logSchema = z.object({
  date: z.string().trim().nonempty({ message: 'Date is required' }),
  worker_id: z.string().trim().nonempty({ message: 'Please select a worker' }),
  notes: z.string().max(1000, { message: 'Notes must be less than 1000 characters' }).optional(),
});

interface Worker {
  id: string;
  name: string;
  trades: { name: string } | null;
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
  cost_code_id: string;
}

export const SingleEntryTab = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullDay, setIsFullDay] = useState(true);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [jobEntries, setJobEntries] = useState<JobEntry[]>([
    { id: '1', project_id: '', hours_worked: '', trade_id: '', cost_code_id: '' }
  ]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    worker_id: '',
    notes: '',
  });
  const { toast } = useToast();
  const { data: laborCostCodes } = useCostCodes('labor');

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
    fetchCompanies();
    fetchTrades();
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, trades(name)')
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


  const addJobEntry = () => {
    setJobEntries([...jobEntries, { id: Date.now().toString(), project_id: '', hours_worked: '', trade_id: '', cost_code_id: '' }]);
    setIsFullDay(false);
  };

  const removeJobEntry = (id: string) => {
    if (jobEntries.length > 1) {
      setJobEntries(jobEntries.filter(entry => entry.id !== id));
    }
  };

  const updateJobEntry = (id: string, field: 'project_id' | 'hours_worked' | 'trade_id' | 'cost_code_id', value: string) => {
    setJobEntries(jobEntries.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      logSchema.parse({
        ...formData,
      });

      const logsToInsert: any[] = [];
      const errors: string[] = [];

      jobEntries.forEach((job, index) => {
        if (!job.project_id) return;

        try {
          const hours = isFullDay ? 8 : parseFloat(job.hours_worked);
          
          jobEntrySchema.parse({
            project_id: job.project_id,
            hours_worked: hours,
          });

          const logEntry = {
            date: formData.date,
            worker_id: formData.worker_id,
            project_id: job.project_id,
            hours_worked: hours,
            trade_id: job.trade_id || null,
            cost_code_id: job.cost_code_id || null,
            notes: formData.notes || null,
          };

          logsToInsert.push(logEntry);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Entry ${index + 1}: ${error.errors[0].message}`);
          }
        }
      });

      if (errors.length > 0) {
        toast({
          title: 'Validation Error',
          description: errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      if (logsToInsert.length === 0) {
        toast({
          title: 'No entries',
          description: 'Please select at least one project',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      const { error } = await supabase.from('time_logs').insert(logsToInsert);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Daily log submitted successfully',
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        worker_id: '',
        notes: '',
      });
      setJobEntries([{ id: '1', project_id: '', hours_worked: '', trade_id: '', cost_code_id: '' }]);
      setIsFullDay(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit log entry',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Single Time Entry
        </CardTitle>
        <CardDescription>
          Log hours worked for a single worker on one or more projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </Label>
              <DatePickerWithPresets
                date={new Date(formData.date)}
                onDateChange={(date) => setFormData({ ...formData, date: date.toISOString().split('T')[0] })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker" className="text-sm font-medium">
                Worker
              </Label>
              <Select
                value={formData.worker_id}
                onValueChange={(value) => setFormData({ ...formData, worker_id: value })}
                disabled={loading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.trades?.name || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="full-day" className="text-sm font-medium">
                Full Day (8 hours)
              </Label>
              <p className="text-xs text-muted-foreground">
                Toggle off to split hours across multiple jobs
              </p>
            </div>
            <Switch
              id="full-day"
              checked={isFullDay}
              onCheckedChange={(checked) => {
                setIsFullDay(checked);
                if (checked) {
                  setJobEntries([{ id: '1', project_id: '', hours_worked: '', trade_id: '', cost_code_id: '' }]);
                }
              }}
              disabled={loading}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Jobs for the Day</Label>
              {!isFullDay && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addJobEntry}
                  disabled={loading}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Job
                </Button>
              )}
            </div>
            
            {jobEntries.map((entry, index) => (
              <div key={entry.id} className="flex gap-2 items-start p-4 bg-muted/20 rounded-lg border border-border">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Trade</Label>
                    <Select
                      value={entry.trade_id}
                      onValueChange={(value) => updateJobEntry(entry.id, 'trade_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {trades.map((trade) => (
                          <SelectItem key={trade.id} value={trade.id}>
                            {trade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <Select
                      value={entry.project_id}
                      onValueChange={(value) => {
                        if (value === 'add-new') {
                          setIsAddProjectDialogOpen(true);
                        } else {
                          updateJobEntry(entry.id, 'project_id', value);
                        }
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="add-new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add New Project
                          </div>
                        </SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name} - {project.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cost Code</Label>
                    <Select
                      value={entry.cost_code_id}
                      onValueChange={(value) => updateJobEntry(entry.id, 'cost_code_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select cost code (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {laborCostCodes?.map((code) => (
                          <SelectItem key={code.id} value={code.id}>
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!isFullDay && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder="0.0"
                        value={entry.hours_worked}
                        onChange={(e) => updateJobEntry(entry.id, 'hours_worked', e.target.value)}
                        disabled={loading}
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {!isFullDay && jobEntries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJobEntry(entry.id)}
                    disabled={loading}
                    className="mt-7"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the work..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full gap-2">
            <Clock className="w-4 h-4" />
            Submit Log Entry
          </Button>
        </form>
      </CardContent>
      
      <AddProjectDialog 
        open={isAddProjectDialogOpen} 
        onOpenChange={setIsAddProjectDialogOpen}
        onProjectAdded={fetchProjects}
      />
    </Card>
  );
};
