/**
 * MANUAL SAVE TEST CHECKLIST
 * - edit field -> dirty
 * - save -> clears dirty, refetch once
 * - refresh -> persists
 * - trigger/RLS error -> shows bottom-right panel, stays dirty, NO refetch
 * - delete row -> save -> row gone after refetch
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileText, Check, Download, FileSpreadsheet } from "lucide-react";
import { useCostCodeCatalog } from "@/hooks/useCostCodeCatalog";
import { checkEstimateNeedsMigration, migrateEstimateToScopeBlocks } from "@/lib/estimateMigration";
import { downloadCSV, downloadPDF, type EstimateExportData } from "@/lib/estimateExport";
import {
  ProjectEstimateEditor,
  type EstimateEditorBlock,
  type ScopeItem,
  type BudgetCategory,
} from "@/components/estimates/ProjectEstimateEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
type BatchUpsertItemUpdate = {
  id: string;
  category?: string;
  cost_code_id?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  markup_percent?: number;
  area_label?: string | null;
  group_label?: string | null;
  sort_order?: number;
  scope_block_id?: string;
};

type SaveErrorPayload =
  | {
      title: string;
      message: string;
      details?: string | null;
      hint?: string | null;
      code?: string | null;
      extra?: any;
    }
  | null;

type SaveWarningPayload =
  | {
      title: string;
      message: string;
      extra?: any;
    }
  | null;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function coerceNumber(n: unknown, fallback = 0): number {
  if (typeof n === "number") return Number.isFinite(n) ? n : fallback;
  if (typeof n === "string" && n.trim() !== "") {
    const parsed = Number(n);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function isBlankRow(item: ScopeItem): boolean {
  const desc = (item.description ?? "").trim();
  const qty = coerceNumber((item as any).quantity, 0);
  const unitPrice = coerceNumber((item as any).unit_price, 0);
  return desc === "" && qty === 0 && unitPrice === 0;
}

function validateEstimatePayload(blocks: EstimateEditorBlock[]): {
  ok: boolean;
  error?: string;
  sanitizedBlocks: EstimateEditorBlock[];
} {
  const sanitizedBlocks: EstimateEditorBlock[] = blocks.map((b) => ({
    block: { ...b.block },
    items: b.items
      .filter((it) => !isBlankRow(it))
      .map((it) => {
        const quantity = coerceNumber((it as any).quantity, 0);
        const unit_price = coerceNumber((it as any).unit_price, 0);
        const markup_percent = coerceNumber((it as any).markup_percent, 0);

        return {
          ...it,
          quantity,
          unit_price,
          markup_percent,
          description: (it.description ?? "").toString(),
        };
      }),
  }));

  for (const b of sanitizedBlocks) {
    for (const item of b.items) {
      if (!item.scope_block_id) {
        return { ok: false, error: "Item missing scope_block_id", sanitizedBlocks };
      }
      // numeric fields are always coerced above, but guard against NaN anyway
      if (!isFiniteNumber(item.quantity)) return { ok: false, error: "Invalid quantity", sanitizedBlocks };
      if (!isFiniteNumber(item.unit_price)) return { ok: false, error: "Invalid unit price", sanitizedBlocks };
      if (!isFiniteNumber(item.markup_percent)) return { ok: false, error: "Invalid markup percent", sanitizedBlocks };
    }
  }

  return { ok: true, sanitizedBlocks };
}

interface CostItemDB {
  id: string;
  scope_block_id: string;
  category: string;
  cost_code_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  notes: string | null;
  sort_order: number;
  area_label?: string | null;
  breakdown_notes?: string | null;
  group_label?: string | null;
}

interface ScopeBlockDB {
  id: string;
  title: string | null;
  description: string | null;
  block_type: string;
  sort_order: number;
  scope_block_cost_items: CostItemDB[];
}

interface Estimate {
  id: string;
  company_id?: string | null;
  title: string;
  status: string;
  tax_amount: number | null;
  subtotal_amount: number | null;
  total_amount: number | null;
  is_budget_source: boolean | null;
  projects: {
    id: string;
    project_name: string;
  } | null;
}

// Transform DB data to editor format
function transformToEditorBlocks(dbBlocks: ScopeBlockDB[]): EstimateEditorBlock[] {
  return dbBlocks.map((block) => ({
    block: {
      id: block.id,
      title: block.title || "Untitled Section",
      description: block.description,
      sort_order: block.sort_order,
    },
    items: (block.scope_block_cost_items || []).map((item) => ({
      id: item.id,
      scope_block_id: item.scope_block_id,
      area_label: item.area_label ?? null,
      group_label: item.group_label ?? null,
      category: (item.category as BudgetCategory) || "labor",
      cost_code_id: item.cost_code_id,
      description: item.description || "",
      quantity: item.quantity || 0,
      unit: item.unit || "ea",
      unit_price: item.unit_price || 0,
      markup_percent: item.markup_percent || 0,
      line_total: item.line_total || 0,
    })),
  }));
}

// Serialize item for comparison
function serializeItem(item: ScopeItem): string {
  return JSON.stringify({
    scope_block_id: item.scope_block_id,
    area_label: item.area_label,
    group_label: item.group_label,
    category: item.category,
    cost_code_id: item.cost_code_id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    markup_percent: item.markup_percent,
  });
}

export default function EstimateBuilderV2() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state for immediate UI updates
  const [localBlocks, setLocalBlocks] = useState<EstimateEditorBlock[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [saveError, setSaveError] = useState<SaveErrorPayload>(null);
  const [saveWarning, setSaveWarning] = useState<SaveWarningPayload>(null);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [lastSaveAt, setLastSaveAt] = useState<string | null>(null);
  const [lastSaveErrorSummary, setLastSaveErrorSummary] = useState<string | null>(null);
  const postSaveExpectedIdsRef = useRef<{ blocks: Set<string>; items: Set<string> } | null>(null);

  // Browser beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || isSavingManual) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSavingManual]);

  // Safe navigation function that checks for unsaved changes
  const safeNavigate = useCallback((path: string) => {
    if (isDirty || isSavingManual) {
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  }, [isDirty, isSavingManual, navigate]);

  const confirmNavigation = useCallback(async () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);
  
  // Track existing items for diffing
  const existingItemsRef = useRef<Map<string, string>>(new Map()); // id -> serialized
  const existingIdsRef = useRef<Set<string>>(new Set());
  const hasMigratedRef = useRef(false);

  // Fetch estimate - cached and won't refetch on window focus
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ["estimate-builder", estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*, projects(id, project_name)")
        .eq("id", estimateId!)
        .single();
      if (error) throw error;
      return data as Estimate;
    },
    enabled: !!estimateId,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch scope blocks with cost items - cached with good stale/gc times
  const { data: scopeBlocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["scope-blocks", "estimate", estimateId],
    queryFn: async () => {
      // Cast to any to avoid Supabase generic type explosion in TS
      let q: any = supabase
        .from("scope_blocks")
        .select(`
          id,
          title,
          description,
          block_type,
          sort_order,
          scope_block_cost_items(*)
        `)
        .eq("entity_type", "estimate")
        .eq("entity_id", estimateId!)
        .eq("block_type", "cost_items");

      const { data, error } = await q.order("sort_order", { ascending: true });
      if (error) throw error;

      // Sort cost items within each block
      const blocks = (data || []).map((block) => ({
        ...block,
        scope_block_cost_items: (block.scope_block_cost_items || []).sort(
          (a: CostItemDB, b: CostItemDB) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
      })) as ScopeBlockDB[];
      
      return blocks;
    },
    enabled: !!estimateId,
    staleTime: 30000, // 30s - don't refetch within this window
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });

  // Fetch cost codes for export
  const { data: catalog } = useCostCodeCatalog();
  const costCodes = useMemo(() => {
    return (catalog?.rows ?? []).map((r) => ({
      id: r.cost_code_id,
      code: r.code,
      name: r.name,
    }));
  }, [catalog?.rows]);

  // Sync local state when DB data changes (ONLY when there are no local unsaved edits)
  useEffect(() => {
    if (scopeBlocks.length > 0) {
      // Block server sync while local edits are dirty or a manual save is in-flight.
      // This prevents typed text from being overwritten by a refetch.
      const blockServerSync = isDirty || isSavingManual || saveError != null;
      
      if (blockServerSync) {
        // Don't overwrite local edits with stale server data
        return;
      }
      
      const transformed = transformToEditorBlocks(scopeBlocks);
      setLocalBlocks(transformed);
      
      // Update tracking refs
      const newMap = new Map<string, string>();
      const newIds = new Set<string>();
      transformed.forEach(b => {
        b.items.forEach(item => {
          newIds.add(item.id);
          newMap.set(item.id, serializeItem(item));
        });
      });
      existingItemsRef.current = newMap;
      existingIdsRef.current = newIds;
    }
  }, [scopeBlocks, isDirty, isSavingManual, saveError]);

  // Post-save integrity guardrails: after a successful save + refetch, verify server matches what we saved.
  useEffect(() => {
    const expected = postSaveExpectedIdsRef.current;
    if (!expected) return;
    if (isDirty || isSavingManual) return;
    if (scopeBlocks.length === 0) return;

    const serverBlocks = new Set(scopeBlocks.map((b) => b.id));
    const serverItems = new Set<string>();
    scopeBlocks.forEach((b) => (b.scope_block_cost_items || []).forEach((it) => serverItems.add(it.id)));

    const blocksMismatch = serverBlocks.size !== expected.blocks.size || [...expected.blocks].some((id) => !serverBlocks.has(id));
    const itemsMismatch = serverItems.size !== expected.items.size || [...expected.items].some((id) => !serverItems.has(id));

    if (blocksMismatch || itemsMismatch) {
      setSaveWarning({
        title: "Server data mismatch after save — possible RLS/trigger rejection",
        message: "After refetch, server data did not match what we attempted to save. Reload and retry.",
        extra: {
          expected: { blocks: expected.blocks.size, items: expected.items.size },
          server: { blocks: serverBlocks.size, items: serverItems.size },
        },
      });
      setIsWarningDismissed(false);
    } else {
      setSaveWarning(null);
      setIsWarningDismissed(false);
    }

    postSaveExpectedIdsRef.current = null;
  }, [scopeBlocks, isDirty, isSavingManual]);

  // Auto-create first scope block if none exist
  const createFirstBlock = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("scope_blocks")
        .insert({
          entity_type: "estimate",
          entity_id: estimateId!,
          block_type: "cost_items",
          title: "New Section",
          sort_order: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onError: (err: Error) => {
      console.error("Failed to create section", { estimateId, error: err });
      toast.error(err.message || "Failed to create section");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
    },
  });

  // Check for and migrate legacy estimate items
  useEffect(() => {
    const checkAndMigrate = async () => {
      if (!estimateId || blocksLoading || hasMigratedRef.current || isMigrating) return;
      
      // Only check when we have loaded blocks and they're empty (no items)
      const hasNoItems = scopeBlocks.every(b => (b.scope_block_cost_items || []).length === 0);
      
      if (!hasNoItems) return; // Already has items in new format
      
      const { needsMigration, legacyItemCount } = await checkEstimateNeedsMigration(estimateId);
      
      if (needsMigration && legacyItemCount > 0) {
        hasMigratedRef.current = true;
        setIsMigrating(true);
        
        const result = await migrateEstimateToScopeBlocks(estimateId);
        
        setIsMigrating(false);
        
        if (result.success && result.migratedCount > 0) {
          toast.success(`Migrated ${result.migratedCount} items to new format`);
          queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
        } else if (result.error) {
          toast.error("Failed to migrate legacy items: " + result.error);
        }
      }
    };
    
    checkAndMigrate();
  }, [estimateId, blocksLoading, scopeBlocks, queryClient, isMigrating]);

  // Auto-create block if needed (only if no legacy items to migrate)
  useEffect(() => {
    const createBlockIfNeeded = async () => {
      if (blocksLoading || scopeBlocks.length > 0 || createFirstBlock.isPending || isMigrating) return;
      
      // Check if there are legacy items first
      const { needsMigration } = await checkEstimateNeedsMigration(estimateId!);
      
      // Only auto-create empty block if no migration needed
      if (!needsMigration) {
        createFirstBlock.mutate();
      }
    };
    
    if (!blocksLoading && scopeBlocks.length === 0 && estimateId) {
      createBlockIfNeeded();
    }
  }, [blocksLoading, scopeBlocks.length, createFirstBlock, estimateId, isMigrating]);

  // Add section mutation
  const addSection = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...localBlocks.map((b) => b.block.sort_order || 0), -1);
      const { data, error } = await supabase
        .from("scope_blocks")
        .insert({
          entity_type: "estimate",
          entity_id: estimateId!,
          block_type: "cost_items",
          title: "New Section",
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
      toast.success("Section added");
    },
    onError: (err: Error) => {
      console.error("Failed to add section", { estimateId, error: err });
      toast.error(err.message || "Failed to add section");
    },
  });

  // Sync to budget
  const syncToBudget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sync_estimate_to_budget", {
        p_estimate_id: estimateId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estimate synced to budget successfully");
      queryClient.invalidateQueries({ queryKey: ["estimate-builder", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["project-budget-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["project-financials-v3"] });
      window.dispatchEvent(new Event("budget-updated"));
    },
    onError: (error: Error) => {
      toast.error("Failed to sync to budget: " + error.message);
    },
  });

  // MANUAL save only: persist inserts/deletes/updates in one pass.
  const saveNow = useCallback(async () => {
    // Save Now preflight (fail-loud + persistent error)
    if (!estimateId) {
      setSaveError({
        title: "Save failed",
        message: "Missing estimateId",
      });
      setLastSaveErrorSummary("Missing estimateId");
      setIsErrorDismissed(false);
      return;
    }
    const companyId = estimate?.company_id ?? null;
    if (!companyId) {
      setSaveError({
        title: "Save failed",
        message: "Missing company_id on estimate (cannot save)",
      });
      setLastSaveErrorSummary("Missing company_id on estimate");
      setIsErrorDismissed(false);
      return;
    }
    if (isSavingManual) return;

    const validation = validateEstimatePayload(localBlocks);
    if (!validation.ok) {
      setSaveError({
        title: "Save failed",
        message: validation.error || "Invalid estimate payload",
      });
      setLastSaveErrorSummary(validation.error || "Invalid estimate payload");
      setIsErrorDismissed(false);
      return;
    }
    
    const blocks = validation.sanitizedBlocks;

    setIsSavingManual(true);
    // do NOT clear error until we have a successful save (per requirements)
    setSaveWarning(null);
    setIsWarningDismissed(false);

    try {
      // Transactional client-side behavior:
      // - Disable button while saving
      // - No refetch / no dirty clear on failure

      const currentItems = new Map<string, ScopeItem>();
      blocks.forEach((b) => b.items.forEach((item) => currentItems.set(item.id, item)));
      
      const currentIds = new Set(currentItems.keys());
      const existingIds = existingIdsRef.current;
      
      // deletions
      const toDelete: string[] = [];
      existingIds.forEach((id) => {
        if (!currentIds.has(id)) toDelete.push(id);
      });
      
      // creations
      const toCreate: ScopeItem[] = [];
      currentItems.forEach((item, id) => {
        if (!existingIds.has(id)) toCreate.push(item);
      });

      // updates (diff against last server snapshot)
      const toUpdate: ScopeItem[] = [];
      currentItems.forEach((item, id) => {
        if (existingIds.has(id)) {
          const prev = existingItemsRef.current.get(id);
          if (prev && prev !== serializeItem(item)) {
            toUpdate.push(item);
          }
        }
      });

      // Fetch UNASSIGNED once per save (deterministic)
      let unassignedId: string | null = null;
      try {
        const { data, error } = await (supabase as any).rpc("get_unassigned_cost_code_id", {
          p_company_id: companyId,
        });
        if (error) throw error;
        unassignedId = data as string;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSaveError({
          title: "Save failed",
          message: msg || "Failed to resolve UNASSIGNED cost code",
          extra: { stage: "get_unassigned_cost_code_id" },
        });
        setLastSaveErrorSummary(msg || "Failed to resolve UNASSIGNED cost code");
        setIsErrorDismissed(false);
        return;
      }

      if (toDelete.length > 0) {
        const { error } = await supabase.from("scope_block_cost_items").delete().in("id", toDelete);
        if (error) throw error;
      }

      if (toCreate.length > 0) {
        const insertData = toCreate.map((item, idx) => ({
          id: item.id,
          scope_block_id: item.scope_block_id,
          category: item.category,
          // cost_code_id MUST be NOT NULL
          cost_code_id: item.cost_code_id || unassignedId,
          description: item.description ?? "",
          quantity: item.quantity ?? 0,
          unit: item.unit || "ea",
          unit_price: item.unit_price ?? 0,
          markup_percent: item.markup_percent ?? 0,
          sort_order: item.sort_order ?? idx,
          area_label: item.area_label,
          group_label: item.group_label,
        }));
        
        const { error } = await supabase.from("scope_block_cost_items").insert(insertData as any);
        if (error) throw error;
      }
      
      if (toUpdate.length > 0) {
        const payload: BatchUpsertItemUpdate[] = toUpdate.map((item) => ({
          id: item.id,
          scope_block_id: item.scope_block_id,
          category: item.category,
          cost_code_id: item.cost_code_id || unassignedId,
          description: item.description ?? "",
          quantity: item.quantity ?? 0,
          unit: item.unit || "ea",
          unit_price: item.unit_price ?? 0,
          markup_percent: item.markup_percent ?? 0,
          area_label: item.area_label ?? null,
          group_label: item.group_label ?? null,
          sort_order: item.sort_order ?? 0,
        }));

        const { data, error } = await (supabase as any).rpc("batch_upsert_cost_items", { p_items: payload });
        if (error) throw error;

        const resultsRaw = data as unknown;
        const results: Array<{ id: string; success: boolean; error?: string | null }> = Array.isArray(resultsRaw)
          ? (resultsRaw as any)
          : [];
        const failures = results.filter((r) => !r?.success);
        if (failures.length > 0) {
          const first = failures[0];
          const msg = first?.error || "Save failed";
          setSaveError({
            title: "Save failed",
            message: msg,
            extra: { failures: failures.slice(0, 25) },
          });
          setLastSaveErrorSummary(msg);
          setIsErrorDismissed(false);
          return;
        }
      }

      // Successful save: clear error + mark expected server ids for integrity check
      setSaveError(null);
      setIsErrorDismissed(false);
      setLastSaveErrorSummary(null);
      setLastSaveAt(new Date().toISOString());

      const expectedBlockIds = new Set(blocks.map((b) => b.block.id));
      const expectedItemIds = new Set<string>();
      blocks.forEach((b) => b.items.forEach((it) => expectedItemIds.add(it.id)));
      postSaveExpectedIdsRef.current = { blocks: expectedBlockIds, items: expectedItemIds };

      // Update tracking refs from sanitized local items
      const newIds = new Set<string>();
      const newMap = new Map<string, string>();
      currentItems.forEach((item, id) => {
        newIds.add(id);
        newMap.set(id, serializeItem(item));
      });
      existingIdsRef.current = newIds;
      existingItemsRef.current = newMap;

      setIsDirty(false);
      toast.success("Saved");

      // Refetch exactly once after success
      await queryClient.refetchQueries({ queryKey: ["scope-blocks", "estimate", estimateId] } as any);
    } catch (e) {
      const errObj: any = e;
      const msg = errObj?.message || (e instanceof Error ? e.message : String(e)) || "Save failed";
      setSaveError({
        title: "Save failed",
        message: msg,
        details: errObj?.details ?? null,
        hint: errObj?.hint ?? null,
        code: errObj?.code ?? null,
      });
      setLastSaveErrorSummary(msg);
      setIsErrorDismissed(false);
      toast.error(msg);
    } finally {
      setIsSavingManual(false);
    }
  }, [estimateId, estimate?.company_id, isSavingManual, localBlocks, queryClient]);

  // Handle blocks change (manual save only)
  const handleBlocksChange = useCallback((newBlocks: EstimateEditorBlock[]) => {
    setLocalBlocks(newBlocks);
    setIsDirty(true);
  }, []);

  // Handle individual item update (manual save only)
  const handleItemUpdate = useCallback((itemId: string, patch: Partial<ScopeItem>) => {
    // Update local state immediately
    setLocalBlocks(prev => prev.map(block => ({
      ...block,
      items: block.items.map(item => 
        item.id === itemId ? { ...item, ...patch } : item
      )
    })));
    setIsDirty(true);
  }, []);

  // Handle immediate item update (manual save only)
  const handleItemUpdateImmediate = useCallback((itemId: string, patch: Partial<ScopeItem>) => {
    // Update local state immediately
    setLocalBlocks(prev => prev.map(block => ({
      ...block,
      items: block.items.map(item => 
        item.id === itemId ? { ...item, ...patch } : item
      )
    })));
    setIsDirty(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {};
  }, []);

  // Handle set as budget source
  const handleSetAsBudgetSource = useCallback(() => {
    syncToBudget.mutate();
  }, [syncToBudget]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    try {
      const costCodeMap = new Map(costCodes.map(cc => [cc.id, { code: cc.code, name: cc.name }]));
      const exportData: EstimateExportData = {
        estimateId: estimateId!,
        title: estimate?.title || "Untitled Estimate",
        projectName: estimate?.projects?.project_name,
        status: estimate?.status || "draft",
        blocks: localBlocks,
        costCodes: costCodeMap,
      };
      downloadCSV(exportData);
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  }, [estimateId, estimate, localBlocks, costCodes]);

  const handleExportPDF = useCallback(() => {
    try {
      const costCodeMap = new Map(costCodes.map(cc => [cc.id, { code: cc.code, name: cc.name }]));
      const exportData: EstimateExportData = {
        estimateId: estimateId!,
        title: estimate?.title || "Untitled Estimate",
        projectName: estimate?.projects?.project_name,
        status: estimate?.status || "draft",
        blocks: localBlocks,
        costCodes: costCodeMap,
      };
      downloadPDF(exportData);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  }, [estimateId, estimate, localBlocks, costCodes]);

  // Loading state
  if (estimateLoading || blocksLoading || isMigrating) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {isMigrating && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Migrating estimate to new format...</span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  // Not found state
  if (!estimate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Estimate not found</h2>
          <p className="text-muted-foreground mb-4">
            The estimate you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/app/projects")}>
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const projectId = estimate.projects?.id;
  const projectName = estimate.projects?.project_name;
  const isBudgetSourceLocked = estimate.is_budget_source === true;
  const combinedGlobalStatus = isSavingManual ? "saving" : isDirty ? "dirty" : "idle";

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Bottom-right save error surface (exact DB/trigger message) */}
        {saveError && !isErrorDismissed && (
          <div className="fixed bottom-4 right-4 z-[9999] max-w-md rounded-lg border bg-background p-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-destructive">{saveError.title}</div>
                <div className="mt-1 text-xs text-muted-foreground break-words">{saveError.message}</div>
                {(saveError.details || saveError.hint || saveError.code) && (
                  <pre className="mt-2 max-h-40 overflow-auto text-[10px] whitespace-pre-wrap opacity-80">
                    {JSON.stringify(
                      {
                        details: saveError.details ?? null,
                        hint: saveError.hint ?? null,
                        code: saveError.code ?? null,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(saveError, null, 2));
                      toast.success("Copied error");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                  className="h-7 px-2"
                >
                  Copy error
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsErrorDismissed(true)}
                  className="h-7 px-2"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-right warning surface (integrity mismatch) */}
        {saveWarning && !isWarningDismissed && (
          <div className="fixed bottom-4 right-4 z-[9998] max-w-md rounded-lg border bg-background p-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{saveWarning.title}</div>
                <div className="mt-1 text-xs text-muted-foreground break-words">{saveWarning.message}</div>
                {saveWarning.extra && (
                  <pre className="mt-2 max-h-40 overflow-auto text-[10px] whitespace-pre-wrap opacity-80">
                    {JSON.stringify(saveWarning.extra, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await queryClient.refetchQueries({ queryKey: ["scope-blocks", "estimate", estimateId] } as any);
                  }}
                  className="h-7 px-2"
                >
                  Reload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWarningDismissed(true)}
                  className="h-7 px-2"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => safeNavigate(`/app/projects/${projectId}?tab=estimates`)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{estimate.title}</h1>
                <Badge variant={estimate.status === "draft" ? "secondary" : "default"}>
                  {estimate.status}
                </Badge>
                {isBudgetSourceLocked && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Budget Source
                  </Badge>
                )}
                {isMigrating && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                    Migrating...
                  </Badge>
                )}
                {/* Manual-save mode: no autosave indicator */}
              </div>
              <p className="text-sm text-muted-foreground truncate">{projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save now button (manual) */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await saveNow();
              }}
              disabled={!isDirty || isSavingManual}
            >
              <Check className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Save now</span>
              <span className="sm:hidden">Save</span>
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => addSection.mutate()}
              disabled={addSection.isPending}
            >
              {addSection.isPending ? (
                <span className="h-4 w-4 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              <span className="hidden sm:inline">Add Section</span>
              <span className="sm:hidden">Section</span>
            </Button>
          </div>
        </div>

        {/* DEV-only manual-save diagnostics */}
        {import.meta.env.DEV && (
          <details className="text-xs opacity-70 bg-muted/50 rounded p-2 border">
            <summary className="cursor-pointer font-mono">
              save: {combinedGlobalStatus} | dirty: {isDirty ? "yes" : "no"} | saving: {isSavingManual ? "yes" : "no"} | error: {saveError ? "yes" : "no"}
            </summary>
            <div className="mt-2 space-y-1">
              <pre className="max-h-40 overflow-auto text-[10px]">
                {JSON.stringify(
                  {
                    status: combinedGlobalStatus,
                    isDirty,
                    isSavingManual,
                    lastSaveAt,
                    lastSaveErrorSummary,
                    saveError: saveError ? { title: saveError.title, message: saveError.message } : null,
                  },
                  null,
                  2
                )}
              </pre>
              <button
                className="text-[10px] underline"
                onClick={() => console.log("Manual save diagnostics:", { isDirty, isSavingManual, lastSaveAt, lastSaveErrorSummary, saveError, localBlocks })}
              >
                Dump save diagnostics
              </button>
            </div>
          </details>
        )}

        {/* ProjectEstimateEditor */}
        <ProjectEstimateEditor
          blocks={localBlocks}
          isBudgetSourceLocked={isBudgetSourceLocked}
          isBudgetSyncing={syncToBudget.isPending}
          onBlocksChange={handleBlocksChange}
          onSetAsBudgetSource={handleSetAsBudgetSource}
          onItemUpdate={handleItemUpdate}
          onItemUpdateImmediate={handleItemUpdateImmediate}
          getItemSaveStatus={() => ({ status: "idle" })}
          onReorderItems={async (blockId, items) => {
            // Batch update sort_order for items
            const promises = items.map((item) =>
              (supabase as any)
                .from("scope_block_cost_items")
                .update({
                  sort_order: item.sort_order,
                  area_label: item.area_label,
                  group_label: item.group_label,
                })
                .eq("id", item.id)
            );
            const results = await Promise.all(promises);
            const errors = results.filter((r) => r.error);
            if (errors.length > 0) {
              const first = errors[0].error;
              console.error("Failed to reorder items", { estimateId, blockId, error: first });
              toast.error(first?.message || "Failed to reorder items");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
            }
          }}
          onMoveItems={async (moves) => {
            // Handle cross-section moves
            const promises = moves.map((move) =>
              (supabase as any)
                .from("scope_block_cost_items")
                .update({
                  scope_block_id: move.scope_block_id,
                  area_label: move.area_label,
                  group_label: move.group_label,
                  sort_order: move.sort_order,
                })
                .eq("id", move.id)
            );
            const results = await Promise.all(promises);
            const errors = results.filter((r) => r.error);
            if (errors.length > 0) {
              const first = errors[0].error;
              console.error("Failed to move item(s)", { estimateId, error: first });
              toast.error(first?.message || "Failed to move item");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
            }
          }}
          onReorderSections={async (sections) => {
            const promises = sections.map((section) =>
              (supabase as any)
                .from("scope_blocks")
                .update({ sort_order: section.sort_order })
                .eq("id", section.id)
            );
            const results = await Promise.all(promises);
            const errors = results.filter((r) => r.error);
            if (errors.length > 0) {
              const first = errors[0].error;
              console.error("Failed to reorder sections", { estimateId, error: first });
              toast.error(first?.message || "Failed to reorder sections");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
            }
          }}
          onUpdateSection={async (blockId, patch) => {
            const { error } = await (supabase as any)
              .from("scope_blocks")
              .update(patch)
              .eq("id", blockId);
            if (error) {
              console.error("Failed to update section", { estimateId, blockId, error });
              toast.error(error.message || "Failed to update section");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
            } else {
              // Update local state
              setLocalBlocks((prev) =>
                prev.map((b) =>
                  b.block.id === blockId
                    ? { ...b, block: { ...b.block, ...patch } }
                    : b
                )
              );
            }
          }}
          onDeleteSection={async (blockId) => {
            try {
              // Delete all cost items first
              const { error: itemsError } = await (supabase as any)
                .from("scope_block_cost_items")
                .delete()
                .eq("scope_block_id", blockId);
              if (itemsError) throw itemsError;

              // Then delete the scope_block
              const { error: blockError } = await (supabase as any)
                .from("scope_blocks")
                .delete()
                .eq("id", blockId);
              if (blockError) throw blockError;

              // Update local state immediately
              setLocalBlocks((prev) => prev.filter((b) => b.block.id !== blockId));
              
              // Refresh from DB
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
              toast.success("Section deleted");
            } catch (error) {
              console.error("Failed to delete section", { estimateId, blockId, error });
              const message = error instanceof Error ? error.message : String(error);
              toast.error(message || "Failed to delete section");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
            }
          }}
        />

        {/* Empty state */}
        {localBlocks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-4">Add a section to start building your estimate.</p>
            <Button 
              onClick={() => addSection.mutate()}
              disabled={addSection.isPending}
            >
              {addSection.isPending ? (
                <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Section
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={pendingNavigation !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>
              Leave Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
