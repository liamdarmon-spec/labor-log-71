import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, FileText } from "lucide-react";
import { getUnassignedCostCodeId } from "@/lib/costCodes";
import {
  ProjectEstimateEditor,
  EstimateEditorBlock,
  ScopeItem,
  BudgetCategory,
} from "@/components/estimates/ProjectEstimateEditor";

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

export default function EstimateBuilderV2() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pendingChanges, setPendingChanges] = useState(false);
  
  // Track existing item IDs for diff
  const existingItemIdsRef = useRef<Set<string>>(new Set());

  // Fetch estimate
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
  });

  // Fetch scope blocks with cost items
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
      
      // Update existing item IDs ref
      const allIds = new Set<string>();
      blocks.forEach(b => b.scope_block_cost_items.forEach(i => allIds.add(i.id)));
      existingItemIdsRef.current = allIds;
      
      return blocks;
    },
    enabled: !!estimateId,
  });

  // Transform to editor format
  const editorBlocks = useMemo(() => transformToEditorBlocks(scopeBlocks), [scopeBlocks]);

  // Auto-create first scope block if none exist
  const createFirstBlock = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("scope_blocks")
        .insert({
          entity_type: "estimate",
          entity_id: estimateId!,
          block_type: "cost_items",
          title: "Cost Items",
          sort_order: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
    },
  });

  // Auto-create block if needed
  useEffect(() => {
    if (!blocksLoading && scopeBlocks.length === 0 && !createFirstBlock.isPending) {
      createFirstBlock.mutate();
    }
  }, [blocksLoading, scopeBlocks.length, createFirstBlock]);

  // Add section mutation
  const addSection = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...scopeBlocks.map((b) => b.sort_order || 0), -1);
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

  // Handle blocks change from ProjectEstimateEditor
  const handleBlocksChange = useCallback(
    async (newBlocks: EstimateEditorBlock[]) => {
      setPendingChanges(true);
      
      try {
        const existingIds = existingItemIdsRef.current;
        const newItemsMap = new Map<string, ScopeItem>();
        
        // Collect all new items
        newBlocks.forEach(b => {
          b.items.forEach(item => {
            newItemsMap.set(item.id, item);
          });
        });
        
        const newIds = new Set(newItemsMap.keys());
        
        // Find items to delete (in existing but not in new)
        const toDelete: string[] = [];
        existingIds.forEach(id => {
          if (!newIds.has(id)) {
            toDelete.push(id);
          }
        });
        
        // Find items to create (in new but not in existing)
        const toCreate: ScopeItem[] = [];
        const toUpdate: ScopeItem[] = [];
        
        newItemsMap.forEach((item, id) => {
          if (!existingIds.has(id)) {
            // New item - needs creation
            toCreate.push(item);
          } else {
            // Existing item - needs update
            toUpdate.push(item);
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
        
        // Execute updates (batch for efficiency)
        for (const item of toUpdate) {
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
          
          const { error } = await supabase
            .from("scope_block_cost_items")
            .update({
              scope_block_id: item.scope_block_id,
              category: item.category,
              cost_code_id: item.cost_code_id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              markup_percent: item.markup_percent,
              line_total: lineTotal,
              area_label: item.area_label,
              group_label: item.group_label,
            })
            .eq("id", item.id);
          if (error) throw error;
        }
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
        
      } catch (error) {
        console.error("Error saving changes:", error);
        toast.error("Failed to save changes");
      } finally {
        setPendingChanges(false);
      }
    },
    [estimateId, queryClient]
  );

  // Handle set as budget source
  const handleSetAsBudgetSource = useCallback(() => {
    syncToBudget.mutate();
  }, [syncToBudget]);

  // Loading state
  if (estimateLoading || blocksLoading) {
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
        {/* Header - Sticky on scroll */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 -mx-4 px-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/projects/${projectId}?tab=estimates`)}
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
                  {pendingChanges && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">
                      <Save className="h-3 w-3 mr-1" />
                      Saving...
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{projectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => addSection.mutate()}>
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Add Section</span>
                <span className="sm:hidden">Section</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ProjectEstimateEditor */}
        <ProjectEstimateEditor
          blocks={editorBlocks}
          isBudgetSourceLocked={isBudgetSourceLocked}
          onBlocksChange={handleBlocksChange}
          onSetAsBudgetSource={handleSetAsBudgetSource}
        />

        {/* Empty state */}
        {editorBlocks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-4">Add a section to start building your estimate.</p>
            <Button onClick={() => addSection.mutate()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}