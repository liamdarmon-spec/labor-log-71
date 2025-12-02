import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus, Zap, FileText, Save } from "lucide-react";
import { getUnassignedCostCodeId } from "@/lib/costCodes";
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
import { EstimateSectionCard } from "@/components/estimates/EstimateSectionCard";
import { EstimateSummaryCards } from "@/components/estimates/EstimateSummaryCards";

interface CostItem {
  id: string;
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
}

interface ScopeBlock {
  id: string;
  title: string | null;
  block_type: string;
  sort_order: number;
  scope_block_cost_items: CostItem[];
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

export default function EstimateBuilderV2() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);

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
      return (data || []).map((block) => ({
        ...block,
        scope_block_cost_items: (block.scope_block_cost_items || []).sort(
          (a: CostItem, b: CostItem) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
      })) as ScopeBlock[];
    },
    enabled: !!estimateId,
  });

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

  // Add section
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

  // Update section title
  const updateSectionTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("scope_blocks")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
      const previous = queryClient.getQueryData(["scope-blocks", "estimate", estimateId]);
      queryClient.setQueryData(["scope-blocks", "estimate", estimateId], (old: ScopeBlock[] | undefined) =>
        old?.map((b) => (b.id === id ? { ...b, title } : b))
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["scope-blocks", "estimate", estimateId], context.previous);
      }
    },
  });

  // Delete section
  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scope_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
      toast.success("Section deleted");
    },
  });

  // Add cost item
  const addCostItem = useMutation({
    mutationFn: async (scopeBlockId: string) => {
      const unassignedId = await getUnassignedCostCodeId();
      const block = scopeBlocks.find((b) => b.id === scopeBlockId);
      const maxOrder = Math.max(...(block?.scope_block_cost_items || []).map((i) => i.sort_order || 0), -1);

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .insert({
          scope_block_id: scopeBlockId,
          category: "labor",
          cost_code_id: unassignedId,
          description: "New Item",
          quantity: 1,
          unit: "ea",
          unit_price: 0,
          markup_percent: 0,
          line_total: 0,
          sort_order: maxOrder + 1,
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

  // Update cost item with optimistic updates
  const updateCostItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CostItem> }) => {
      // Find current item to calculate line_total
      const item = scopeBlocks
        .flatMap((b) => b.scope_block_cost_items)
        .find((i) => i.id === id);

      if (!item) throw new Error("Item not found");

      const qty = updates.quantity ?? item.quantity;
      const price = updates.unit_price ?? item.unit_price;
      const markup = updates.markup_percent ?? item.markup_percent;
      const lineTotal = qty * price * (1 + markup / 100);

      const finalUpdates: Partial<CostItem> = {
        ...updates,
        line_total: lineTotal,
      };

      // Ensure we never send null for required fields
      if (finalUpdates.category === null) delete finalUpdates.category;
      if (finalUpdates.description === null) delete finalUpdates.description;

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .update(finalUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });

      const previous = queryClient.getQueryData(["scope-blocks", "estimate", estimateId]);

      queryClient.setQueryData(["scope-blocks", "estimate", estimateId], (old: ScopeBlock[] | undefined) => {
        if (!old) return old;
        return old.map((block) => ({
          ...block,
          scope_block_cost_items: block.scope_block_cost_items.map((item) => {
            if (item.id === id) {
              const qty = updates.quantity ?? item.quantity;
              const price = updates.unit_price ?? item.unit_price;
              const markup = updates.markup_percent ?? item.markup_percent;
              const lineTotal = qty * price * (1 + markup / 100);
              return { ...item, ...updates, line_total: lineTotal };
            }
            return item;
          }),
        }));
      });

      setPendingChanges(true);
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["scope-blocks", "estimate", estimateId], context.previous);
      }
      toast.error("Failed to update item");
    },
    onSettled: () => {
      setPendingChanges(false);
    },
  });

  // Delete cost item
  const deleteCostItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scope_block_cost_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
      toast.success("Item deleted");
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

      // Dispatch event to notify other components
      window.dispatchEvent(new Event("budget-updated"));
      setSyncDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to sync to budget: " + error.message);
    },
  });

  // Handlers wrapped in useCallback
  const handleTitleChange = useCallback(
    (blockId: string, title: string) => {
      updateSectionTitle.mutate({ id: blockId, title });
    },
    [updateSectionTitle]
  );

  const handleAddItem = useCallback(
    (blockId: string) => {
      addCostItem.mutate(blockId);
    },
    [addCostItem]
  );

  const handleUpdateItem = useCallback(
    (itemId: string, updates: Partial<CostItem>) => {
      updateCostItem.mutate({ id: itemId, updates });
    },
    [updateCostItem]
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      deleteCostItem.mutate(itemId);
    },
    [deleteCostItem]
  );

  const handleDeleteSection = useCallback(
    (blockId: string) => {
      deleteSection.mutate(blockId);
    },
    [deleteSection]
  );

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const taxAmount = estimate.tax_amount || 0;

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
                  {estimate.is_budget_source && (
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
              <Button size="sm" onClick={() => setSyncDialogOpen(true)}>
                <Zap className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Sync to Budget</span>
                <span className="sm:hidden">Sync</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <EstimateSummaryCards scopeBlocks={scopeBlocks} taxAmount={taxAmount} />

        {/* Sections */}
        <div className="space-y-4">
          {scopeBlocks.map((block) => (
            <EstimateSectionCard
              key={block.id}
              id={block.id}
              title={block.title}
              items={block.scope_block_cost_items}
              onTitleChange={(title) => handleTitleChange(block.id, title)}
              onAddItem={() => handleAddItem(block.id)}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onDeleteSection={() => handleDeleteSection(block.id)}
              isOnlySection={scopeBlocks.length === 1}
            />
          ))}
        </div>

        {/* Empty state */}
        {scopeBlocks.length === 0 && !blocksLoading && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-4">
              Add a section to start building your estimate
            </p>
            <Button onClick={() => addSection.mutate()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        )}
      </div>

      {/* Sync to Budget Dialog */}
      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Estimate to Budget?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Mark this estimate as the budget baseline</li>
                <li>Create budget lines for each cost code</li>
                <li>Replace any existing budget for this project</li>
              </ul>
              <p className="mt-4 font-medium text-foreground">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => syncToBudget.mutate()}
              disabled={syncToBudget.isPending}
            >
              <Zap className="h-4 w-4 mr-2" />
              {syncToBudget.isPending ? "Syncing..." : "Sync to Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}