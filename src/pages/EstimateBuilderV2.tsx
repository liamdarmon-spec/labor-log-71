import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { toast } from "sonner";
import { ArrowLeft, Plus, Zap, Trash2 } from "lucide-react";
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

const CATEGORIES = [
  { value: "labor", label: "Labor" },
  { value: "materials", label: "Materials" },
  { value: "subs", label: "Subs" },
  { value: "other", label: "Other" },
];

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
}

interface ScopeBlock {
  id: string;
  title: string | null;
  block_type: string;
  sort_order: number;
  scope_block_cost_items: CostItem[];
}

export default function EstimateBuilderV2() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | string>>({});
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

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
      return data;
    },
    enabled: !!estimateId,
  });

  // Fetch scope blocks
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
      return (data || []) as ScopeBlock[];
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
  if (!blocksLoading && scopeBlocks.length === 0 && !createFirstBlock.isPending) {
    createFirstBlock.mutate();
  }

  // Add cost item
  const addCostItem = useMutation({
    mutationFn: async (scopeBlockId: string) => {
      const unassignedId = await getUnassignedCostCodeId();
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

  // Update cost item with optimistic updates
  const updateCostItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CostItem> }) => {
      // Calculate line_total locally
      const item = scopeBlocks
        .flatMap((b) => b.scope_block_cost_items)
        .find((i) => i.id === id);
      
      if (!item) throw new Error("Item not found");

      const qty = updates.quantity ?? item.quantity;
      const price = updates.unit_price ?? item.unit_price;
      const markup = updates.markup_percent ?? item.markup_percent;
      const lineTotal = qty * price * (1 + markup / 100);

      const finalUpdates = { ...updates, line_total: lineTotal };

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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(["scope-blocks", "estimate", estimateId]);

      // Optimistically update cache
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

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["scope-blocks", "estimate", estimateId], context.previous);
      }
      toast.error("Failed to update item");
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

  // Add new section
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-blocks", "estimate", estimateId] });
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
      setSyncDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to sync to budget: " + error.message);
    },
  });

  // Local totals calculation
  const { subtotal, tax, total } = useMemo(() => {
    const allItems = scopeBlocks.flatMap((b) => b.scope_block_cost_items);
    const subtotal = allItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const tax = estimate?.tax_amount || 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [scopeBlocks, estimate?.tax_amount]);

  // Number draft handlers
  const getDraftNumber = useCallback(
    (itemId: string, field: string) => {
      const key = `${itemId}:${field}`;
      return numberDrafts[key];
    },
    [numberDrafts]
  );

  const setDraftNumber = useCallback((itemId: string, field: string, value: string) => {
    const key = `${itemId}:${field}`;
    setNumberDrafts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const commitDraftNumber = useCallback(
    (itemId: string, field: string) => {
      const key = `${itemId}:${field}`;
      const draftValue = numberDrafts[key];
      if (draftValue === undefined) return;

      const numericValue = draftValue === "" ? 0 : Number(draftValue) || 0;
      updateCostItem.mutate({ id: itemId, updates: { [field]: numericValue } });
      setNumberDrafts((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    },
    [numberDrafts, updateCostItem]
  );

  // Description draft handlers
  const getDraftDescription = useCallback(
    (itemId: string) => descriptionDrafts[itemId],
    [descriptionDrafts]
  );

  const setDraftDescription = useCallback((itemId: string, value: string) => {
    setDescriptionDrafts((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  const commitDraftDescription = useCallback(
    (itemId: string) => {
      const draftValue = descriptionDrafts[itemId];
      if (draftValue === undefined) return;

      updateCostItem.mutate({ id: itemId, updates: { description: draftValue } });
      setDescriptionDrafts((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    },
    [descriptionDrafts, updateCostItem]
  );

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (estimateLoading || blocksLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </Layout>
    );
  }

  if (!estimate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Estimate not found</p>
          <Button onClick={() => navigate("/financials/estimates")} className="mt-4">
            Back to Estimates
          </Button>
        </div>
      </Layout>
    );
  }

  const projectId = (estimate as any).projects?.id;
  const projectName = (estimate as any).projects?.project_name;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/projects/${projectId}?tab=estimates`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{estimate.title}</h1>
              <p className="text-muted-foreground">{projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => addSection.mutate()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
            <Button onClick={() => setSyncDialogOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Sync to Budget
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
              <p className="text-2xl font-bold">{formatMoney(subtotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Tax</p>
              <p className="text-2xl font-bold">{formatMoney(tax)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Items</p>
              <p className="text-2xl font-bold">
                {scopeBlocks.reduce((sum, b) => sum + b.scope_block_cost_items.length, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scope Blocks */}
        {scopeBlocks.map((block) => {
          const blockTotal = block.scope_block_cost_items.reduce(
            (sum, item) => sum + (item.line_total || 0),
            0
          );

          return (
            <Card key={block.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Input
                    value={block.title || ""}
                    onChange={(e) => updateSectionTitle.mutate({ id: block.id, title: e.target.value })}
                    className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCostItem.mutate(block.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead className="w-[180px]">Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px] text-right">Qty</TableHead>
                      <TableHead className="w-[100px]">Unit</TableHead>
                      <TableHead className="w-[120px] text-right">Rate</TableHead>
                      <TableHead className="w-[100px] text-right">Markup %</TableHead>
                      <TableHead className="w-[140px] text-right">Total</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.scope_block_cost_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.category}
                            onValueChange={(val) =>
                              updateCostItem.mutate({ id: item.id, updates: { category: val } })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <CostCodeSelect
                            value={item.cost_code_id}
                            onChange={(val) =>
                              updateCostItem.mutate({ id: item.id, updates: { cost_code_id: val } })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={getDraftDescription(item.id) ?? item.description}
                            onChange={(e) => setDraftDescription(item.id, e.target.value)}
                            onBlur={() => commitDraftDescription(item.id)}
                            placeholder="Description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getDraftNumber(item.id, "quantity") ?? item.quantity}
                            onChange={(e) => setDraftNumber(item.id, "quantity", e.target.value)}
                            onBlur={() => commitDraftNumber(item.id, "quantity")}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <UnitSelect
                            value={item.unit}
                            onChange={(val) =>
                              updateCostItem.mutate({ id: item.id, updates: { unit: val } })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getDraftNumber(item.id, "unit_price") ?? item.unit_price}
                            onChange={(e) => setDraftNumber(item.id, "unit_price", e.target.value)}
                            onBlur={() => commitDraftNumber(item.id, "unit_price")}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getDraftNumber(item.id, "markup_percent") ?? item.markup_percent}
                            onChange={(e) => setDraftNumber(item.id, "markup_percent", e.target.value)}
                            onBlur={() => commitDraftNumber(item.id, "markup_percent")}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(item.line_total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCostItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Section Total</p>
                    <p className="text-xl font-bold">{formatMoney(blockTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Dialog */}
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
              <p className="mt-4 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => syncToBudget.mutate()}>
              <Zap className="h-4 w-4 mr-2" />
              Sync to Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
