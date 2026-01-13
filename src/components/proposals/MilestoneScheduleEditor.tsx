// src/components/proposals/MilestoneScheduleEditor.tsx
// In-proposal milestone/payment schedule editor for milestone-based contracts
// Ties directly to payment_schedules + payment_schedule_items tables

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Fetch or create payment schedule for this proposal
  const { data: paymentSchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['payment-schedule', proposalId],
    queryFn: async () => {
      // First try to find existing schedule
      const { data: existing, error: findError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (findError) throw findError;
      if (existing) return existing;

      // Create new schedule for this proposal
      const { data: created, error: createError } = await supabase
        .from('payment_schedules')
        .insert({
          project_id: projectId,
          proposal_id: proposalId,
          name: 'Payment Schedule',
        })
        .select()
        .single();

      if (createError) throw createError;
      return created;
    },
    enabled: !!proposalId && !!projectId,
  });

  // Fetch milestone items
  const { data: milestoneItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['payment-schedule-items', paymentSchedule?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedule_items')
        .select('*')
        .eq('payment_schedule_id', paymentSchedule!.id)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!paymentSchedule?.id,
  });

  // Sync milestones to local state
  useEffect(() => {
    if (!milestoneItems) return;
    
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
  }, [milestoneItems]);

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

  // Add new milestone
  const handleAddMilestone = useCallback(() => {
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

      // Insert new items
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
        const { error } = await supabase
          .from('payment_schedule_items')
          .insert(insertData);
        if (error) throw error;
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
      queryClient.invalidateQueries({ queryKey: ['payment-schedule-items', paymentSchedule?.id] });
      queryClient.invalidateQueries({ queryKey: ['proposal-data', proposalId] });
      toast.success('Milestones saved');
      // Clear dirty flags
      setLocalMilestones((prev) =>
        prev.map((m) => ({ ...m, isNew: false, isDirty: false }))
      );
    },
    onError: (err: Error) => {
      toast.error('Failed to save: ' + err.message);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        </div>
      </CardContent>
    </Card>
  );
}

