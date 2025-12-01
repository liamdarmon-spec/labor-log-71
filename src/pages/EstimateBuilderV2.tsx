// src/pages/EstimateBuilderV2.tsx
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { getUnassignedCostCodeId } from "@/lib/costCodes";
import { DollarSign, Save, Zap } from "lucide-react";

type ScopeBlockType = "section" | "cost_items" | "text" | "image";

interface ScopeBlockCostItem {
  id: string;
  scope_block_id: string;
  category: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  markup_percent: number | null;
  notes: string | null;
  cost_code_id: string | null;
  cost_codes?: {
    code: string | null;
    name: string | null;
  } | null;
}

interface ScopeBlock {
  id: string;
  block_type: ScopeBlockType;
  title: string | null;
  description: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  scope_block_cost_items?: ScopeBlockCostItem[];
}

interface EstimateRecord {
  id: string;
  project_id: string;
  title: string | null;
  status: string;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  created_at: string;
  is_budget_source: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "labor", label: "Labor" },
  { value: "subs", label: "Subs" },
  { value: "materials", label: "Materials" },
  { value: "other", label: "Other" },
];

const formatMoney = (value: number | null | undefined) =>
  `$${(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function EstimateBuilderV2() {
  const { estimateId } = useParams<{ estimateId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!estimateId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Missing estimate id in route.
        </p>
      </div>
    );
  }

  // 1) Load estimate + blocks + items
  const { data, isLoading } = useQuery({
    queryKey: ["estimate-builder", estimateId],
    queryFn: async () => {
      const { data: estimate, error: estError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .maybeSingle<EstimateRecord>();

      if (estError) throw estError;
      if (!estimate) throw new Error("Estimate not found");

      const { data: blocks, error: blocksError } = await supabase
        .from("scope_blocks")
        .select(`
          id,
          block_type,
          title,
          description,
          sort_order,
          is_visible,
          scope_block_cost_items (
            id,
            scope_block_id,
            category,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            markup_percent,
            notes,
            cost_code_id,
            cost_codes (code, name)
          )
        `)
        .eq("entity_type", "estimate")
        .eq("entity_id", estimateId)
        .order("sort_order", { ascending: true });

      if (blocksError) throw blocksError;

      return {
        estimate,
        scopeBlocks: (blocks || []) as ScopeBlock[],
      };
    },
  });

  const estimate = data?.estimate;
  const scopeBlocks = data?.scopeBlocks || [];
  const projectId = estimate?.project_id || null;

  // 2) Totals (from scope block items)
  const { subtotal, tax, total } = useMemo(() => {
    if (!estimate) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    const subtotalFromItems = scopeBlocks.reduce((sum, block) => {
      const items = block.scope_block_cost_items || [];
      const blockTotal = items.reduce(
        (acc, item) => acc + (item.line_total || 0),
        0
      );
      return sum + blockTotal;
    }, 0);

    const taxAmount = estimate.tax_amount ?? 0;
    const totalAmount = subtotalFromItems + taxAmount;

    return { subtotal: subtotalFromItems, tax: taxAmount, total: totalAmount };
  }, [estimate, scopeBlocks]);

  // 3) Mutations

  const addCostItemMutation = useMutation({
    mutationFn: async (scope_block_id: string) => {
      const unassignedId = await getUnassignedCostCodeId();

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .insert({
          scope_block_id,
          category: "materials",
          description: "",
          quantity: 1,
          unit: "ea",
          unit_price: 0,
          line_total: 0,
          markup_percent: 0,
          notes: null,
          cost_code_id: unassignedId,
        })
        .select(
          `
          id,
          scope_block_id,
          category,
          description,
          quantity,
          unit,
          unit_price,
          line_total,
          markup_percent,
          notes,
          cost_code_id,
          cost_codes (code, name)
        `
        )
        .single<ScopeBlockCostItem>();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-builder", estimateId] });
    },
    onError: (err: any) => {
      console.error("Failed to add cost item", err);
      toast({
        title: "Failed to add cost item",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    },
  });

  const updateCostItemMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      patch: Partial<ScopeBlockCostItem>;
    }) => {
      const { id, patch } = payload;

      // recompute line_total if qty, unit_price, or markup changed
      let newPatch = { ...patch } as any;

      if ("quantity" in patch || "unit_price" in patch || "markup_percent" in patch) {
        const { data: existing, error: getErr } = await supabase
          .from("scope_block_cost_items")
          .select("quantity, unit_price, markup_percent")
          .eq("id", id)
          .maybeSingle<
            Pick<ScopeBlockCostItem, "quantity" | "unit_price" | "markup_percent">
          >();

        if (getErr) throw getErr;

        const quantity =
          (patch.quantity ?? existing?.quantity ?? 0) || 0;
        const unit_price =
          (patch.unit_price ?? existing?.unit_price ?? 0) || 0;
        const markup_percent =
          (patch.markup_percent ?? existing?.markup_percent ?? 0) || 0;

        const base = quantity * unit_price;
        newPatch.line_total = base * (1 + markup_percent / 100);
      }

      const { error } = await supabase
        .from("scope_block_cost_items")
        .update(newPatch)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-builder", estimateId] });
    },
    onError: (err: any) => {
      console.error("Failed to update item", err);
      toast({
        title: "Failed to update item",
        description: "Your change was not saved.",
        variant: "destructive",
      });
    },
  });

  const saveEstimateTotalsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("estimates")
        .update({
          subtotal_amount: subtotal,
          tax_amount: tax,
          total_amount: total,
        })
        .eq("id", estimateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-builder", estimateId] });
      toast({ title: "Draft saved", description: "Estimate totals updated." });
    },
    onError: (err: any) => {
      console.error("Failed to save estimate", err);
      toast({
        title: "Failed to save",
        description: "Could not update estimate totals.",
        variant: "destructive",
      });
    },
  });

  const saveAndSetBudgetMutation = useMutation({
    mutationFn: async () => {
      // 1) Update estimate header
      const { error: estErr } = await supabase
        .from("estimates")
        .update({
          status: "accepted",
          is_budget_source: true,
          subtotal_amount: subtotal,
          tax_amount: tax,
          total_amount: total,
        })
        .eq("id", estimateId);

      if (estErr) throw estErr;

      // 2) Sync to budget via RPC (this also updates is_budget_source flags)
      const { error: rpcErr } = await supabase.rpc("sync_estimate_to_budget", {
        p_estimate_id: estimateId,
      });
      if (rpcErr) throw rpcErr;

      // 3) Notify budget views
      window.dispatchEvent(new Event("budget-updated"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-builder", estimateId] });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project_budget_header", projectId],
        });
      }

      toast({
        title: "Budget baseline set",
        description: "This estimate is now the active project budget.",
        action: projectId
          ? {
              label: "View Budget",
              onClick: () => {
                navigate(`/projects/${projectId}?tab=budget`);
              },
            }
          : undefined,
      });
    },
    onError: (err: any) => {
      console.error("Failed to sync to budget", err);
      toast({
        title: "Failed to sync to budget",
        description: "Your estimate was saved but the budget was not updated.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !estimate) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleAddCostItem = (blockId: string) => {
    addCostItemMutation.mutate(blockId);
  };

  const handleItemFieldChange = (
    itemId: string,
    patch: Partial<ScopeBlockCostItem>
  ) => {
    updateCostItemMutation.mutate({ id: itemId, patch });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Card className="min-w-[200px]">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
              <p className="text-2xl font-bold">{formatMoney(subtotal)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[200px]">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Tax</p>
              <p className="text-2xl font-bold">{formatMoney(tax)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[200px]">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">
                Total Estimate
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatMoney(total)}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {estimate.is_budget_source && (
            <Badge className="gap-1">
              <DollarSign className="h-3 w-3" />
              Budget Baseline
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveEstimateTotalsMutation.mutate()}
            disabled={saveEstimateTotalsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveEstimateTotalsMutation.isPending ? "Saving…" : "Save as Draft"}
          </Button>
          <Button
            size="sm"
            onClick={() => saveAndSetBudgetMutation.mutate()}
            disabled={saveAndSetBudgetMutation.isPending}
          >
            <Zap className="h-4 w-4 mr-1" />
            {saveAndSetBudgetMutation.isPending
              ? "Syncing…"
              : "Save & Set as Budget"}
          </Button>
        </div>
      </div>

      {/* Cost item blocks */}
      {scopeBlocks
        .filter((b) => b.block_type === "cost_items")
        .map((block) => {
          const items = block.scope_block_cost_items || [];
          const sectionTotal = items.reduce(
            (acc, item) => acc + (item.line_total || 0),
            0
          );

          return (
            <Card key={block.id}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {block.title || "Cost Items"}
                  </CardTitle>
                  {block.description && (
                    <p className="text-xs text-muted-foreground">
                      {block.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">
                  cost_items
                </Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Markup %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="w-[120px]">
                          <Select
                            value={item.category ?? "materials"}
                            onValueChange={(val) =>
                              handleItemFieldChange(item.id, { category: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <CostCodeSelect
                            value={item.cost_code_id}
                            required
                            onChange={(val) =>
                              handleItemFieldChange(item.id, {
                                cost_code_id: val ?? undefined,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <Input
                            className="h-8 text-sm"
                            value={item.description}
                            onChange={(e) =>
                              handleItemFieldChange(item.id, {
                                description: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right w-[80px]">
                          <Input
                            type="number"
                            className="h-8 text-right text-xs"
                            value={item.quantity ?? 0}
                            onChange={(e) =>
                              handleItemFieldChange(item.id, {
                                quantity: Number(e.target.value || 0),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="w-[80px]">
                          <Input
                            className="h-8 text-xs"
                            value={item.unit ?? "ea"}
                            onChange={(e) =>
                              handleItemFieldChange(item.id, {
                                unit: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right w-[110px]">
                          <Input
                            type="number"
                            className="h-8 text-right text-xs"
                            value={item.unit_price ?? 0}
                            onChange={(e) =>
                              handleItemFieldChange(item.id, {
                                unit_price: Number(e.target.value || 0),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right w-[110px]">
                          <Input
                            type="number"
                            className="h-8 text-right text-xs"
                            value={item.markup_percent ?? 0}
                            onChange={(e) =>
                              handleItemFieldChange(item.id, {
                                markup_percent: Number(e.target.value || 0),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right w-[120px] text-sm font-semibold">
                          {formatMoney(item.line_total || 0)}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell colSpan={8}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => handleAddCostItem(block.id)}
                          disabled={addCostItemMutation.isPending}
                        >
                          + Add Cost Item
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-medium">
                        Section Total:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatMoney(sectionTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

      {/* (Optional) show text / image blocks in a separate editor if needed */}
    </div>
  );
}
