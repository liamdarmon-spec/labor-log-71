/**
 * Dialog for syncing estimate to budget with merge/replace options
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Zap, Merge, RefreshCw } from 'lucide-react';
import { useSyncEstimateToBudget, type SyncMode } from '@/hooks/useSyncEstimateToBudget';
import { useActiveBudget } from '@/hooks/useActiveBudget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SyncEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  estimateId: string | null;
  estimateTitle?: string;
}

export function SyncEstimateDialog({
  open,
  onOpenChange,
  projectId,
  estimateId,
  estimateTitle,
}: SyncEstimateDialogProps) {
  // Guard against missing required data with type checking
  if (!estimateId || !projectId || typeof projectId !== 'string' || typeof estimateId !== 'string') {
    if (open) {
      console.error('[SyncEstimateDialog] Missing or invalid required data', {
        hasEstimateId: !!estimateId,
        hasProjectId: !!projectId,
        estimateId,
        projectId,
        estimateIdType: typeof estimateId,
        projectIdType: typeof projectId,
      });
    }
    return null;
  }

  // At this point, TypeScript knows projectId and estimateId are strings
  const [mode, setMode] = useState<SyncMode>('merge');
  const syncMutation = useSyncEstimateToBudget();
  const { data: activeBudget } = useActiveBudget(projectId as string);

  // Fetch estimate total
  const { data: estimate } = useQuery({
    queryKey: ['estimate', estimateId],
    enabled: !!estimateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('total_amount, title')
        .eq('id', estimateId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch active budget total
  const { data: budgetTotal } = useQuery({
    queryKey: ['active-budget-total', projectId],
    enabled: !!activeBudget?.id,
    queryFn: async () => {
      if (!activeBudget?.id) return 0;
      const { data, error } = await supabase
        .from('project_budget_lines')
        .select('budget_amount')
        .eq('project_budget_id', activeBudget.id);
      if (error) throw error;
      return data?.reduce((sum, line) => sum + (line.budget_amount || 0), 0) || 0;
    },
  });

  const hasActiveBudget = !!activeBudget;

  const handleSync = () => {
    // Type guard: ensure projectId and estimateId are strings
    if (!projectId || !estimateId || typeof projectId !== 'string' || typeof estimateId !== 'string') {
      console.error('[SyncEstimateDialog] Cannot sync: missing or invalid projectId or estimateId', {
        projectId,
        estimateId,
        projectIdType: typeof projectId,
        estimateIdType: typeof estimateId,
      });
      return;
    }

    // At this point, TypeScript knows projectId and estimateId are strings
    syncMutation.mutate(
      {
        projectId: projectId as string, // Explicit type assertion for safety
        estimateId: estimateId as string,
        mode,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sync Estimate to Budget
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {estimateTitle && (
              <p className="font-medium text-foreground">
                {estimateTitle}
              </p>
            )}

            {hasActiveBudget ? (
              <>
                <div className="space-y-2 mb-4">
                  <p className="font-medium">Active Budget: {activeBudget.name || 'Main Budget'}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Current budget total: ${(budgetTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    {estimate && (
                      <p>Estimate total: ${(estimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    )}
                  </div>
                </div>
                <p className="mb-4">This project already has an active budget. What would you like to do?</p>

                <RadioGroup value={mode} onValueChange={(value) => setMode(value as SyncMode)}>
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="merge" id="merge" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="merge" className="flex items-center gap-2 cursor-pointer">
                        <Merge className="h-4 w-4" />
                        <span className="font-semibold">Merge into existing budget</span>
                        <span className="text-xs text-muted-foreground">(Recommended)</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Add this estimate's line items to the existing budget. Cost codes will
                        aggregate naturally. Multiple estimates can contribute to one unified budget.
                        If this estimate was synced before, its old lines will be replaced with
                        the current estimate state.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 space-y-0 rounded-md border border-destructive/50 p-4">
                    <RadioGroupItem value="replace" id="replace" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="replace" className="flex items-center gap-2 cursor-pointer">
                        <RefreshCw className="h-4 w-4" />
                        <span className="font-semibold">Replace existing budget</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Archive the current budget and create a new one from this estimate. This
                        will remove all existing budget lines. The archived budget will be preserved
                        for historical reference.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </>
            ) : (
              <div className="space-y-2">
                <p>
                  This will create a new active budget for this project using the line items from
                  this estimate.
                </p>
                {estimate && (
                  <p className="text-sm text-muted-foreground">
                    Estimate total: ${(estimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className={mode === 'replace' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {syncMutation.isPending ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Syncing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {mode === 'replace' ? 'Replace Budget' : 'Sync to Budget'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
