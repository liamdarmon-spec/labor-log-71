/**
 * SplitScheduleDialog - Multi-project split for work_schedules
 * 
 * CANONICAL: Calls split_schedule_for_multi_project RPC
 * 
 * The RPC function:
 * - Updates the original work_schedules entry with first project split
 * - Creates new work_schedules entries for additional projects
 * - Creates/updates linked time_logs for each split
 * - All operations are atomic via database function
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface Trade {
  id: string;
  name: string;
}

interface ProjectEntry {
  project_id: string;
  trade_id: string;
  hours: string;
  notes: string;
}

interface SplitScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string;
  workerName: string;
  originalDate: string;
  originalHours: number;
  originalProjectId: string;
  onSuccess: () => void;
}

export function SplitScheduleDialog({
  isOpen,
  onClose,
  scheduleId,
  workerName,
  originalDate,
  originalHours,
  originalProjectId,
  onSuccess
}: SplitScheduleDialogProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [entries, setEntries] = useState<ProjectEntry[]>([
    { project_id: originalProjectId, trade_id: '', hours: originalHours.toString(), notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    const [projectsData, tradesData] = await Promise.all([
      supabase.from('projects').select('id, project_name, client_name').eq('status', 'Active'),
      supabase.from('trades').select('id, name')
    ]);

    if (projectsData.data) setProjects(projectsData.data);
    if (tradesData.data) setTrades(tradesData.data);
  };

  const addEntry = () => {
    setEntries([...entries, { project_id: '', trade_id: '', hours: '', notes: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length === 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof ProjectEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const totalHours = entries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
  const hasErrors = entries.some(e => !e.project_id || !e.hours || parseFloat(e.hours) <= 0);

  const handleSubmit = async () => {
    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all project and hours fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the split schedule function
      const { data, error } = await supabase.rpc('split_schedule_for_multi_project', {
        p_original_schedule_id: scheduleId,
        p_time_log_entries: entries.map(e => ({
          project_id: e.project_id,
          hours: parseFloat(e.hours),
          trade_id: e.trade_id || null,
          notes: e.notes || null
        }))
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Schedule split into ${entries.length} entries with linked time logs`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to split schedule',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Schedule for Multiple Projects</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{workerName}</strong> worked on multiple projects on{' '}
              <strong>{new Date(originalDate).toLocaleDateString()}</strong>.
              <br />
              Originally scheduled: <strong>{originalHours}h</strong>
              <br />
              The original schedule will be split into {entries.length} linked schedule-timelog pair(s).
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Project {index + 1}</h4>
                  {entries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      className="h-8 px-2 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select
                      value={entry.project_id}
                      onValueChange={(value) => updateEntry(index, 'project_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.project_name} - {p.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trade</Label>
                    <Select
                      value={entry.trade_id}
                      onValueChange={(value) => updateEntry(index, 'trade_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {trades.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hours Worked *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={entry.hours}
                    onChange={(e) => updateEntry(index, 'hours', e.target.value)}
                    placeholder="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={entry.notes}
                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                    placeholder="Add notes about this work"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addEntry}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Project
          </Button>

          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Hours:</span>
            <span className={`text-lg font-bold ${totalHours !== originalHours ? 'text-destructive' : 'text-primary'}`}>
              {totalHours.toFixed(1)}h
              {totalHours !== originalHours && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Original: {originalHours}h)
                </span>
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={hasErrors || isSubmitting}>
            {isSubmitting ? 'Splitting...' : `Split into ${entries.length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}