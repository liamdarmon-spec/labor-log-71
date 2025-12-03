import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface CostItem {
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
  area_label?: string | null;
  breakdown_notes?: string | null;
}

interface EstimateCostItemRowProps {
  item: CostItem;
  onUpdate: (updates: Partial<CostItem>) => void;
  onDelete: () => void;
}

const CATEGORIES = [
  { value: "labor", label: "Labor", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { value: "materials", label: "Materials", color: "bg-green-500/10 text-green-700 border-green-200" },
  { value: "subs", label: "Subs", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  { value: "other", label: "Other", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
];

export function EstimateCostItemRow({
  item,
  onUpdate,
  onDelete,
}: EstimateCostItemRowProps) {
  // Local drafts for number fields
  const [qtyDraft, setQtyDraft] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const [markupDraft, setMarkupDraft] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState<string | null>(null);
  const [breakdownDraft, setBreakdownDraft] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const breakdownRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [descDraft, item.description]);

  useEffect(() => {
    if (breakdownRef.current && detailsOpen) {
      breakdownRef.current.style.height = "auto";
      breakdownRef.current.style.height = `${Math.max(breakdownRef.current.scrollHeight, 80)}px`;
    }
  }, [breakdownDraft, item.breakdown_notes, detailsOpen]);

  const commitQty = useCallback(() => {
    if (qtyDraft !== null) {
      const val = parseFloat(qtyDraft) || 0;
      onUpdate({ quantity: val });
      setQtyDraft(null);
    }
  }, [qtyDraft, onUpdate]);

  const commitRate = useCallback(() => {
    if (rateDraft !== null) {
      const val = parseFloat(rateDraft) || 0;
      onUpdate({ unit_price: val });
      setRateDraft(null);
    }
  }, [rateDraft, onUpdate]);

  const commitMarkup = useCallback(() => {
    if (markupDraft !== null) {
      const val = parseFloat(markupDraft) || 0;
      onUpdate({ markup_percent: val });
      setMarkupDraft(null);
    }
  }, [markupDraft, onUpdate]);

  const commitDesc = useCallback(() => {
    if (descDraft !== null && descDraft !== item.description) {
      onUpdate({ description: descDraft });
    }
    setDescDraft(null);
  }, [descDraft, item.description, onUpdate]);

  const commitArea = useCallback(() => {
    const newVal = areaDraft?.trim() || null;
    if (areaDraft !== null && newVal !== (item.area_label || null)) {
      onUpdate({ area_label: newVal });
    }
    setAreaDraft(null);
  }, [areaDraft, item.area_label, onUpdate]);

  const commitBreakdown = useCallback(() => {
    const newVal = breakdownDraft?.trim() || null;
    if (breakdownDraft !== null && newVal !== (item.breakdown_notes || null)) {
      onUpdate({ breakdown_notes: newVal });
    }
    setBreakdownDraft(null);
  }, [breakdownDraft, item.breakdown_notes, onUpdate]);

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const categoryInfo = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[3];
  const hasBreakdown = !!item.breakdown_notes?.trim();

  return (
    <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
      <div className="flex flex-col gap-3 p-4 border-b lg:border-b-0 lg:grid lg:grid-cols-[80px_100px_140px_1fr_70px_70px_90px_70px_90px_70px] lg:gap-2 lg:px-4 lg:py-2 lg:items-start hover:bg-muted/30 transition-colors group">
        {/* Mobile: Description first for context */}
        <div className="lg:hidden order-first">
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <Textarea
            ref={textareaRef}
            value={descDraft ?? item.description}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            placeholder="Item description"
            className="min-h-[32px] py-1.5 text-sm resize-none overflow-hidden"
            rows={1}
          />
        </div>

        {/* Mobile: Area label */}
        <div className="lg:hidden">
          <label className="text-xs text-muted-foreground mb-1 block">Area</label>
          <Input
            value={areaDraft ?? item.area_label ?? ""}
            onChange={(e) => setAreaDraft(e.target.value)}
            onBlur={commitArea}
            placeholder="e.g. Kitchen"
            className="h-8 text-sm"
            maxLength={50}
          />
        </div>

        {/* Desktop: Area */}
        <div className="hidden lg:block">
          <Input
            value={areaDraft ?? item.area_label ?? ""}
            onChange={(e) => setAreaDraft(e.target.value)}
            onBlur={commitArea}
            placeholder="Area"
            className="h-8 text-xs"
            maxLength={50}
          />
        </div>

        {/* Mobile row: Category + Cost Code + Delete */}
        <div className="flex gap-2 lg:contents">
          <div className="flex-1 lg:flex-none">
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Category</label>
            <Select
              value={item.category}
              onValueChange={(val) => onUpdate({ category: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1", cat.color)}
                      >
                        {cat.value.slice(0, 3).toUpperCase()}
                      </Badge>
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 lg:flex-none">
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Cost Code</label>
            <CostCodeSelect
              value={item.cost_code_id}
              onChange={(val) => onUpdate({ cost_code_id: val })}
              compact
            />
          </div>

          {/* Delete - visible on mobile */}
          <div className="flex items-end lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop only: Description */}
        <div className="hidden lg:block">
          <Textarea
            value={descDraft ?? item.description}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            placeholder="Item description"
            className="min-h-[32px] h-8 py-1.5 text-sm resize-none overflow-hidden"
            rows={1}
          />
        </div>

        {/* Mobile row: Qty + Unit + Rate */}
        <div className="grid grid-cols-3 gap-2 lg:contents">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Qty</label>
            <Input
              type="number"
              value={qtyDraft ?? item.quantity}
              onChange={(e) => setQtyDraft(e.target.value)}
              onBlur={commitQty}
              className="h-8 text-right text-sm"
              step="any"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Unit</label>
            <UnitSelect
              value={item.unit}
              onChange={(val) => onUpdate({ unit: val })}
              className="h-8"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Rate</label>
            <Input
              type="number"
              value={rateDraft ?? item.unit_price}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={commitRate}
              className="h-8 text-right text-sm"
              step="any"
            />
          </div>
        </div>

        {/* Mobile row: Markup + Total */}
        <div className="grid grid-cols-2 gap-2 lg:contents">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Markup %</label>
            <Input
              type="number"
              value={markupDraft ?? item.markup_percent}
              onChange={(e) => setMarkupDraft(e.target.value)}
              onBlur={commitMarkup}
              className="h-8 text-right text-sm"
              step="any"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block lg:hidden">Total</label>
            <div className="flex items-center justify-end h-8 font-medium text-sm bg-muted/30 rounded px-2 lg:bg-transparent lg:px-0">
              {formatMoney(item.line_total)}
            </div>
          </div>
        </div>

        {/* Desktop: Details toggle + Delete button */}
        <div className="hidden lg:flex items-center justify-center gap-1 h-8">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs gap-1",
                hasBreakdown && "text-primary"
              )}
            >
              {detailsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="hidden xl:inline">Details</span>
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile: Details toggle */}
        <div className="lg:hidden">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full h-8 text-xs gap-2",
                hasBreakdown && "border-primary/50 text-primary"
              )}
            >
              {detailsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Details / Breakdown
              {hasBreakdown && <Badge variant="secondary" className="text-[10px] px-1">Has notes</Badge>}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      {/* Collapsible Details Panel */}
      <CollapsibleContent>
        <div className="px-4 py-3 bg-muted/20 border-b">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Breakdown (internal notes, optional)
          </label>
          <Textarea
            ref={breakdownRef}
            value={breakdownDraft ?? item.breakdown_notes ?? ""}
            onChange={(e) => setBreakdownDraft(e.target.value)}
            onBlur={commitBreakdown}
            placeholder="Example: Remove uppers & lowers, demo backsplash, demo flooring to subfloor…"
            className="min-h-[80px] text-sm resize-none"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}