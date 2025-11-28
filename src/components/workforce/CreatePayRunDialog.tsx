// src/components/workforce/CreatePayRunDialog.tsx
//
// Canonical Pay Run creation wizard.
// - Reads unpaid logs via useUnpaidTimeLogs (time_logs_with_meta_view)
// - Creates labor_pay_runs + labor_pay_run_items
// - Designed for high volume (2k+ logs/day)

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { Badge } from '@/components/ui/badge';

import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';

import { useUnpaidTimeLogs } from '@/hooks/useUnpaidTimeLogs';

type CreatePayRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function CreatePayRunDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePayRunDialogProps) {
  // -----------------------
  // Filters / local state
  // -----------------------
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [payerCompanyId, setPayerCompanyId] = useState<string>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [workerId, setWorkerId] = useState<string>('all');

  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(
    () => new Set()
  );

  // -----------------------
  // Companies & Projects (for filters)
  // -----------------------
  const { data: companies } = useCompaniesForPayroll();
  const { data: projects } = useProjectsForPayroll();
  const { data: workers } = useWorkersForPayroll();

  const filters = useMemo(
    () => ({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      companyId: payerCompanyId === 'all' ? undefined : payerCompanyId,
      projectId: projectId === 'all' ? undefined : projectId,
      workerId: workerId === 'all' ? undefined : workerId,
    }),
    [startDate, endDate, payerCompanyId, projectId, workerId]
  );

  // -----------------------
  // Unpaid time logs (canonical)
  // -----------------------
  const { data: unpaidLogs, isLoading } = useUnpaidTimeLogs(filters);

  // Reset selections whenever filters change
  const visibleLogs = unpaidLogs || [];
  const allVisibleIds = useMemo(
    () => visibleLogs.map((log) => log.id),
    [visibleLogs]
  );

  const totalHours = useMemo(
    () =>
      visibleLogs.reduce(
        (sum, log) => sum + Number(log.hours_worked || 0),
        0
      ),
    [visibleLogs]
  );

  const totalAmount = useMemo(
    () =>
      visibleLogs.reduce(
        (sum, log) => sum + Number(log.labor_cost || 0),
        0
      ),
    [visibleLogs]
  );

  const selectedLogs = useMemo(
    () => visibleLogs.filter((log) => selectedLogIds.has(log.id)),
    [visibleLogs, selectedLogIds]
  );

  const selectedAmount = useMemo(
    () =>
      selectedLogs.reduce(
        (sum, log) => sum + Number(log.labor_cost || 0),
        0
      ),
    [selectedLogs]
  );

  const selectedCount = selectedLogs.length;

  // -----------------------
  // Mutations
  // -----------------------
  const createPayRunMutation = useMutation({
    mutationFn: async () => {
      if (selectedLogs.length === 0) {
        throw new Error('Select at least one time log');
      }

      const dateRangeStart = format(startDate, 'yyyy-MM-dd');
      const dateRangeEnd = format(endDate, 'yyyy-MM-dd');

      // 1) Create labor_pay_runs record
      const { data: payRun, error: payRunError } = await supabase
        .from('labor_pay_runs')
        .insert({
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          payer_company_id: payerCompanyId === 'all' ? null : payerCompanyId,
          // You can later support per-worker payee companies; for now null.
          payee_company_id: null,
          total_amount: selectedAmount,
          status: 'draft',
        })
        .select()
        .single();

      if (payRunError) {
        console.error('Error creating pay run:', payRunError);
        throw payRunError;
      }

      // 2) Insert labor_pay_run_items for each selected log
      const itemsPayload = selectedLogs.map((log) => ({
        pay_run_id: payRun.id,
        time_log_id: log.id,
        amount: Number(log.labor_cost || 0),
      }));

      const { error: itemsError } = await supabase
        .from('labor_pay_run_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.error('Error creating pay run items:', itemsError);
        throw itemsError;
      }

      return payRun;
    },
    onSuccess: () => {
      toast.success('Pay run created from unpaid time logs');
      setSelectedLogIds(new Set());
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(
        error?.message || 'Failed to create pay run. Please try again.'
      );
    },
  });

  // -----------------------
  // Handlers
  // -----------------------
  const toggleLog = (id: string, checked: boolean | string) => {
    const next = new Set(selectedLogIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedLogIds(next);
  };

  const toggleSelectAll = (checked: boolean | string) => {
    if (checked) {
      setSelectedLogIds(new Set(allVisibleIds));
    } else {
      setSelectedLogIds(new Set());
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Reset state on close for clean next use
      setSelectedLogIds(new Set());
    }
    onOpenChange(openState);
  };

  // -----------------------
  // Render
  // -----------------------
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Create Labor Pay Run</DialogTitle>
          <DialogDescription>
            Select a date range and unpaid time logs to batch into a pay run.
            Payment status will flip to <span className="font-semibold">paid</span> only when you mark the pay run as paid.
          </DialogDescription>
        </DialogHeader>

        {/* TOP FILTER + SUMMARY */}
        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          {/* Filters */}
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Date range start</Label>
                  <DatePickerWithPresets
                    date={startDate}
                    onDateChange={(date) => date && setStartDate(date)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date range end</Label>
                  <DatePickerWithPresets
                    date={endDate}
                    onDateChange={(date) => date && setEndDate(date)}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Payer company</Label>
                  <Select
                    value={payerCompanyId}
                    onValueChange={setPayerCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Worker</Label>
                  <Select value={workerId} onValueChange={setWorkerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All workers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workers</SelectItem>
                      {workers?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Summary</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <p>
                    Visible unpaid logs:{' '}
                    <span className="font-semibold">
                      {visibleLogs.length.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Total hours:{' '}
                    <span className="font-semibold">
                      {totalHours.toFixed(1)}h
                    </span>
                  </p>
                  <p>
                    Total unpaid amount:{' '}
                    <span className="font-semibold">
                      ${totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                  <hr className="my-2" />
                  <p>
                    Selected logs:{' '}
                    <span className="font-semibold">
                      {selectedCount.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Selected amount:{' '}
                    <span className="font-semibold text-emerald-600">
                      ${selectedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                  {selectedCount === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tip: Use “Select all” below to pull every unpaid log in
                      this range into one run.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LOG TABLE */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : visibleLogs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No unpaid time logs found for this range / filters.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        selectedLogIds.size > 0 &&
                        selectedLogIds.size === allVisibleIds.length
                      }
                      onCheckedChange={toggleSelectAll}
                      id="select-all-logs"
                    />
                    <Label
                      htmlFor="select-all-logs"
                      className="text-sm font-medium"
                    >
                      Select all ({allVisibleIds.length})
                    </Label>
                  </div>
                  <Badge variant="outline">
                    {selectedCount} selected · $
                    {selectedAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Badge>
                </div>

                <ScrollArea className="h-72 border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="w-[40px] px-3 py-2"></th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Worker</th>
                        <th className="px-3 py-2">Project</th>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2 text-right">Hours</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={selectedLogIds.has(log.id)}
                              onCheckedChange={(checked) =>
                                toggleLog(log.id, checked)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {log.date
                              ? new Date(log.date).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-3 py-2">{log.worker_name}</td>
                          <td className="px-3 py-2">{log.project_name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {log.company_name || '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {Number(log.hours_worked || 0).toFixed(1)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ${Number(log.labor_cost || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Pay run will be created in <span className="font-semibold">draft</span> status.
            When you later mark it as <span className="font-semibold">paid</span>, the trigger will update{' '}
            <code>time_logs.payment_status = 'paid'</code>.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createPayRunMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createPayRunMutation.mutate()}
              disabled={
                createPayRunMutation.isPending || selectedLogs.length === 0
              }
            >
              {createPayRunMutation.isPending
                ? 'Creating...'
                : `Create Pay Run (${selectedLogs.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------
// Small helper hooks
// -----------------------

function useCompaniesForPayroll() {
  return useQuery({
    queryKey: ['payroll-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

function useProjectsForPayroll() {
  return useQuery({
    queryKey: ['payroll-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');

      if (error) throw error;
      return data || [];
    },
  });
}

function useWorkersForPayroll() {
  return useQuery({
    queryKey: ['payroll-workers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}
