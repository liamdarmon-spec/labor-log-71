import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CostItem {
  category: string;
  line_total: number;
}

interface ScopeBlock {
  scope_block_cost_items: CostItem[];
}

interface EstimateSummaryCardsProps {
  scopeBlocks: ScopeBlock[];
  taxAmount: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  labor: { bg: "bg-blue-500/10", text: "text-blue-700" },
  subs: { bg: "bg-orange-500/10", text: "text-orange-700" },
  materials: { bg: "bg-green-500/10", text: "text-green-700" },
  other: { bg: "bg-gray-500/10", text: "text-gray-700" },
};

export function EstimateSummaryCards({
  scopeBlocks,
  taxAmount,
}: EstimateSummaryCardsProps) {
  const { subtotal, total, itemCount, categoryTotals } = useMemo(() => {
    const allItems = scopeBlocks.flatMap((b) => b.scope_block_cost_items);
    const subtotal = allItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const total = subtotal + (taxAmount || 0);

    const categoryTotals: Record<string, number> = {};
    for (const item of allItems) {
      const cat = item.category || "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.line_total || 0);
    }

    return { subtotal, total, itemCount: allItems.length, categoryTotals };
  }, [scopeBlocks, taxAmount]);

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* Subtotal */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">Subtotal</p>
          <p className="text-xl font-bold">{formatMoney(subtotal)}</p>
        </CardContent>
      </Card>

      {/* Tax */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">Tax</p>
          <p className="text-xl font-bold">{formatMoney(taxAmount)}</p>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">Total</p>
          <p className="text-xl font-bold text-primary">{formatMoney(total)}</p>
        </CardContent>
      </Card>

      {/* Items Count */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">Items</p>
          <p className="text-xl font-bold">{itemCount}</p>
        </CardContent>
      </Card>

      {/* Category Breakdown - visible on larger screens */}
      <Card className="hidden lg:block col-span-2">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryTotals).map(([cat, amount]) => {
              const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
              return (
                <Badge
                  key={cat}
                  variant="outline"
                  className={cn("text-xs px-2 py-1", colors.bg, colors.text)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}: {formatMoney(amount)}
                </Badge>
              );
            })}
            {Object.keys(categoryTotals).length === 0 && (
              <span className="text-sm text-muted-foreground">No items</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}