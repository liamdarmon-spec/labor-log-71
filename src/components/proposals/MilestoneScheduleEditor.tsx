// src/components/proposals/MilestoneScheduleEditor.tsx
// In-proposal milestone/payment schedule editor for milestone-based contracts
// Ties directly to payment_schedules + payment_schedule_items tables
// 
// CANONICAL PHILOSOPHY:
// - DB is source of truth: payment_schedule_items table
// - company_id auto-inherited from project via trigger
// - RLS enforced at DB level (tenant_select/insert/update/delete)
// - Milestones frozen into contract_milestones on proposal approval
// - Post-approval edits blocked by DB trigger (requires Change Order)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Percent,
  Loader2,
  RefreshCw,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MilestoneScheduleEditorProps {
  proposalId: string;
  projectId: string;
  contractTotal: number;
  isLocked: boolean;
  onTotalsChange?: (total: number, count: number) => void;
}

type AllocationMode = 'percentage' | 'fixed' | 'remaining';

interface MilestoneItem {
  id: string;
  title: string;
  due_on: string | null;
  percent_of_contract: number | null;
  fixed_amount: number | null;
  scheduled_amount: number;
  sort_order: number;
  is_archived: boolean;
  // UI-only state
  allocationMode: AllocationMode;
  isNew?: boolean;
  isDirty?: boolean;
}

const generateId = () => crypto.randomUUID();

