// src/components/project/EstimateItemDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useTradesSimple } from "@/hooks/useTrades";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";

interface EstimateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: EstimateItemFormData) => void;
  estimateItem?: any;
}

export interface EstimateItemFormData {
  description: string;
  category: string;
  cost_code_id: string | null;
  trade_id: string | null;
  quantity: string;
  unit: string;
  unit_price: string;
  planned_hours: string;
  is_allowance: boolean;
  area_name: string;
  scope_group: string;
}

const CATEGORIES = ["Labor", "Subs", "Materials", "Allowance", "Other"];
const UNITS = ["ea", "sf", "lf", "hr", "day", "ls", "ton", "cy"];

export function EstimateItemDialog({ open, onOpenChange, onSave, estimateItem }: EstimateItemDialogProps) {
  const [formData, setFormData] = useState<EstimateItemFormData>({
    description: "",
    category: "Labor",
    cost_code_id: null,
    trade_id: null,
    quantity: "",
    unit: "ea",
    unit_price: "",
    planned_hours: "",
    is_allowance: false,
    area_name: "",
    scope_group: "",
  });

  useEffect(() => {
    if (estimateItem) {
      setFormData({
        description: estimateItem.description || "",
        category: estimateItem.category || "Labor",
        cost_code_id: estimateItem.cost_code_id || null,
        trade_id: estimateItem.trade_id || null,
        quantity: estimateItem.quantity?.toString() || "",
        unit: estimateItem.unit || "ea",
        unit_price: estimateItem.unit_price?.toString() || "",
        planned_hours: estimateItem.planned_hours?.toString() || "",
        is_allowance: estimateItem.is_allowance || false,
        area_name: estimateItem.area_name || "",
        scope_group: estimateItem.scope_group || "",
      });
    } else {
      setFormData({
        description: "",
        category: "Labor",
        cost_code_id: null,
        trade_id: null,
        quantity: "",
        unit: "ea",
        unit_price: "",
        planned_hours: "",
        is_allowance: false,
        area_name: "",
        scope_group: "",
      });
    }
  }, [estimateItem, open]);

  // Map UI category to cost code category
  const categoryForCostCodes =
    formData.category === "Labor"
      ? "labor"
      : formData.category === "Subs"
      ? "subs"
      : formData.category === "Materials"
      ? "materials"
      : "other";

  // Use centralized hook with caching
  const { data: trades = [] } = useTradesSimple();

  const qty = parseFloat(formData.quantity) || 0;
  const price = parseFloat(formData.unit_price) || 0;
  const lineTotal = qty * price;
  const showPlannedHours = formData.category === "Labor";

  const handleSave = () => {
    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.unit_price);

    if (!formData.cost_code_id) {
      alert("Please select a cost code");
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid unit price");
      return;
    }

    onSave(formData);
    setFormData({
      description: "",
      category: "Labor",
      cost_code_id: null,
      trade_id: null,
      quantity: "",
      unit: "ea",
      unit_price: "",
      planned_hours: "",
      is_allowance: false,
      area_name: "",
      scope_group: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{estimateItem ? "Edit" : "Add"} Estimate Item</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cost Code *</Label>
              <CostCodeSelect
                value={formData.cost_code_id}
                required
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    cost_code_id: val ?? null,
                  }))
                }
              />
            </div>
          </div>

          {formData.category === "Labor" && (
            <div>
              <Label>Trade</Label>
              <Select
                value={formData.trade_id ?? undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, trade_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trade..." />
                </SelectTrigger>
                <SelectContent>
                  {trades?.map((trade) => (
                    <SelectItem key={trade.id} value={trade.id}>
                      {trade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Item description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Area (optional)</Label>
              <Input
                value={formData.area_name}
                onChange={(e) =>
                  setFormData({ ...formData, area_name: e.target.value })
                }
                placeholder="e.g., Kitchen, Primary Bath"
              />
            </div>
            <div>
              <Label>Scope/Phase (optional)</Label>
              <Input
                value={formData.scope_group}
                onChange={(e) =>
                  setFormData({ ...formData, scope_group: e.target.value })
                }
                placeholder="e.g., Demo, Rough, Finish"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div>
              <Label>Unit</Label>
              <UnitSelect
                value={formData.unit}
                onChange={(value) => setFormData({ ...formData, unit: value })}
              />
            </div>

            <div>
              <Label>Unit Price * ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {showPlannedHours && (
            <div>
              <Label>Planned Hours (optional)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.planned_hours}
                onChange={(e) =>
                  setFormData({ ...formData, planned_hours: e.target.value })
                }
                placeholder="0"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowance"
              checked={formData.is_allowance}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_allowance: checked as boolean })
              }
            />
            <Label htmlFor="allowance" className="text-sm">
              This is an allowance
            </Label>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Line Total:</span>
              <span className="text-lg font-bold">
                {lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Item</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
