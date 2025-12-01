// src/components/estimates/EstimateBuilderV2.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

interface EstimateBuilderProps {
  estimateId: string;
  projectId: string;
}

const CATEGORY_OPTIONS = [
  { value: "labor", label: "Labor" },
  { value: "subs", label: "Subs" },
  { value: "materials", label: "Materials" },
  { value: "other", label: "Other" },
];

const UNIT_OPTIONS = [
  { value: "ea", label: "Each" },
  { value: "lf", label: "Linear Ft" },
  { value: "sf", label: "Square Ft" },
  { value: "sy", label: "Square Yd" },
  { value: "cf", label: "Cubic Ft" },
  { value: "day", label: "Day" },
  { value: "hr", label: "Hour" },
  { value: "wk", label: "Week" },
  { value: "ls", label: "Lump Sum" },
];

const normalizeCategory = (raw: string | null) => {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("lab")) return "labor";
  if (v.startsWith("sub")) return "subs";
  if (v.startsWith("mat")) return "materials";
  return "other";
};

const normalizeUnit = (raw: string | null) => {
  const v = (raw || "").toLowerCase();
  if (!v) return "ea";
  const valid = UNIT_OPTIONS.map((u) => u.value);
  return valid.includes(v as any) ? v : "ea";
};

// local drafts for numeric fields so typing is instant
type NumberDrafts = Record<
  string,
  {
    quantity?: string;
    unit_price?: string;
    markup_percent?: string;
  }
>;

