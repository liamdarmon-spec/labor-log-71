import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Fragment } from "react";

interface EstimateDetailsSheetProps {
  estimateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export function EstimateDetailsSheet({
  estimateId,
  open,
  onOpenChange,
}: EstimateDetailsSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["estimate-details", estimateId],
    enabled: !!estimateId,
    queryFn: async () => {
      if (!estimateId) return null;

      const { data: estimate, error: estError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .single();

      if (estError) throw estError;

      const { data: items, error: itemsError } = await supabase
        .from("estimate_items")
        .select(
          `
          *,
          cost_codes (code, name),
          trades (name)
        `,
        )
        .eq("estimate_id", estimateId)
        .order("category")
        .order("area_name", { ascending: true });

      if (itemsError) throw itemsError;

      return { estimate, items: items || [] };
    },
  });

  const estimate = data?.estimate;
  const items = data?.items || [];

  const groupedByCategory: Record<string, any[]> = {};
  items.forEach((item: any) => {
    const key = (item.category || "other").toLowerCase();
    if (!groupedByCategory[key]) groupedByCategory[key] = [];
    groupedByCategory[key].push(item);
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {estimate?.title || "Estimate Details"}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        )}

        {!isLoading && estimate && (
          <div className="mt-6 space-y-6">
            {/* Top summary */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Estimate Summary
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Snapshot of status and totals
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={statusColors[estimate.status] || statusColors.draft}
                >
                  {estimate.status}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-semibold">
                    ${Number(estimate.subtotal_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tax</p>
                  <p className="text-lg font-semibold">
                    ${Number(estimate.tax_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">
                    ${Number(estimate.total_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {estimate.created_at
                      ? format(new Date(estimate.created_at), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No line items added to this estimate.
                  </p>
                )}

                {items.length > 0 &&
                  Object.entries(groupedByCategory).map(
                    ([category, catItems]) => (
                      <Fragment key={category}>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {category}
                        </p>
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cost Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Area / Phase</TableHead>
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
                                <TableHead className="text-right">
                                  Planned Hrs
                                </TableHead>
                                <TableHead>Allowance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {catItems.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-xs">
                                    {item.cost_codes?.code || "—"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">
                                        {item.description}
                                      </span>
                                      {item.trades?.name && (
                                        <span className="text-xs text-muted-foreground">
                                          {item.trades.name}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      {item.area_name && (
                                        <span className="text-xs">
                                          {item.area_name}
                                        </span>
                                      )}
                                      {item.scope_group && (
                                        <span className="text-xs text-muted-foreground">
                                          {item.scope_group}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                  <TableCell className="text-right">
                                    ${Number(item.unit_price || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${Number(item.line_total || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.planned_hours
                                      ? Number(
                                          item.planned_hours,
                                        ).toFixed(1)
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {item.is_allowance ? "✓" : ""}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Fragment>
                    ),
                  )}
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
