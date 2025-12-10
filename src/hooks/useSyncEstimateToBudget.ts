/**
 * Hook for syncing estimates to budgets with merge/replace modes
 * 
 * Replaces the old blocking behavior with:
 * - Merge mode (default): Adds estimate lines to existing active budget
 * - Replace mode: Archives old budget, creates new one from estimate
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureActiveBudget } from './useActiveBudget';

export type SyncMode = 'merge' | 'replace';

interface SyncEstimateToBudgetOptions {
  projectId: string;
  estimateId: string;
  mode?: SyncMode;
}

/**
 * Syncs an estimate to the project's active budget
 */
/**
 * Syncs an estimate to the project's active budget
 * 
 * Supports two modes:
 * - 'merge': Adds estimate lines to existing active budget (default)
 * - 'replace': Archives old budget, creates new one from estimate
 * 
 * Provenance tracking:
 * - All lines tagged with source_estimate_id
 * - Re-sync deletes old lines from same estimate first
 * - Multiple estimates can contribute to same cost codes
 */
export function useSyncEstimateToBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SyncEstimateToBudgetOptions) => {
      try {
        const { projectId, estimateId, mode = 'merge' } = options;

        // Validate required parameters
        if (!projectId) {
          throw new Error('projectId is required for syncing estimate to budget');
        }
        if (!estimateId) {
          throw new Error('estimateId is required for syncing estimate to budget');
        }

        // 1. Fetch estimate and verify it exists
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('id, project_id, title, status, settings')
        .eq('id', estimateId)
        .single();

      if (estimateError) throw estimateError;
      if (!estimate) throw new Error('Estimate not found');
      if (estimate.project_id !== projectId) {
        throw new Error('Estimate does not belong to this project');
      }
      
      // Detect if this is a change order estimate
      // Check status field or settings JSONB for change_order flag
      const estimateSettings = (estimate.settings as Record<string, any>) || {};
      const isChangeOrderEstimate = estimate.status === 'change_order' || 
                                    estimateSettings.is_change_order === true ||
                                    false;

      // 2. Handle replace mode: archive existing budget
      if (mode === 'replace') {
        const { data: existingBudget } = await supabase
          .from('project_budgets')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingBudget) {
          // Archive the existing budget
          const { error: archiveError } = await supabase
            .from('project_budgets')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', existingBudget.id);

          if (archiveError) throw archiveError;

          // Delete all lines from archived budget
          const { error: deleteLinesError } = await supabase
            .from('project_budget_lines')
            .delete()
            .eq('project_budget_id', existingBudget.id);

          if (deleteLinesError) throw deleteLinesError;
        }
      }

      // 3. Ensure active budget exists
      const budgetId = await ensureActiveBudget(projectId);

      // 4. Check if estimate uses scope_blocks (new system) or estimate_items (legacy)
      const { data: scopeBlocks } = await supabase
        .from('scope_blocks')
        .select('id')
        .eq('entity_type', 'estimate')
        .eq('entity_id', estimateId)
        .limit(1);

      const usesScopeBlocks = (scopeBlocks?.length || 0) > 0;

      // 5. For merge mode: remove existing lines from this estimate (allows re-sync)
      // For replace mode: already deleted above
      if (mode === 'merge') {
        const { error: deleteError } = await supabase
          .from('project_budget_lines')
          .delete()
          .eq('project_budget_id', budgetId)
          .eq('source_estimate_id', estimateId);

        if (deleteError) throw deleteError;
      }

      // 6. Insert budget lines from estimate
      if (usesScopeBlocks) {
        // NEW SYSTEM: scope_blocks + scope_block_cost_items
        // area_label exists on scope_block_cost_items (and optionally on scope_blocks after migration)
        // group_label exists on scope_block_cost_items
        const { data: blocks, error: blocksError } = await supabase
          .from('scope_blocks')
          .select(`
            id,
            block_type,
            title,
            area_label,
            scope_block_cost_items (
              id,
              cost_code_id,
              category,
              description,
              quantity,
              unit,
              unit_price,
              line_total,
              markup_percent,
              notes,
              sort_order,
              area_label,
              group_label
            )
          `)
          .eq('entity_type', 'estimate')
          .eq('entity_id', estimateId)
          .eq('is_visible', true);

        if (blocksError) throw blocksError;

        // Build budget lines from scope blocks and their cost items
        // Important: preserve block reference when mapping over items
        const linesToInsert: any[] = [];
        
        for (const scopeBlock of blocks || []) {
          const costItems = scopeBlock.scope_block_cost_items || [];
          
          for (const item of costItems) {
            const category = item.category?.toLowerCase() || 'other';
            const lineType = category.includes('lab')
              ? 'labor'
              : category.includes('sub')
              ? 'subs'
              : category.includes('mat')
              ? 'materials'
              : 'other';

            // Detect if this is a change order estimate
            // Check block type, estimate status, or settings
            const isChangeOrder = (scopeBlock.block_type === 'change_order') || 
                                  isChangeOrderEstimate ||
                                  false;

            // Extract area/scope labels from cost item (area_label/group_label exist on scope_block_cost_items)
            // Fallback to block-level area_label or title if item doesn't have area_label
            const areaLabel = item.area_label ?? scopeBlock.area_label ?? scopeBlock.title ?? null;
            const groupLabel = item.group_label ?? null;

            linesToInsert.push({
              project_id: projectId,
              project_budget_id: budgetId,
              group_id: null,
              cost_code_id: item.cost_code_id || null,
              scope_type: isChangeOrder ? ('change_order' as const) : ('base' as const),
              line_type: lineType,
              category: lineType,
              description_internal: item.description || '',
              description_client: item.description || '',
              qty: item.quantity ?? 1,
              unit: item.unit || null,
              unit_cost: item.unit_price ?? 0,
              budget_amount: item.line_total ?? (item.quantity ?? 1) * (item.unit_price ?? 0),
              budget_hours: null,
              markup_pct: item.markup_percent || null,
              tax_pct: null,
              allowance_cap: null,
              is_optional: false,
              is_allowance: false,
              client_visible: true,
              sort_order: item.sort_order ?? 0,
              internal_notes: item.notes || null,
              source_estimate_id: estimateId, // Track which estimate created this line
              change_order_id: isChangeOrder ? estimateId : null, // If change order, reference estimate
              // Note: estimate_line_id, sync_batch_id would be added when those columns exist
              // For now, area_label and group_label are stored in description_internal or notes
              // if the schema doesn't have dedicated columns yet
            });
          }
        }

        if (linesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('project_budget_lines')
            .insert(linesToInsert);

          if (insertError) throw insertError;
        }
      } else {
        // LEGACY SYSTEM: estimate_items
        const { data: estimateItems, error: itemsError } = await supabase
          .from('estimate_items')
          .select('*')
          .eq('estimate_id', estimateId);

        if (itemsError) throw itemsError;

        // Group by cost_code_id + category for aggregation (legacy behavior)
        const grouped = new Map<string, any[]>();
        estimateItems?.forEach((item) => {
          const category = item.category?.toLowerCase() || 'other';
          const normalizedCategory = category.includes('lab')
            ? 'labor'
            : category.includes('sub')
            ? 'subs'
            : category.includes('mat')
            ? 'materials'
            : 'other';

          const key = `${item.cost_code_id || 'no-code'}-${normalizedCategory}`;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(item);
        });

        const linesToInsert = Array.from(grouped.entries()).map(([key, items]) => {
          const firstItem = items[0];
          const category = firstItem.category?.toLowerCase() || 'other';
          const lineType = category.includes('lab')
            ? 'labor'
            : category.includes('sub')
            ? 'subs'
            : category.includes('mat')
            ? 'materials'
            : 'other';

          const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
          const totalAmount = items.reduce(
            (sum, item) => sum + (item.line_total || (item.quantity || 1) * (item.unit_price || 0)),
            0
          );
          const totalHours = items.reduce((sum, item) => sum + (item.planned_hours || 0), 0);
          const avgUnitPrice = totalQty > 0 ? totalAmount / totalQty : 0;

          // Extract area/scope group from estimate items if available
          const areaLabel = firstItem.area_name || firstItem.scope_group || null;
          const groupLabel = firstItem.group_label || null;

          return {
            project_id: projectId,
            project_budget_id: budgetId,
            group_id: null,
            cost_code_id: firstItem.cost_code_id || null,
            scope_type: isChangeOrderEstimate ? ('change_order' as const) : ('base' as const),
            line_type: lineType,
            category: lineType,
            description_internal: items.map((i) => i.description).join(' | '),
            description_client: items.map((i) => i.description).join(' | '),
            qty: totalQty,
            unit: firstItem.unit || 'ea',
            unit_cost: avgUnitPrice,
            budget_amount: totalAmount,
            budget_hours: totalHours || null,
            markup_pct: null,
            tax_pct: null,
            allowance_cap: null,
            is_optional: false,
            is_allowance: items.some((i) => i.is_allowance) || false,
            client_visible: true,
            sort_order: 0,
            internal_notes: null,
            source_estimate_id: estimateId, // Track which estimate created this line
            change_order_id: isChangeOrderEstimate ? estimateId : null,
            // Note: estimate_line_id, sync_batch_id would be added here when schema supports it
            // For now, we track provenance via source_estimate_id + scope_type
          };
        });

        if (linesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('project_budget_lines')
            .insert(linesToInsert);

          if (insertError) throw insertError;
        }
      }

      // 7. Recalculate budget totals
      const { data: allLines } = await supabase
        .from('project_budget_lines')
        .select('line_type, budget_amount')
        .eq('project_budget_id', budgetId);

      const totals = {
        labor: 0,
        subs: 0,
        materials: 0,
        other: 0,
      };

      allLines?.forEach((line) => {
        const amount = line.budget_amount || 0;
        if (line.line_type === 'labor') totals.labor += amount;
        else if (line.line_type === 'subs') totals.subs += amount;
        else if (line.line_type === 'materials') totals.materials += amount;
        else totals.other += amount;
      });

      const { error: updateError } = await supabase
        .from('project_budgets')
        .update({
          labor_budget: totals.labor,
          subs_budget: totals.subs,
          materials_budget: totals.materials,
          other_budget: totals.other,
          baseline_estimate_id: mode === 'replace' ? estimateId : undefined, // Only set baseline on replace
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId);

        if (updateError) throw updateError;

        return { budgetId, estimateId, mode };
      } catch (error) {
        // Ensure we have projectId and estimateId even if error occurred early
        const safeProjectId = options?.projectId || 'unknown';
        const safeEstimateId = options?.estimateId || 'unknown';
        const safeMode = options?.mode || 'merge';
        
        console.error('[estimate→budget sync] Error syncing estimate', {
          projectId: safeProjectId,
          estimateId: safeEstimateId,
          mode: safeMode,
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger onError handler
      }
    },
    onSuccess: (data, variables) => {
      const { projectId, estimateId } = variables;
      
      // Validate projectId before invalidating queries
      if (!projectId) {
        console.error('[useSyncEstimateToBudget] onSuccess: projectId is missing from variables', variables);
        return;
      }
      
      // Invalidate relevant queries using projectId from variables
      queryClient.invalidateQueries({ queryKey: ['active-budget', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-structure', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-financials-v3', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimates', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimate-builder', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['project-estimates-sync-status', projectId] });
      
      // Dispatch event for legacy listeners
      window.dispatchEvent(new Event('budget-updated'));

      toast.success(
        data.mode === 'replace'
          ? 'Estimate synced to budget (replaced existing)'
          : 'Estimate synced to budget (merged)'
      );
    },
    onError: (error: Error) => {
      console.error('Sync estimate to budget error:', error);
      toast.error(`Failed to sync estimate: ${error.message}`);
    },
  });
}
