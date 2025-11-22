import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SubScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  projectId?: string;
  subId?: string;
}

export function SubScheduleDialog({ 
  open, 
  onOpenChange, 
  selectedDate,
  projectId: initialProjectId,
  subId: initialSubId
}: SubScheduleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    sub_id: initialSubId || '',
    project_id: initialProjectId || '',
    scheduled_date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    scheduled_hours: '8',
    notes: '',
  });

  const { data: subs } = useQuery({
    queryKey: ['subs-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select(`
          *,
          trades (name)
        `)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('status', 'Active')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('sub_scheduled_shifts')
        .insert([{
          ...data,
          scheduled_hours: Number(data.scheduled_hours),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['project-sub-schedule'] });
      toast({ title: 'Subcontractor scheduled successfully' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ 
        title: 'Error scheduling subcontractor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Subcontractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Subcontractor *</Label>
            <Select
              value={formData.sub_id}
              onValueChange={(value) => setFormData({ ...formData, sub_id: value })}
              required
              disabled={!!initialSubId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subcontractor" />
              </SelectTrigger>
              <SelectContent>
                {subs?.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name} - {sub.trades?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              required
              disabled={!!initialProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Hours *</Label>
            <Input
              type="number"
              step="0.5"
              value={formData.scheduled_hours}
              onChange={(e) => setFormData({ ...formData, scheduled_hours: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule Sub</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
