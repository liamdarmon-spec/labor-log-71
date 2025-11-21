import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useCostCodes } from "@/hooks/useCostCodes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  quantity: number;
  unit: string;
  unit_price: number;
  planned_hours: number | null;
  is_allowance: boolean;
}

const CATEGORIES = ['Labor', 'Subs', 'Materials', 'Allowance', 'Other'];
const UNITS = ['ea', 'sf', 'lf', 'hr', 'day', 'ls', 'ton', 'cy'];

export function EstimateItemDialog({ open, onOpenChange, onSave, estimateItem }: EstimateItemDialogProps) {
  const [formData, setFormData] = useState<EstimateItemFormData>({
    description: '',
    category: 'Labor',
    cost_code_id: null,
    trade_id: null,
    quantity: 1,
    unit: 'ea',
    unit_price: 0,
    planned_hours: null,
    is_allowance: false,
  });

  useEffect(() => {
    if (estimateItem) {
      setFormData({
        description: estimateItem.description || '',
        category: estimateItem.category || 'Labor',
        cost_code_id: estimateItem.cost_code_id || null,
        trade_id: estimateItem.trade_id || null,
        quantity: estimateItem.quantity || 1,
        unit: estimateItem.unit || 'ea',
        unit_price: estimateItem.unit_price || 0,
        planned_hours: estimateItem.planned_hours || null,
        is_allowance: estimateItem.is_allowance || false,
      });
    }
  }, [estimateItem]);

  const categoryForCostCodes = formData.category === 'Labor' ? 'labor' 
    : formData.category === 'Subs' ? 'subs'
    : formData.category === 'Materials' ? 'materials'
    : 'other';

  const { data: costCodes } = useCostCodes(categoryForCostCodes as any);
  
  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: formData.category === 'Labor',
  });

  const lineTotal = formData.quantity * formData.unit_price;
  const showPlannedHours = formData.category === 'Labor';

  const handleSave = () => {
    onSave(formData);
    setFormData({
      description: '',
      category: 'Labor',
      cost_code_id: null,
      trade_id: null,
      quantity: 1,
      unit: 'ea',
      unit_price: 0,
      planned_hours: null,
      is_allowance: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{estimateItem ? 'Edit' : 'Add'} Estimate Item</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cost Code</Label>
              <Select 
                value={formData.cost_code_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, cost_code_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cost code..." />
                </SelectTrigger>
                <SelectContent>
                  {costCodes?.map(code => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.category === 'Labor' && (
            <div>
              <Label>Trade</Label>
              <Select 
                value={formData.trade_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, trade_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trade..." />
                </SelectTrigger>
                <SelectContent>
                  {trades?.map(trade => (
                    <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit Price</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {showPlannedHours && (
            <div>
              <Label>Planned Hours (optional)</Label>
              <Input 
                type="number"
                step="0.5"
                value={formData.planned_hours || ''}
                onChange={(e) => setFormData({ ...formData, planned_hours: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Leave empty to auto-calculate from labor rate"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allowance"
              checked={formData.is_allowance}
              onCheckedChange={(checked) => setFormData({ ...formData, is_allowance: checked as boolean })}
            />
            <Label htmlFor="allowance" className="text-sm">This is an allowance</Label>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Line Total:</span>
              <span className="text-lg font-bold">${lineTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Item</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
