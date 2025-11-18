import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, FileText } from 'lucide-react';
import { z } from 'zod';

const logSchema = z.object({
  date: z.string().trim().nonempty({ message: 'Date is required' }),
  worker_id: z.string().trim().nonempty({ message: 'Please select a worker' }),
  project_id: z.string().trim().nonempty({ message: 'Please select a project' }),
  hours_worked: z.number().positive({ message: 'Hours must be greater than 0' }).max(24, { message: 'Hours cannot exceed 24' }),
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
}

const DailyLog = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    worker_id: '',
    project_id: '',
    hours_worked: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
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
      .select('id, project_name, client_name')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    try {
      const validatedData = logSchema.parse({
        ...formData,
        hours_worked: parseFloat(formData.hours_worked),
      });

      setLoading(true);

      const { error } = await supabase.from('daily_logs').insert([
        {
          date: validatedData.date,
          worker_id: validatedData.worker_id,
          project_id: validatedData.project_id,
          hours_worked: validatedData.hours_worked,
          notes: validatedData.notes || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Daily log submitted successfully',
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        worker_id: '',
        project_id: '',
        hours_worked: '',
        notes: '',
      });
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

              <div className="space-y-2">
                <Label htmlFor="project" className="text-sm font-medium">
                  Project
                </Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours" className="text-sm font-medium">
                  Hours Worked
                </Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="8.0"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

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
