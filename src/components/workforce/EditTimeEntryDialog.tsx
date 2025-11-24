/**
 * EditTimeEntryDialog - Unified time entry editor for the Workforce → Time Logs tab
 * 
 * Opens when clicking a grouped entry in the table
 * Allows full CRUD on time log allocations (project/trade/hours/notes per entry)
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { GroupedTimeLog } from '@/lib/timeLogGrouping';
import { useQuery } from '@tanstack/react-query';

interface TimeLogAllocation {
  id: string; // time_logs.id
  project_id: string;
  trade_id: string | null;
  cost_code_id: string | null;
  hours_worked: number;
  notes: string | null;
  source_schedule_id: string | null; // FK to work_schedules
}

interface EditTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupedTimeLog | null;
  onSuccess: () => void;
}

export function EditTimeEntryDialog({
  open,
  onOpenChange,
  group,
  onSuccess
}: EditTimeEntryDialogProps) {
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<TimeLogAllocation[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const isAddMode = !group?.worker_id;

  // Fetch workers (for add mode)
  const { data: workers } = useQuery({
    queryKey: ['workers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, trade, hourly_rate')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open && isAddMode
  });

  // Fetch projects and trades for dropdowns
  const { data: projects } = useQuery({
    queryKey: ['projects-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, client_name')
        .eq('status', 'Active')
        .order('project_name');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const { data: costCodes } = useQuery({
    queryKey: ['cost-codes-labor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .eq('category', 'labor')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Initialize allocations from group data
  useEffect(() => {
    if (group && open) {
      if (group.worker_id) {
        // Edit mode: load existing allocations
        const initialAllocations: TimeLogAllocation[] = group.projects.map(project => ({
          id: project.id,
          project_id: project.project_id,
          trade_id: project.trade_id,
          cost_code_id: project.cost_code_id,
          hours_worked: project.hours,
          notes: project.notes,
          source_schedule_id: project.source_schedule_id || null
        }));
        setAllocations(initialAllocations);
        setSelectedDate(new Date(group.date));
      } else {
        // Add mode: start with one empty allocation
        setAllocations([{
          id: `new-${crypto.randomUUID()}`,
          project_id: '',
          trade_id: null,
          cost_code_id: null,
          hours_worked: 8,
          notes: null,
          source_schedule_id: null
        }]);
        setSelectedWorker('');
        setSelectedDate(new Date());
      }
    }
  }, [group, open]);

  if (!group) return null;

  const totalHours = allocations.reduce((sum, alloc) => sum + alloc.hours_worked, 0);

  const handleUpdateAllocation = (id: string, field: keyof Omit<TimeLogAllocation, 'id'>, value: any) => {
    setAllocations(prev => prev.map(alloc =>
      alloc.id === id ? { ...alloc, [field]: value } : alloc
    ));
  };

  const handleAddAllocation = () => {
    // Get source_schedule_id from first allocation (they all share the same one)
    const sourceScheduleId = allocations.length > 0 ? allocations[0].source_schedule_id : null;
    
    setAllocations(prev => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        project_id: '',
        trade_id: null,
        cost_code_id: null,
        hours_worked: 0,
        notes: null,
        source_schedule_id: sourceScheduleId
      }
    ]);
  };

  const handleRemoveAllocation = (id: string) => {
    if (allocations.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'Must have at least one allocation',
        variant: 'destructive'
      });
      return;
    }
    setAllocations(prev => prev.filter(alloc => alloc.id !== id));
  };

  const handleSave = async () => {
    // Validate
    if (isAddMode && !selectedWorker) {
      toast({
        title: 'Missing worker',
        description: 'Please select a worker',
        variant: 'destructive'
      });
      return;
    }

    const invalidAllocations = allocations.filter(a => !a.project_id || a.hours_worked <= 0);
    if (invalidAllocations.length > 0) {
      toast({
        title: 'Invalid entries',
        description: 'All allocations must have a project and hours > 0',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      if (isAddMode) {
        // Insert new time logs
        // Get company_id from the first project
        const firstProject = await supabase
          .from('projects')
          .select('company_id')
          .eq('id', allocations[0].project_id)
          .single();

        if (firstProject.error) throw firstProject.error;

        for (const alloc of allocations) {
          const { error } = await supabase
            .from('time_logs')
            .insert({
              worker_id: selectedWorker,
              date: format(selectedDate, 'yyyy-MM-dd'),
              company_id: firstProject.data.company_id,
              project_id: alloc.project_id,
              trade_id: alloc.trade_id,
              cost_code_id: alloc.cost_code_id,
              hours_worked: alloc.hours_worked,
              notes: alloc.notes,
              source_schedule_id: null // Manual entry
            });

          if (error) throw error;
        }

        toast({
          title: 'Success',
          description: 'Time log created successfully'
        });
      } else {
        // Edit mode: existing logic
        const existingAllocations = allocations.filter(a => !a.id.startsWith('new-'));
        const newAllocations = allocations.filter(a => a.id.startsWith('new-'));

        // Find allocations to delete
        const originalIds = group!.log_ids;
        const currentIds = existingAllocations.map(a => a.id);
        const idsToDelete = originalIds.filter(id => !currentIds.includes(id));

        // Update existing allocations
        for (const alloc of existingAllocations) {
          const { error } = await supabase
            .from('time_logs')
            .update({
              project_id: alloc.project_id,
              trade_id: alloc.trade_id,
              cost_code_id: alloc.cost_code_id,
              hours_worked: alloc.hours_worked,
              notes: alloc.notes
            })
            .eq('id', alloc.id);

          if (error) throw error;
        }

        // Insert new allocations
        for (const alloc of newAllocations) {
          const { error } = await supabase
            .from('time_logs')
            .insert({
              worker_id: group!.worker_id,
              date: group!.date,
              company_id: group!.company_id,
              project_id: alloc.project_id,
              trade_id: alloc.trade_id,
              cost_code_id: alloc.cost_code_id,
              hours_worked: alloc.hours_worked,
              notes: alloc.notes,
              source_schedule_id: alloc.source_schedule_id
            });

          if (error) throw error;
        }

        // Delete removed allocations
        if (idsToDelete.length > 0) {
          const { error } = await supabase
            .from('time_logs')
            .delete()
            .in('id', idsToDelete);

          if (error) throw error;
        }

        toast({
          title: 'Success',
          description: 'Time entry updated successfully'
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving time entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save time entry',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAddMode ? 'Add Time Log' : 'Edit Time Entry'}</DialogTitle>
        </DialogHeader>

        {/* Header Info */}
        {!isAddMode ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{group!.worker_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(group!.date), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Worker *</Label>
                  <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers?.map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <DatePickerWithPresets
                    date={selectedDate}
                    onDateChange={setSelectedDate}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allocations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Project Allocations</Label>
            <Badge variant="secondary">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</Badge>
          </div>

          {allocations.map((alloc, index) => (
            <Card key={alloc.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Allocation {index + 1}
                  </span>
                  {allocations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAllocation(alloc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Project *</Label>
                    <Select
                      value={alloc.project_id}
                      onValueChange={(value) => handleUpdateAllocation(alloc.id, 'project_id', value)}
                    >
                      <SelectTrigger className="h-9">
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

                  <div className="space-y-2">
                    <Label className="text-xs">Trade</Label>
                    <Select
                      value={alloc.trade_id || 'none'}
                      onValueChange={(value) => handleUpdateAllocation(alloc.id, 'trade_id', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Trade</SelectItem>
                        {trades?.map(trade => (
                          <SelectItem key={trade.id} value={trade.id}>
                            {trade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Hours *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      className="h-9"
                      value={alloc.hours_worked}
                      onChange={(e) => handleUpdateAllocation(alloc.id, 'hours_worked', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Cost Code</Label>
                    <Select
                      value={alloc.cost_code_id || 'none'}
                      onValueChange={(value) => handleUpdateAllocation(alloc.id, 'cost_code_id', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select cost code" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Cost Code</SelectItem>
                        {costCodes?.map(code => (
                          <SelectItem key={code.id} value={code.id}>
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    className="h-16 resize-none"
                    value={alloc.notes || ''}
                    onChange={(e) => handleUpdateAllocation(alloc.id, 'notes', e.target.value || null)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAllocation}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Project
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}