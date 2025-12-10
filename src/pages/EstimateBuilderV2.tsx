import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileText, Check, Download, FileSpreadsheet, Undo2, Redo2 } from "lucide-react";
import { useUndoStack } from "@/hooks/useUndoStack";
import { getUnassignedCostCodeId } from "@/lib/costCodes";
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
import { useItemAutosave } from "@/hooks/useItemAutosave";
import { GlobalSaveStatus } from "@/components/estimates/SaveStatusIndicator";
import { SyncEstimateDialog } from "@/components/estimates/SyncEstimateDialog";
import { useSyncEstimateToBudget } from "@/hooks/useSyncEstimateToBudget";

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

  // Local state for immediate UI updates with undo/redo support
  const {
    state: localBlocks,
    setState: setLocalBlocks,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetUndoStack,
  } = useUndoStack<EstimateEditorBlock[]>([], { maxHistory: 20 });
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Per-row autosave hook
  const autosave = useItemAutosave(estimateId);
  const globalStatus = autosave.getGlobalStatus();
  const hasUnsavedChanges = autosave.hasPendingChanges();

  // Browser beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Safe navigation function that checks for unsaved changes
  const safeNavigate = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  }, [hasUnsavedChanges, navigate]);

  const confirmNavigation = useCallback(async () => {
    if (pendingNavigation) {
      // Try to flush pending saves before navigating
      await autosave.flushPendingSaves();
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate, autosave]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);
  
  // Track existing items for diffing
  const existingItemsRef = useRef<Map<string, string>>(new Map()); // id -> serialized
  const existingIdsRef = useRef<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasMigratedRef = useRef(false);

  // Fetch estimate - cached and won't refetch on window focus
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ["estimate-builder", estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*, projects(id, project_name)")
        .eq("id", estimateId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Estimate not found');
      }
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
      const { data, error } = await supabase
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
        .eq("block_type", "cost_items")
        .order("sort_order", { ascending: true });
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
  const { data: costCodes = [] } = useQuery({
    queryKey: ["cost-codes-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_codes")
        .select("id, code, name")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track if we're in an undo/redo operation (skip DB sync during this)
  const isUndoRedoRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Sync local state when DB data changes
  useEffect(() => {
    if (scopeBlocks.length > 0) {
      const transformed = transformToEditorBlocks(scopeBlocks);
      
      // On initial load, reset the undo stack (clears history)
      // On subsequent syncs, only update if not in undo/redo operation
      if (!hasInitializedRef.current) {
        resetUndoStack(transformed);
        hasInitializedRef.current = true;
      } else if (!isUndoRedoRef.current) {
        // Server sync after user change - update tracking refs but don't push to undo stack
        // The local state should already match from user's change
      }
      
      // Always update tracking refs
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
  }, [scopeBlocks, resetUndoStack]);

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
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error('Failed to create scope block');
        }
        return data;
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
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create scope block');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
      toast.success("Section added");
    },
  });

  // Sync to budget dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const syncMutation = useSyncEstimateToBudget();

  // Track in-flight save to prevent overlapping mutations (for batch structural changes)
  const isSavingRef = useRef(false);
  const pendingBlocksRef = useRef<EstimateEditorBlock[] | null>(null);

  // Batch save for structural changes (add/delete items, reorder)
  const saveStructuralChanges = useCallback(async (blocks: EstimateEditorBlock[]) => {
    if (isSavingRef.current) {
      pendingBlocksRef.current = blocks;
      return;
    }
    
    isSavingRef.current = true;
    
    try {
      const currentItems = new Map<string, ScopeItem>();
      blocks.forEach(b => b.items.forEach(item => currentItems.set(item.id, item)));
      
      const currentIds = new Set(currentItems.keys());
      const existingIds = existingIdsRef.current;
      
      // Find deletions
      const toDelete: string[] = [];
      existingIds.forEach(id => {
        if (!currentIds.has(id)) toDelete.push(id);
      });
      
      // Find creates
      const toCreate: ScopeItem[] = [];
      currentItems.forEach((item, id) => {
        if (!existingIds.has(id)) {
          toCreate.push(item);
        }
      });
      
      // Execute deletions
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("scope_block_cost_items")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }
      
      // Execute creations
      if (toCreate.length > 0) {
        const unassignedId = await getUnassignedCostCodeId();
        const insertData = toCreate.map((item, idx) => ({
          id: item.id, // IMPORTANT: Use client-generated ID so autosave can find the item
          scope_block_id: item.scope_block_id,
          category: item.category,
          cost_code_id: item.cost_code_id || unassignedId,
          description: item.description || "New Item",
          quantity: item.quantity || 1,
          unit: item.unit || "ea",
          unit_price: item.unit_price || 0,
          markup_percent: item.markup_percent || 0,
          line_total: (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100),
          sort_order: idx,
          area_label: item.area_label,
          group_label: item.group_label,
        }));
        
        const { error } = await supabase
          .from("scope_block_cost_items")
          .insert(insertData);
        if (error) throw error;
      }
      
      // Update tracking refs
      const newIds = new Set<string>();
      currentItems.forEach((_, id) => newIds.add(id));
      existingIdsRef.current = newIds;
      
      // Refresh data after structural changes
      queryClient.invalidateQueries({ 
        queryKey: ["scope-blocks", "estimate", estimateId],
        refetchType: "active"
      });
      
    } catch (error) {
      console.error("Error saving structural changes:", error);
      toast.error("Failed to save changes");
    } finally {
      isSavingRef.current = false;
      
      if (pendingBlocksRef.current) {
        const pending = pendingBlocksRef.current;
        pendingBlocksRef.current = null;
        saveStructuralChanges(pending);
      }
    }
  }, [estimateId, queryClient]);

  // Handle blocks change - for structural changes only
  const handleBlocksChange = useCallback((newBlocks: EstimateEditorBlock[]) => {
    setLocalBlocks(newBlocks);
    
    // Check if this is a structural change (add/delete) vs field update
    const currentIds = new Set<string>();
    newBlocks.forEach(b => b.items.forEach(item => currentIds.add(item.id)));
    
    const hasNewItems = [...currentIds].some(id => !existingIdsRef.current.has(id));
    const hasDeletedItems = [...existingIdsRef.current].some(id => !currentIds.has(id));
    const hasStructuralChange = hasNewItems || hasDeletedItems;
    
    if (hasStructuralChange) {
      // Clear any pending debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // NEW ITEMS: Save immediately to prevent autosave race condition
      // DELETIONS: Can be debounced since no autosave will target deleted items
      if (hasNewItems) {
        // Save immediately so autosave can find the new item
        saveStructuralChanges(newBlocks);
      } else if (hasDeletedItems) {
        // Debounce deletions
        saveTimeoutRef.current = setTimeout(() => {
          saveStructuralChanges(newBlocks);
        }, 300);
      }
    }
  }, [saveStructuralChanges]);

  // Handle individual item update via autosave
  const handleItemUpdate = useCallback((itemId: string, patch: Partial<ScopeItem>) => {
    // Update local state immediately
    setLocalBlocks(prev => prev.map(block => ({
      ...block,
      items: block.items.map(item => 
        item.id === itemId ? { ...item, ...patch } : item
      )
    })));
    
    // Queue debounced save
    autosave.queueUpdate({ id: itemId, ...patch });
  }, [autosave]);

  // Handle immediate item update (for dropdowns)
  const handleItemUpdateImmediate = useCallback((itemId: string, patch: Partial<ScopeItem>) => {
    // Update local state immediately
    setLocalBlocks(prev => prev.map(block => ({
      ...block,
      items: block.items.map(item => 
        item.id === itemId ? { ...item, ...patch } : item
      )
    })));
    
    // Save immediately
    autosave.saveImmediate({ id: itemId, ...patch });
  }, [autosave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Note: autosave cleanup is now automatic via useEffect in the hook
    };
  }, []);

  // Undo/Redo handlers - state changes are automatically synced via the effect below
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoRef.current = true;
    undo();
    // Reset flag after a short delay to allow the sync effect to process
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    toast.info("Undo");
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoRef.current = true;
    redo();
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    toast.info("Redo");
  }, [canRedo, redo]);

  // Effect to sync server after undo/redo state changes
  const prevBlocksRef = useRef<EstimateEditorBlock[]>(localBlocks);
  useEffect(() => {
    // Only trigger save if blocks actually changed and we have initialized
    if (hasInitializedRef.current && prevBlocksRef.current !== localBlocks) {
      const prevIds = new Set<string>();
      prevBlocksRef.current.forEach(b => b.items.forEach(item => prevIds.add(item.id)));
      
      const currentIds = new Set<string>();
      localBlocks.forEach(b => b.items.forEach(item => currentIds.add(item.id)));
      
      // Check for structural changes (add/delete)
      const hasStructuralChange =
        currentIds.size !== prevIds.size ||
        [...currentIds].some(id => !prevIds.has(id)) ||
        [...prevIds].some(id => !currentIds.has(id));
      
      if (hasStructuralChange) {
        // Debounce the save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveStructuralChanges(localBlocks);
        }, 300);
      }
    }
    prevBlocksRef.current = localBlocks;
  }, [localBlocks, saveStructuralChanges]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows) for undo
      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows) for redo
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === 'z') {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Handle set as budget source - opens dialog
  const handleSetAsBudgetSource = useCallback(() => {
    setSyncDialogOpen(true);
  }, []);

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
          <Button onClick={() => navigate("/projects")}>
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const projectId = estimate.projects?.id;
  const projectName = estimate.projects?.project_name;
  const isBudgetSourceLocked = estimate.is_budget_source === true;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => safeNavigate(`/projects/${projectId}?tab=estimates`)}
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
                <GlobalSaveStatus status={globalStatus} />
              </div>
              <p className="text-sm text-muted-foreground truncate">{projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo/Redo buttons */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="rounded-none border-0 px-2"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo (⌘Z)</p>
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="rounded-none border-0 px-2"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo (⌘⇧Z)</p>
                </TooltipContent>
              </Tooltip>
            </div>

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

        {/* ProjectEstimateEditor */}
        <ProjectEstimateEditor
          blocks={localBlocks}
          estimateId={estimateId}
          isBudgetSourceLocked={isBudgetSourceLocked}
          isBudgetSyncing={syncMutation.isPending}
          onBlocksChange={handleBlocksChange}
          onSetAsBudgetSource={handleSetAsBudgetSource}
          onItemUpdate={handleItemUpdate}
          onItemUpdateImmediate={handleItemUpdateImmediate}
          getItemSaveStatus={(itemId) => autosave.getRowState(itemId)}
          onItemRetry={(itemId, values) => autosave.retrySave(itemId, { id: itemId, ...values })}
          onReorderItems={async (blockId, items) => {
            // Batch update sort_order for items
            const promises = items.map((item) =>
              supabase
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
              toast.error("Failed to reorder items");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
            }
          }}
          onMoveItems={async (moves) => {
            // Handle cross-section moves
            const promises = moves.map((move) =>
              supabase
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
              toast.error("Failed to move item");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
            }
          }}
          onReorderSections={async (sections) => {
            const promises = sections.map((section) =>
              supabase
                .from("scope_blocks")
                .update({ sort_order: section.sort_order })
                .eq("id", section.id)
            );
            const results = await Promise.all(promises);
            const errors = results.filter((r) => r.error);
            if (errors.length > 0) {
              toast.error("Failed to reorder sections");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
            }
          }}
          onUpdateSection={async (blockId, patch) => {
            const { error } = await supabase
              .from("scope_blocks")
              .update(patch)
              .eq("id", blockId);
            if (error) {
              toast.error("Failed to update section");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
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
              const { error: itemsError } = await supabase
                .from("scope_block_cost_items")
                .delete()
                .eq("scope_block_id", blockId);
              if (itemsError) throw itemsError;

              // Then delete the scope_block
              const { error: blockError } = await supabase
                .from("scope_blocks")
                .delete()
                .eq("id", blockId);
              if (blockError) throw blockError;

              // Update local state immediately
              setLocalBlocks((prev) => prev.filter((b) => b.block.id !== blockId));
              
              // Refresh from DB
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
              toast.success("Section deleted");
            } catch (error) {
              toast.error("Failed to delete section");
              queryClient.invalidateQueries({ queryKey: ["scope-blocks", estimateId] });
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

      {/* Sync Estimate Dialog */}
      {estimate && estimate.projects && (
        <SyncEstimateDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          projectId={estimate.projects.id}
          estimateId={estimateId!}
          estimateTitle={estimate.title}
        />
      )}
    </Layout>
  );
}
