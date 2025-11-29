import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Star, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface EstimateDetailsSheetProps {
  estimateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScopeBlockCostItem {
  id: string;
  category: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  notes: string | null;
  cost_codes?: {
    code: string | null;
    name: string | null;
  } | null;
}

interface ScopeBlock {
  id: string;
  block_type: string;
  title: string | null;
  description: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  scope_block_cost_items?: ScopeBlockCostItem[];
}

interface LegacyEstimateItem {
  id: string;
  category: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  area_name: string | null;
  scope_group: string | null;
  cost_codes?: {
    code: string | null;
    name: string | null;
  } | null;
}

export function EstimateDetailsSheet({
  estimateId,
  open,
  onOpenChange,
}: EstimateDetailsSheetProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["estimate-details", estimateId],
    enabled: !!estimateId && open,
    queryFn: async () => {
      if (!estimateId) return null;

      // 1) Fetch estimate header
      const { data: estData, error: estError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .single();

      if (estError) throw estError;

      // 2) Fetch scope blocks + cost items (new system)
      const { data: blocksData, error: blocksError } = await supabase
        .from("scope_blocks")
        .select(
          `
          id,
          block_type,
          title,
          description,
          sort_order,
          is_visible,
          scope_block_cost_items (
            id,
            category,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            notes,
            cost_codes (code, name)
          )
        `
        )
        .eq("entity_type", "estimate")
        .eq("entity_id", estimateId)
        .order("sort_order", { ascending: true });

      if (blocksError) throw blocksError;

      // 3) Fetch legacy estimate_items as fallback
      const { data: legacyItems, error: itemsError } = await supabase
        .from("estimate_items")
        .select(
          `
          id,
          category,
          description,
          quantity,
          unit,
          unit_price,
          line_total,
          area_name,
          scope_group,
          cost_codes (code, name)
        `
        )
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        estimate: estData,
        scopeBlocks: (blocksData || []) as ScopeBlock[],
        legacyItems: (legacyItems || []) as LegacyEstimateItem[],
      };
    },
  });

  const estimate = data?.estimate;
  const scopeBlocks = data?.scopeBlocks || [];
  const legacyItems = data?.legacyItems || [];

  const usesScopeBlocks = scopeBlocks.length > 0;

  const totals = useMemo(() => {
    if (!estimate && !usesScopeBlocks && legacyItems.length === 0) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    if (usesScopeBlocks) {
      const subtotal = scopeBlocks.reduce((sum, block) => {
        const items = block.scope_block_cost_items || [];
        const blockTotal = items.reduce(
          (acc, item) => acc + (item.line_total || 0),
          0
        );
        return sum + blockTotal;
      }, 0);
      const tax = estimate?.tax_amount ?? 0;
      const total = subtotal + tax;
      return { subtotal, tax, total };
    } else if (legacyItems.length > 0) {
      const subtotal = legacyItems.reduce(
        (sum, item) => sum + (item.line_total || 0),
        0
      );
      const tax = estimate?.tax_amount ?? 0;
      const total = subtotal + tax;
      return { subtotal, tax, total };
    } else {
      return {
        subtotal: estimate?.subtotal_amount ?? 0,
        tax: estimate?.tax_amount ?? 0,
        total: estimate?.total_amount ?? 0,
      };
    }
  }, [estimate, usesScopeBlocks, scopeBlocks, legacyItems]);

  const statusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "accepted":
        return "default";
      case "rejected":
        return "destructive";
      case "draft":
      default:
        return "secondary";
    }
  };

  const displayCategory = (raw?: string | null) => {
    const v = (raw || "").toLowerCase();
    if (v.startsWith("lab")) return "Labor";
    if (v.startsWith("sub")) return "Subs";
    if (v.startsWith("mat")) return "Materials";
    if (v.startsWith("allow")) return "Allowance";
    return "Other";
  };

  const formatMoney = (value: number | null | undefined) =>
    `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleEdit = () => {
    if (!estimateId) return;
    onOpenChange(false);
    navigate(`/estimates/${estimateId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {isLoading || !estimate ? (
          <div className="mt-10 space-y-4">
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-2">
              <SheetTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {estimate.title}
                </span>
                <div className="flex items-center gap-2">
                  {estimate.is_budget_source && (
                    <Badge className="gap-1">
                      <Star className="h-3 w-3" />
                      Budget Baseline
                    </Badge>
                  )}
                  <Badge variant={statusVariant(estimate.status)}>
                    {estimate.status}
                  </Badge>
                </div>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Created{" "}
                  {estimate.created_at
                    ? format(new Date(estimate.created_at), "MMM d, yyyy h:mm a")
                    : "—"}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="gap-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit in Builder
                  </Button>
                  {estimate.status !== "accepted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve (via Builder)
                    </Button>
                  )}
                </div>
              </SheetDescription>
            </SheetHeader>

            {/* Summary cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(totals.subtotal)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Tax</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(totals.tax)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Estimate
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatMoney(totals.total)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Line items */}
            <div className="mt-8 space-y-4">
              {usesScopeBlocks ? (
                scopeBlocks
                  .filter((b) => b.is_visible !== false)
                  .map((block) => {
                    const items = block.scope_block_cost_items || [];
                    if (!items.length && !block.title && !block.description)
                      return null;

                    return (
                      <Card key={block.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              {block.title && (
                                <p className="font-semibold">{block.title}</p>
                              )}
                              {block.description && (
                                <p className="text-xs text-muted-foreground">
                                  {block.description}
                                </p>
                              )}
                            </div>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              {block.block_type}
                            </span>
                          </div>

                          {items.length > 0 && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Item</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Cost Code</TableHead>
                                  <TableHead className="text-right">
                                    Qty
                                  </TableHead>
                                  <TableHead>Unit</TableHead>
                                  <TableHead className="text-right">
                                    Unit Price
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Line Total
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="max-w-[220px]">
                                      <div className="font-medium truncate">
                                        {item.description}
                                      </div>
                                      {item.notes && (
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                          {item.notes}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {displayCategory(item.category)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {item.cost_codes?.code ? (
                                        <span className="text-xs">
                                          {item.cost_codes.code}{" "}
                                          {item.cost_codes.name &&
                                            `– ${item.cost_codes.name}`}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          Unmapped
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.quantity ?? "—"}
                                    </TableCell>
                                    <TableCell>{item.unit || "ea"}</TableCell>
                                    <TableCell className="text-right">
                                      {formatMoney(item.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatMoney(item.line_total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
              ) : legacyItems.length > 0 ? (
                // Legacy estimate_items view
                <Card>
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area / Group</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Cost Code</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">
                            Line Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {legacyItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.area_name ||
                                item.scope_group ||
                                "—"}
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <div className="font-medium truncate">
                                {item.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {displayCategory(item.category)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.cost_codes?.code ? (
                                <span className="text-xs">
                                  {item.cost_codes.code}{" "}
                                  {item.cost_codes.name &&
                                    `– ${item.cost_codes.name}`}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Unmapped
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantity ?? "—"}
                            </TableCell>
                            <TableCell>{item.unit || "ea"}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.line_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <p>No line items found for this estimate.</p>
                    <p className="text-xs mt-1">
                      Use the builder to add scope blocks and cost items.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