export function MilestoneScheduleEditor({
  proposalId,
  projectId,
  contractTotal,
  isLocked,
  onTotalsChange,
}: MilestoneScheduleEditorProps) {
  const queryClient = useQueryClient();
  const [localMilestones, setLocalMilestones] = useState<MilestoneItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Track if local state has been modified from server state
  const isDirtyRef = useRef(false);

  // Fetch or create payment schedule for this proposal
  const { data: paymentSchedule, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ['payment-schedule', proposalId],
    queryFn: async () => {
      // First try to find existing schedule
      const { data: existing, error: findError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (findError) {
        console.error('[MilestoneScheduleEditor] Failed to fetch payment_schedule:', findError);
        throw findError;
      }
      if (existing) {
        console.log('[MilestoneScheduleEditor] Found existing payment_schedule:', existing.id);
        return existing;
      }

      // Create new schedule for this proposal
      console.log('[MilestoneScheduleEditor] Creating new payment_schedule for proposal:', proposalId);
      const { data: created, error: createError } = await supabase
        .from('payment_schedules')
        .insert({
          project_id: projectId,
          proposal_id: proposalId,
          name: 'Payment Schedule',
        })
        .select()
        .single();

      if (createError) {
        console.error('[MilestoneScheduleEditor] Failed to create payment_schedule:', createError);
        throw createError;
      }
      console.log('[MilestoneScheduleEditor] Created payment_schedule:', created?.id);
      return created;
    },
    enabled: !!proposalId && !!projectId,
  });

  // Fetch milestone items
  const { data: milestoneItems = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['payment-schedule-items', paymentSchedule?.id],
    queryFn: async () => {
      console.log('[MilestoneScheduleEditor] Fetching items for payment_schedule:', paymentSchedule!.id);
      const { data, error } = await supabase
        .from('payment_schedule_items')
        .select('*')
        .eq('payment_schedule_id', paymentSchedule!.id)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[MilestoneScheduleEditor] Failed to fetch items:', error);
        throw error;
      }
      console.log('[MilestoneScheduleEditor] Fetched', data?.length || 0, 'items');
      return data || [];
    },
    enabled: !!paymentSchedule?.id,
    // Don't refetch too aggressively - prevent overwriting local state
    staleTime: 5000,
  });

  // Sync milestones to local state - only when not dirty and server has data
  useEffect(() => {
    if (!milestoneItems) return;
    
    // Don't overwrite local changes with server data
    if (isDirtyRef.current) {
      console.log('[MilestoneScheduleEditor] Skipping sync - local state is dirty');
      return;
    }
    
    // Don't overwrite local items with empty server data if we have local items
    // This prevents RLS/timing issues from wiping out user's work
    if (milestoneItems.length === 0 && localMilestones.length > 0) {
      console.log('[MilestoneScheduleEditor] Skipping sync - server returned empty but we have local items');
      return;
    }
    
    console.log('[MilestoneScheduleEditor] Syncing', milestoneItems.length, 'items from server');
    const items: MilestoneItem[] = milestoneItems.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      due_on: item.due_on,
      percent_of_contract: item.percent_of_contract,
      fixed_amount: item.fixed_amount,
      scheduled_amount: item.scheduled_amount || 0,
      sort_order: item.sort_order || 0,
      is_archived: item.is_archived || false,
      allocationMode: item.percent_of_contract != null 
        ? 'percentage' 
        : item.fixed_amount != null 
          ? 'fixed' 
          : 'percentage',
    }));

    setLocalMilestones(items);
  }, [milestoneItems, localMilestones.length]);

  // Calculate totals
  const { allocatedTotal, allocatedPercent, remainingAmount, isComplete } = useMemo(() => {
    const total = localMilestones.reduce((sum, m) => sum + (m.scheduled_amount || 0), 0);
    const pct = contractTotal > 0 ? (total / contractTotal) * 100 : 0;
    const remaining = contractTotal - total;
    return {
      allocatedTotal: total,
      allocatedPercent: pct,
      remainingAmount: remaining,
      isComplete: Math.abs(remaining) < 0.01,
    };
  }, [localMilestones, contractTotal]);

  // Notify parent of changes
  useEffect(() => {
    onTotalsChange?.(allocatedTotal, localMilestones.length);
  }, [allocatedTotal, localMilestones.length, onTotalsChange]);

  // Recalculate scheduled_amounts when contractTotal changes
  useEffect(() => {
    if (contractTotal <= 0) return;
    
    setLocalMilestones((prev) => {
      let hasChanges = false;
      const updated = prev.map((m) => {
        if (m.allocationMode === 'percentage' && m.percent_of_contract != null) {
          const newAmount = (m.percent_of_contract / 100) * contractTotal;
          if (Math.abs(newAmount - m.scheduled_amount) > 0.01) {
            hasChanges = true;
            return { ...m, scheduled_amount: newAmount, isDirty: true };
          }
        }
        return m;
      });
      return hasChanges ? updated : prev;
    });
  }, [contractTotal]);

  // Add new milestone
  const handleAddMilestone = useCallback(() => {
    isDirtyRef.current = true;
    setSaveError(null); // Clear any previous error when user makes changes
    const newMilestone: MilestoneItem = {
      id: generateId(),
      title: `Milestone ${localMilestones.length + 1}`,
      due_on: null,
      percent_of_contract: null,
      fixed_amount: null,
      scheduled_amount: 0,
      sort_order: localMilestones.length,
      is_archived: false,
      allocationMode: 'percentage',
      isNew: true,
      isDirty: true,
    };
    setLocalMilestones((prev) => [...prev, newMilestone]);
  }, [localMilestones.length]);

  // Update milestone field
  const handleUpdateMilestone = useCallback(
    (id: string, field: keyof MilestoneItem, value: any) => {
      isDirtyRef.current = true;
      setSaveError(null); // Clear error when user makes changes
      setLocalMilestones((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;

          const updated = { ...m, [field]: value, isDirty: true };

          // Recalculate scheduled_amount based on allocation mode
          if (field === 'allocationMode') {
            updated.allocationMode = value as AllocationMode;
            if (value === 'remaining') {
              updated.percent_of_contract = null;
              updated.fixed_amount = null;
              // Calculate remaining
              const otherTotal = prev
                .filter((x) => x.id !== id)
                .reduce((sum, x) => sum + (x.scheduled_amount || 0), 0);
              updated.scheduled_amount = Math.max(0, contractTotal - otherTotal);
            }
          }

          if (field === 'percent_of_contract' && updated.allocationMode === 'percentage') {
            const pct = parseFloat(value) || 0;
            updated.percent_of_contract = pct;
            updated.fixed_amount = null;
            updated.scheduled_amount = (pct / 100) * contractTotal;
          }

          if (field === 'fixed_amount' && updated.allocationMode === 'fixed') {
            const amt = parseFloat(value) || 0;
            updated.fixed_amount = amt;
            updated.percent_of_contract = null;
            updated.scheduled_amount = amt;
          }

          return updated;
        })
      );
    },
    [contractTotal]
  );

  // Remove milestone
  const handleRemoveMilestone = useCallback((id: string) => {
    isDirtyRef.current = true;
    setSaveError(null);
    setLocalMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Save all changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!paymentSchedule?.id) throw new Error('No payment schedule');

      const toSave = localMilestones.filter((m) => m.isDirty || m.isNew);
      const toCreate = toSave.filter((m) => m.isNew);
      const toUpdate = toSave.filter((m) => !m.isNew);

      // Find deleted items
      const currentIds = new Set(localMilestones.map((m) => m.id));
      const serverIds = new Set(milestoneItems.map((m: any) => m.id));
      const toDelete = [...serverIds].filter((id) => !currentIds.has(id));

      // Delete removed items
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('payment_schedule_items')
          .update({ is_archived: true })
          .in('id', toDelete);
        if (error) throw error;
      }

      // Insert new items - use .select() to verify they're visible after insert
      if (toCreate.length > 0) {
        const insertData = toCreate.map((m) => ({
          id: m.id,
          payment_schedule_id: paymentSchedule.id,
          title: m.title,
          due_on: m.due_on || null,
          percent_of_contract: m.percent_of_contract,
          fixed_amount: m.fixed_amount,
          scheduled_amount: m.scheduled_amount,
          sort_order: m.sort_order,
        }));
        const { data: insertedRows, error } = await supabase
          .from('payment_schedule_items')
          .insert(insertData)
          .select('id');
        if (error) throw error;
        
        // Verify all items were inserted and are visible
        if (!insertedRows || insertedRows.length !== toCreate.length) {
          console.warn('[MilestoneScheduleEditor] Insert succeeded but some items not visible after insert. This may be an RLS issue.');
          console.warn('Expected:', toCreate.length, 'Got:', insertedRows?.length || 0);
        }
      }

      // Update existing items
      for (const m of toUpdate) {
        const { error } = await supabase
          .from('payment_schedule_items')
          .update({
            title: m.title,
            due_on: m.due_on || null,
            percent_of_contract: m.percent_of_contract,
            fixed_amount: m.fixed_amount,
            scheduled_amount: m.scheduled_amount,
            sort_order: m.sort_order,
          })
          .eq('id', m.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      isDirtyRef.current = false;
      setSaveError(null);
      setLastSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['payment-schedule-items', paymentSchedule?.id] });
      queryClient.invalidateQueries({ queryKey: ['proposal-data', proposalId] });
      toast.success('Milestones saved');
      // Clear dirty flags
      setLocalMilestones((prev) =>
        prev.map((m) => ({ ...m, isNew: false, isDirty: false }))
      );
    },
    onError: (err: Error) => {
      // NEVER lose user data - keep local state, show persistent error
      setSaveError(err.message);
      toast.error('Failed to save milestones');
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  const hasDirtyItems = localMilestones.some((m) => m.isDirty || m.isNew);
  const hasDeletedItems = milestoneItems.some(
    (m: any) => !localMilestones.find((lm) => lm.id === m.id)
  );
  const needsSave = hasDirtyItems || hasDeletedItems;

  const isLoading = scheduleLoading || itemsLoading;
  const queryError = scheduleError || itemsError;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (queryError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load milestone schedule: {String(queryError)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Milestone Schedule</span>
            {isComplete ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {formatCurrency(remainingAmount)} remaining
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {needsSave && !isLocked && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            )}
            {!isLocked && (
              <Button variant="outline" size="sm" onClick={handleAddMilestone}>
                <Plus className="h-4 w-4 mr-1" />
                Add Milestone
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Allocated</span>
            <span className="font-sans font-bold tabular-nums">
              {formatCurrency(allocatedTotal)} / {formatCurrency(contractTotal)}
            </span>
          </div>
          <Progress value={Math.min(100, allocatedPercent)} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {allocatedPercent.toFixed(1)}% of contract
          </div>
        </div>

        {/* Milestone list */}
        {localMilestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">No milestones defined yet.</p>
            {!isLocked && (
              <Button variant="outline" size="sm" onClick={handleAddMilestone}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Milestone
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {localMilestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={cn(
                  'flex items-center gap-2 p-3 border rounded-lg bg-muted/30',
                  milestone.isDirty && 'border-amber-300 bg-amber-50/30',
                  isLocked && 'opacity-60'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                
                {/* Title */}
                <Input
                  value={milestone.title}
                  onChange={(e) => handleUpdateMilestone(milestone.id, 'title', e.target.value)}
                  placeholder="Milestone name"
                  className="flex-1 min-w-[120px]"
                  disabled={isLocked}
                />

                {/* Allocation mode selector */}
                <Select
                  value={milestone.allocationMode}
                  onValueChange={(v) => handleUpdateMilestone(milestone.id, 'allocationMode', v)}
                  disabled={isLocked}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Percent
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Fixed
                      </div>
                    </SelectItem>
                    <SelectItem value="remaining">
                      <div className="flex items-center gap-1">
                        Remaining
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Amount input based on mode */}
                {milestone.allocationMode === 'percentage' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={milestone.percent_of_contract ?? ''}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, 'percent_of_contract', e.target.value)
                      }
                      placeholder="0"
                      className="w-20 text-right font-sans tabular-nums"
                      disabled={isLocked}
                    />
                    <span className="text-muted-foreground text-sm">%</span>
                  </div>
                )}

                {milestone.allocationMode === 'fixed' && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={milestone.fixed_amount ?? ''}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, 'fixed_amount', e.target.value)
                      }
                      placeholder="0.00"
                      className="w-28 text-right font-sans tabular-nums"
                      disabled={isLocked}
                    />
                  </div>
                )}

                {milestone.allocationMode === 'remaining' && (
                  <div className="w-28 text-right font-sans tabular-nums text-sm text-muted-foreground">
                    {formatCurrency(milestone.scheduled_amount)}
                  </div>
                )}

                {/* Calculated amount display */}
                <div className="w-28 text-right font-sans font-semibold tabular-nums">
                  {formatCurrency(milestone.scheduled_amount)}
                </div>

                {/* Delete button */}
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMilestone(milestone.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary footer */}
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span
              className={cn(
                'text-xl font-bold font-sans tabular-nums',
                isComplete ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              {formatCurrency(allocatedTotal)}
            </span>
          </div>
          {!isComplete && (
            <p className="text-xs text-amber-600 mt-1">
              Milestones must total {formatCurrency(contractTotal)} to proceed with approval.
            </p>
          )}
          {lastSavedAt && !saveError && (
            <p className="text-xs text-muted-foreground mt-2">
              Last saved {lastSavedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Persistent error panel - NEVER hide user's work */}
        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Save failed</p>
                  <p className="text-xs text-red-600 mt-1">{saveError}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSaveError(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs"
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', isSaving && 'animate-spin')} />
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Milestone save error:\n${saveError}\n\nMilestones:\n${JSON.stringify(localMilestones, null, 2)}`
                  );
                  toast.success('Error details copied');
                }}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy error
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