export function EstimateBuilderV2({
  estimateId,
  projectId,
}: EstimateBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [numberDrafts, setNumberDrafts] = useState<NumberDrafts>({});

  /* 1) Load estimate + blocks + items */

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

  /* 2) Helpers: totals */

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

    const tax = estimate.tax_amount ?? 0;
    const total = subtotalFromItems + tax;

    return { subtotal: subtotalFromItems, tax, total };
  }, [estimate, scopeBlocks]);

  const formatMoney = (value: number | null | undefined) =>
    `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  /* 3) Mutations */

  const addCostItemMutation = useMutation({
    mutationFn: async (scope_block_id: string) => {
      const unassignedId = await getUnassignedCostCodeId();

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .insert({
          scope_block_id,
          category: "materials",
          description: "",
          quantity: null,
          unit: "ea",
          unit_price: null,
          line_total: 0,
          markup_percent: null,
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
      queryClient.invalidateQueries({
        queryKey: ["estimate-builder", estimateId],
      });
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

      // recompute line_total if qty or unit_price changed
      let newPatch = { ...patch } as any;
      if ("quantity" in patch || "unit_price" in patch) {
        const { data: existing, error: getErr } = await supabase
          .from("scope_block_cost_items")
          .select("quantity, unit_price")
          .eq("id", id)
          .maybeSingle<Pick<ScopeBlockCostItem, "quantity" | "unit_price">>();

        if (getErr) throw getErr;
        const quantity = (patch.quantity ?? existing?.quantity ?? 0) || 0;
        const unit_price = (patch.unit_price ?? existing?.unit_price ?? 0) || 0;
        newPatch.line_total = quantity * unit_price;
      }

      const { error } = await supabase
        .from("scope_block_cost_items")
        .update(newPatch)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate-builder", estimateId],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["estimate-builder", estimateId],
      });
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

      const { error: rpcErr } = await supabase.rpc("sync_estimate_to_budget", {
        p_estimate_id: estimateId,
      });
      if (rpcErr) throw rpcErr;

      window.dispatchEvent(new Event("budget-updated"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate-builder", estimateId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project_budget_header", projectId],
      });

      toast({
        title: "Budget baseline set",
        description: "This estimate is now the active project budget.",
        action: {
          label: "View Budget",
          onClick: () => {
            navigate(`/projects/${projectId}?tab=budget`);
          },
        },
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

  /* 4) Helpers for field changes */

  const handleAddCostItem = (blockId: string) => {
    addCostItemMutation.mutate(blockId);
  };

  const handleItemFieldChange = (
    itemId: string,
    patch: Partial<ScopeBlockCostItem>
  ) => {
    updateCostItemMutation.mutate({ id: itemId, patch });
  };

  const formatNumberInputValue = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : value;

  const displayLineTotal = (item: ScopeBlockCostItem) => {
    const hasQty = !!item.quantity && item.quantity !== 0;
    const hasRate = !!item.unit_price && item.unit_price !== 0;
    if (!hasQty && !hasRate && (!item.line_total || item.line_total === 0)) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return <span>{formatMoney(item.line_total || 0)}</span>;
  };

  // local draft helpers for numeric fields
  const getDraftNumber = (
    item: ScopeBlockCostItem,
    key: keyof NumberDrafts[string]
  ) => {
    const draft = numberDrafts[item.id]?.[key];
    if (draft !== undefined) return draft;
    const base =
      key === "quantity"
        ? item.quantity
        : key === "unit_price"
        ? item.unit_price
        : item.markup_percent;
    return base !== null && base !== undefined ? String(base) : "";
  };

  const setDraftNumber = (
    itemId: string,
    key: keyof NumberDrafts[string],
    value: string
  ) => {
    setNumberDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [key]: value,
      },
    }));
  };

  const commitDraftNumber = (
    itemId: string,
    key: keyof NumberDrafts[string],
    value: string
  ) => {
    const numericValue =
      value === "" ? null : (Number.isNaN(Number(value)) ? null : Number(value));

    if (key === "quantity") {
      handleItemFieldChange(itemId, { quantity: numericValue as any });
    } else if (key === "unit_price") {
      handleItemFieldChange(itemId, { unit_price: numericValue as any });
    } else if (key === "markup_percent") {
      handleItemFieldChange(itemId, { markup_percent: numericValue as any });
    }
  };

  /* 5) Rendering */

  if (isLoading || !estimate) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Helper strip about groups/items */}
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            Use <span className="font-medium">groups / sections</span> (e.g.
            Tile, Demo, Framing) and add{" "}
            <span className="font-medium">cost items</span> inside each group
            for labor, subs, and materials. Each row pulls into your project
            budget by cost code.
          </p>
        </CardContent>
      </Card>

      {/* Cost item blocks */}
      {scopeBlocks
        .filter((b) => b.block_type === "cost_items")
        .map((block) => {
          const items = block.scope_block_cost_items || [];

          const sectionTotal = items.reduce(
            (acc, item) => acc + (item.line_total || 0),
            0
          );

          const categoryTotals = items.reduce(
            (acc, item) => {
              const key = normalizeCategory(item.category);
              acc[key] += item.line_total || 0;
              return acc;
            },
            { labor: 0, subs: 0, materials: 0, other: 0 }
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
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Items in this table roll up under this group in your project
                    budget.
                  </p>
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
                    {items.map((item) => {
                      const currentUnit = normalizeUnit(item.unit);
                      const currentCategory = normalizeCategory(
                        item.category
                      );

                      const qtyDraft = getDraftNumber(item, "quantity");
                      const rateDraft = getDraftNumber(item, "unit_price");
                      const markupDraft = getDraftNumber(
                        item,
                        "markup_percent"
                      );

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="w-[120px]">
                            <Select
                              value={currentCategory}
                              onValueChange={(val) =>
                                handleItemFieldChange(item.id, {
                                  category: val,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
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
                              placeholder="Describe the work or material…"
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
                              inputMode="decimal"
                              step="0.01"
                              min={0}
                              className="h-8 text-right text-xs"
                              placeholder="Qty"
                              value={qtyDraft}
                              onChange={(e) =>
                                setDraftNumber(
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                commitDraftNumber(
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="w-[100px]">
                            <Select
                              value={currentUnit}
                              onValueChange={(val) =>
                                handleItemFieldChange(item.id, {
                                  unit: val,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right w-[110px]">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min={0}
                              className="h-8 text-right text-xs"
                              placeholder="Rate"
                              value={rateDraft}
                              onChange={(e) =>
                                setDraftNumber(
                                  item.id,
                                  "unit_price",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                commitDraftNumber(
                                  item.id,
                                  "unit_price",
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right w-[110px]">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min={0}
                              className="h-8 text-right text-xs"
                              placeholder="0"
                              value={markupDraft}
                              onChange={(e) =>
                                setDraftNumber(
                                  item.id,
                                  "markup_percent",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                commitDraftNumber(
                                  item.id,
                                  "markup_percent",
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right w-[120px] text-sm font-semibold">
                            {displayLineTotal(item)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

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
                      <TableCell
                        colSpan={7}
                        className="text-right font-medium align-top"
                      >
                        <div className="space-y-1">
                          <div>Section Total:</div>
                          <div className="text-[11px] text-muted-foreground">
                            Labor {formatMoney(categoryTotals.labor)} · Subs{" "}
                            {formatMoney(categoryTotals.subs)} · Materials{" "}
                            {formatMoney(categoryTotals.materials)} · Other{" "}
                            {formatMoney(categoryTotals.other)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold align-middle">
                        {formatMoney(sectionTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

      {/* (Optional) text / image blocks can still be rendered below using your existing implementation */}
    </div>
  );
}
