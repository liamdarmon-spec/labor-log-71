import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
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
import { getUnassignedCostCodeId } from '@/lib/costCodes';

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
  company_id: string;
  project_id: string;
  hours_worked: string;
  trade_id: string;
}

const DailyLog = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullDay, setIsFullDay] = useState(true);
  const [jobEntries, setJobEntries] = useState<JobEntry[]>([
    { id: '1', company_id: '', project_id: '', hours_worked: '', trade_id: '' }
  ]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    worker_id: '',
    notes: '',
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

  const getFilteredProjects = (companyId: string) => {
    if (!companyId) return [];
    return projects.filter(p => p.company_id === companyId);
  };

  const addJobEntry = () => {
    setJobEntries([...jobEntries, { id: Date.now().toString(), company_id: '', project_id: '', hours_worked: '', trade_id: '' }]);
  };

  const removeJobEntry = (id: string) => {
    if (jobEntries.length > 1) {
      setJobEntries(jobEntries.filter(entry => entry.id !== id));
    }
  };

  const updateJobEntry = (id: string, field: 'company_id' | 'project_id' | 'hours_worked' | 'trade_id', value: string) => {
    setJobEntries(jobEntries.map(entry => {
      if (entry.id === id) {
        // If changing company, reset project selection
        if (field === 'company_id') {
          return { ...entry, company_id: value, project_id: '' };
        }
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = logSchema.parse(formData);

      // Validate job entries
      if (isFullDay) {
        if (!jobEntries[0].company_id) {
          throw new Error('Please select a company');
        }
        if (!jobEntries[0].project_id) {
          throw new Error('Please select a project');
        }
      } else {
        // Validate all job entries
        const totalHours = jobEntries.reduce((sum, entry) => {
          const hours = parseFloat(entry.hours_worked) || 0;
          return sum + hours;
        }, 0);

        if (totalHours > 24) {
          throw new Error('Total hours cannot exceed 24');
        }

        for (const entry of jobEntries) {
          jobEntrySchema.parse({
            project_id: entry.project_id,
            hours_worked: parseFloat(entry.hours_worked),
          });
        }
      }

      setLoading(true);

      // Create log entries for each job
      const unassignedId = await getUnassignedCostCodeId();
      
      const logsToInsert = isFullDay 
        ? [{
            date: validatedData.date,
            worker_id: validatedData.worker_id,
            project_id: jobEntries[0].project_id,
            hours_worked: 8,
            notes: validatedData.notes || null,
            cost_code_id: unassignedId,
          }]
        : jobEntries.map(entry => ({
            date: validatedData.date,
            worker_id: validatedData.worker_id,
            project_id: entry.project_id,
            hours_worked: parseFloat(entry.hours_worked),
            notes: validatedData.notes || null,
            cost_code_id: unassignedId,
          }));

      const { error } = await supabase.from('daily_logs').insert(logsToInsert);

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
      setJobEntries([{ id: '1', company_id: '', project_id: '', hours_worked: '', trade_id: '' }]);
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
          description: 'Failed to submit log',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 border-b border-border bg-gradient-to-br from-card to-muted/30">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Daily Time Entry
            </CardTitle>
            <CardDescription className="text-base">
              Log your hours worked for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11"
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
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name} {worker.trades?.name && `- ${worker.trades.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      setJobEntries([{ id: '1', company_id: '', project_id: '', hours_worked: '', trade_id: '' }]);
                    }
                  }}
                  disabled={loading}
                />
              </div>

              {isFullDay ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      Company
                    </Label>
                    <Select
                      value={jobEntries[0].company_id}
                      onValueChange={(value) => updateJobEntry('1', 'company_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-11">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trade" className="text-sm font-medium">
                      Trade
                    </Label>
                    <Select
                      value={jobEntries[0].trade_id}
                      onValueChange={(value) => updateJobEntry('1', 'trade_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-11">
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
                    <Label htmlFor="project" className="text-sm font-medium">
                      Project
                    </Label>
                    <Select
                      value={jobEntries[0].project_id}
                      onValueChange={(value) => updateJobEntry('1', 'project_id', value)}
                      disabled={loading || !jobEntries[0].company_id}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={jobEntries[0].company_id ? "Select project" : "Select company first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {getFilteredProjects(jobEntries[0].company_id).map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name} - {project.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Jobs for the Day</Label>
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
                  </div>
                  
                  {jobEntries.map((entry, index) => (
                    <div key={entry.id} className="flex gap-2 items-start p-4 bg-muted/20 rounded-lg border border-border">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Company</Label>
                          <Select
                            value={entry.company_id}
                            onValueChange={(value) => updateJobEntry(entry.id, 'company_id', value)}
                            disabled={loading}
                          >
                            <SelectTrigger className="h-10">
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
                        </div>

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
                            onValueChange={(value) => updateJobEntry(entry.id, 'project_id', value)}
                            disabled={loading || !entry.company_id}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={entry.company_id ? "Select project" : "Select company first"} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {getFilteredProjects(entry.company_id).map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.project_name} - {project.client_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Hours</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="Hours"
                            value={entry.hours_worked}
                            onChange={(e) => updateJobEntry(entry.id, 'hours_worked', e.target.value)}
                            disabled={loading}
                            className="h-10"
                          />
                        </div>
                      </div>
                      
                      {jobEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeJobEntry(entry.id)}
                          disabled={loading}
                          className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the work done..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={loading}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DailyLog;
