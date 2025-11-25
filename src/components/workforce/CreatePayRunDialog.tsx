import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultDateRangeStart?: string;
  defaultDateRangeEnd?: string;
  defaultCompanyId?: string;
  defaultWorkerId?: string;
  defaultProjectId?: string;
}

interface TimeLogWithDetails {
  id: string;
  date: string;
  hours_worked: number;
  labor_cost: number;
  hourly_rate: number;
  worker_id: string;
  project_id: string;
  worker: { name: string };
  project: { project_name: string };
}

export function CreatePayRunDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultDateRangeStart,
  defaultDateRangeEnd,
  defaultCompanyId,
  defaultWorkerId,
  defaultProjectId,
}: CreatePayRunDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [dateRangeStart, setDateRangeStart] = useState(defaultDateRangeStart || '');
  const [dateRangeEnd, setDateRangeEnd] = useState(defaultDateRangeEnd || '');
  const [payerCompanyId, setPayerCompanyId] = useState<string>(defaultCompanyId || '');
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch unpaid time logs (only when step 2)
  const { data: timeLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['unpaid-time-logs', dateRangeStart, dateRangeEnd, defaultWorkerId, defaultProjectId],
    queryFn: async () => {
      if (!dateRangeStart || !dateRangeEnd) return [];
      
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          worker:workers(name),
          project:projects(project_name)
        `)
        .eq('payment_status', 'unpaid')
        .gte('date', dateRangeStart)
        .lte('date', dateRangeEnd);

      // Apply optional worker filter
      if (defaultWorkerId) {
        query = query.eq('worker_id', defaultWorkerId);
      }

      // Apply optional project filter
      if (defaultProjectId) {
        query = query.eq('project_id', defaultProjectId);
      }

      query = query
        .order('worker_id')
        .order('project_id')
        .order('date');

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeLogWithDetails[];
    },
    enabled: step === 2 && !!dateRangeStart && !!dateRangeEnd,
  });

  // Group time logs by worker and project
  const groupedLogs = useMemo(() => {
    if (!timeLogs) return new Map();
    
    const groups = new Map<string, Map<string, TimeLogWithDetails[]>>();
    
    timeLogs.forEach(log => {
      if (!groups.has(log.worker_id)) {
        groups.set(log.worker_id, new Map());
      }
      const workerProjects = groups.get(log.worker_id)!;
      if (!workerProjects.has(log.project_id)) {
        workerProjects.set(log.project_id, []);
      }
      workerProjects.get(log.project_id)!.push(log);
    });
    
    return groups;
  }, [timeLogs]);

  // Calculate totals for selected logs
  const selectedTotals = useMemo(() => {
    if (!timeLogs) return { hours: 0, amount: 0 };
    
    const selected = timeLogs.filter(log => selectedLogIds.has(log.id));
    return {
      hours: selected.reduce((sum, log) => sum + log.hours_worked, 0),
      amount: selected.reduce((sum, log) => sum + log.labor_cost, 0),
    };
  }, [timeLogs, selectedLogIds]);

  const createPayRun = useMutation({
    mutationFn: async () => {
      if (selectedLogIds.size === 0) {
        throw new Error('No time logs selected');
      }

      const selectedLogs = timeLogs!.filter(log => selectedLogIds.has(log.id));

      // Insert pay run
      const { data: payRun, error: payRunError } = await supabase
        .from('labor_pay_runs')
        .insert({
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          status: 'draft',
          total_amount: selectedTotals.amount,
          payer_company_id: payerCompanyId || null,
          payee_company_id: null,
        })
        .select()
        .single();

      if (payRunError) throw payRunError;

      // Insert pay run items
      const items = selectedLogs.map(log => ({
        pay_run_id: payRun.id,
        time_log_id: log.id,
        worker_id: log.worker_id,
        hours: log.hours_worked,
        rate: log.labor_cost && log.hours_worked ? log.labor_cost / log.hours_worked : 0,
        amount: log.labor_cost,
      }));

      const { error: itemsError } = await supabase
        .from('labor_pay_run_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return payRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-pay-runs'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-time-logs'] });
      queryClient.invalidateQueries({ queryKey: ['workforce-unpaid-summary'] });
      queryClient.invalidateQueries({ queryKey: ['time-logs'] });
      toast({
        title: 'Pay run created',
        description: 'Labor pay run created successfully',
      });
      handleClose();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setStep(1);
    setDateRangeStart(defaultDateRangeStart || '');
    setDateRangeEnd(defaultDateRangeEnd || '');
    setPayerCompanyId(defaultCompanyId || '');
    setSelectedLogIds(new Set());
    onOpenChange(false);
  };

  const handleNext = () => {
    if (!dateRangeStart || !dateRangeEnd) {
      toast({
        title: 'Missing information',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }
    setStep(2);
  };

  const toggleLogSelection = (logId: string) => {
    const newSelection = new Set(selectedLogIds);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    setSelectedLogIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (!timeLogs) return;
    if (selectedLogIds.size === timeLogs.length) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(timeLogs.map(log => log.id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'New Pay Run - Step 1: Date Range & Company' : 'New Pay Run - Step 2: Select Time Logs'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer-company">Payer Company (Optional)</Label>
              <Select value={payerCompanyId} onValueChange={setPayerCompanyId}>
                <SelectTrigger id="payer-company">
                  <SelectValue placeholder="Select company or leave blank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Company</SelectItem>
                  {companies?.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !timeLogs || timeLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No unpaid time logs found in this date range</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLogIds.size === timeLogs.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label>Select All ({timeLogs.length} logs)</Label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedLogIds.size} logs · {selectedTotals.hours.toFixed(1)}h · ${selectedTotals.amount.toFixed(2)}
                  </div>
                </div>

                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {Array.from(groupedLogs.entries()).map(([workerId, projects]) => {
                    const firstLog = Array.from(projects.values())[0][0];
                    return (
                      <div key={workerId} className="p-4">
                        <h4 className="font-semibold mb-2">{firstLog.worker.name}</h4>
                        {Array.from(projects.entries()).map(([projectId, logs]) => (
                          <div key={projectId} className="ml-4 mb-2">
                            <h5 className="font-medium text-sm text-muted-foreground mb-1">
                              {logs[0].project.project_name}
                            </h5>
                            <div className="space-y-1">
                              {logs.map(log => (
                                <div key={log.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={selectedLogIds.has(log.id)}
                                    onCheckedChange={() => toggleLogSelection(log.id)}
                                  />
                                  <span>{format(new Date(log.date), 'MMM d, yyyy')}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span>{log.hours_worked}h</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span>${(log.labor_cost && log.hours_worked ? log.labor_cost / log.hours_worked : 0).toFixed(2)}/hr</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="font-medium">${log.labor_cost.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => createPayRun.mutate()}
                disabled={selectedLogIds.size === 0 || createPayRun.isPending}
              >
                {createPayRun.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Pay Run
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
