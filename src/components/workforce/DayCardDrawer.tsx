import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { 
  Clock, DollarSign, Calendar, User, Briefcase, Plus, X, Lock, Unlock,
  CheckCircle2, Copy, TrendingUp, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateDayCard, useCopyDayCard } from '@/hooks/useDayCards';
import type { DayCard, DayCardWithDetails } from '@/types/dayCard';
import { calculateDayCardCost, isDayCardEditable, getDayCardStatusColor, getPayStatusColor } from '@/types/dayCard';
import { toast } from 'sonner';

interface DayCardDrawerProps {
  dayCard: DayCardWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function DayCardDrawer({ dayCard, open, onOpenChange, onUpdated }: DayCardDrawerProps) {
  const [scheduledHours, setScheduledHours] = useState(0);
  const [loggedHours, setLoggedHours] = useState(0);
  const [notes, setNotes] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);

  const updateMutation = useUpdateDayCard();
  const copyMutation = useCopyDayCard();

  // Fetch projects for job splits
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, project_name').order('project_name');
      return data || [];
    },
  });

  // Fetch trades
  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data } = await supabase.from('trades').select('id, name').order('name');
      return data || [];
    },
  });

  // Load day card data
  useEffect(() => {
    if (dayCard) {
      setScheduledHours(dayCard.scheduled_hours || 0);
      setLoggedHours(dayCard.logged_hours || 0);
      setNotes(dayCard.notes || '');
      setJobs(dayCard.jobs || []);
    }
  }, [dayCard]);

  if (!dayCard) return null;

  const isEditable = isDayCardEditable(dayCard);
  const totalCost = calculateDayCardCost(dayCard);
  const activeHours = dayCard.logged_hours || dayCard.scheduled_hours;

  const handleSave = async () => {
    if (!dayCard) return;

    await updateMutation.mutateAsync({
      id: dayCard.id,
      data: {
        scheduled_hours: scheduledHours,
        logged_hours: loggedHours,
        notes,
        jobs: jobs.map(job => ({
          project_id: job.project_id,
          trade_id: job.trade_id,
          cost_code_id: job.cost_code_id,
          hours: job.hours,
          notes: job.notes,
        })),
      },
    });
    onUpdated?.();
  };

  const handleAddJob = () => {
    setJobs([...jobs, {
      project_id: '',
      trade_id: '',
      cost_code_id: null,
      hours: 0,
      notes: '',
    }]);
  };

  const handleRemoveJob = (index: number) => {
    setJobs(jobs.filter((_, i) => i !== index));
  };

  const handleJobChange = (index: number, field: string, value: any) => {
    const updated = [...jobs];
    updated[index] = { ...updated[index], [field]: value };
    setJobs(updated);
  };

  const handleRebalance = () => {
    if (jobs.length === 0) return;
    const hoursPerJob = activeHours / jobs.length;
    const updated = jobs.map(job => ({ ...job, hours: hoursPerJob }));
    setJobs(updated);
    toast.success('Hours rebalanced across jobs');
  };

  const handleCopyToPrevious = async () => {
    const date = new Date(dayCard.date);
    date.setDate(date.getDate() - 1);
    const targetDate = format(date, 'yyyy-MM-DD');
    
    await copyMutation.mutateAsync({
      dayCardId: dayCard.id,
      targetDate,
    });
  };

  const handleConvertToLogged = () => {
    setLoggedHours(scheduledHours);
    toast.success('Converted scheduled hours to logged hours');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {dayCard.worker_name}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getDayCardStatusColor(dayCard.status)}>
                {dayCard.status}
              </Badge>
              <Badge className={getPayStatusColor(dayCard.pay_status)}>
                {dayCard.pay_status}
              </Badge>
            </div>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(dayCard.date), 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {dayCard.trade_name || 'No trade'}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status & Lock Indicators */}
          {dayCard.locked && (
            <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Lock className="w-5 h-5" />
                <div>
                  <p className="font-semibold">This day card is locked</p>
                  <p className="text-sm">It cannot be edited because it has been marked as paid.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Scheduled Hours</p>
                  <p className="text-2xl font-bold">{dayCard.scheduled_hours.toFixed(1)}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Logged Hours</p>
                  <p className="text-2xl font-bold">{dayCard.logged_hours.toFixed(1)}</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pay Rate</p>
                  <p className="text-2xl font-bold">${dayCard.pay_rate?.toFixed(2) || '0.00'}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConvertToLogged}
              disabled={!isEditable || scheduledHours === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Convert to Logged
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToPrevious}
              disabled={!isEditable}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Previous Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRebalance}
              disabled={!isEditable || jobs.length === 0}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Rebalance Hours
            </Button>
          </div>

          <Separator />

          {/* Hours Edit */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled">Scheduled Hours</Label>
                <Input
                  id="scheduled"
                  type="number"
                  step="0.5"
                  value={scheduledHours}
                  onChange={(e) => setScheduledHours(parseFloat(e.target.value) || 0)}
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logged">Logged Hours</Label>
                <Input
                  id="logged"
                  type="number"
                  step="0.5"
                  value={loggedHours}
                  onChange={(e) => setLoggedHours(parseFloat(e.target.value) || 0)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Job Splits */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Job Splits</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddJob}
                disabled={!isEditable}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Job
              </Button>
            </div>

            {jobs.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No job splits yet. Add a job to split hours across multiple projects.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {jobs.map((job, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Job {index + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveJob(index)}
                          disabled={!isEditable}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Project</Label>
                          <Select
                            value={job.project_id}
                            onValueChange={(value) => handleJobChange(index, 'project_id', value)}
                            disabled={!isEditable}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects?.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.project_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Hours</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={job.hours}
                            onChange={(e) => handleJobChange(index, 'hours', parseFloat(e.target.value) || 0)}
                            disabled={!isEditable}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={job.notes || ''}
                          onChange={(e) => handleJobChange(index, 'notes', e.target.value)}
                          placeholder="Optional notes..."
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this work day..."
              rows={4}
              disabled={!isEditable}
            />
          </div>

          {/* Save Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={!isEditable || updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
