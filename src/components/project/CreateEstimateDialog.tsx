import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { EstimateItemDialog, type EstimateItemFormData } from './EstimateItemDialog';

interface CreateEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface EstimateItemWithId extends EstimateItemFormData {
  id: string;
  line_total: number;
}

export function CreateEstimateDialog({ open, onOpenChange, projectId, onSuccess }: CreateEstimateDialogProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [taxAmount, setTaxAmount] = useState('0');
  const [items, setItems] = useState<EstimateItemWithId[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstimateItemWithId | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddItem = (itemData: EstimateItemFormData) => {
    const lineTotal = itemData.quantity * itemData.unit_price;
    const newItem: EstimateItemWithId = {
      ...itemData,
      id: crypto.randomUUID(),
      line_total: lineTotal,
    };
    setItems([...items, newItem]);
  };

  const handleEditItem = (itemData: EstimateItemFormData) => {
    if (!editingItem) return;
    const lineTotal = itemData.quantity * itemData.unit_price;
    setItems(items.map(item => 
      item.id === editingItem.id 
        ? { ...itemData, id: item.id, line_total: lineTotal }
        : item
    ));
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const calculateCategoryTotals = () => {
    const totals = {
      labor: { amount: 0, hours: 0 },
      subs: { amount: 0, hours: 0 },
      materials: { amount: 0, hours: 0 },
      allowance: { amount: 0, hours: 0 },
      other: { amount: 0, hours: 0 },
    };

    items.forEach(item => {
      const catKey = item.category.toLowerCase() as keyof typeof totals;
      if (totals[catKey]) {
        totals[catKey].amount += item.line_total;
        if (item.planned_hours) {
          totals[catKey].hours += item.planned_hours;
        }
      }
    });

    return totals;
  };

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const total = subtotal + parseFloat(taxAmount || '0');
  const categoryTotals = calculateCategoryTotals();

  const handleSubmit = async (acceptAndSetBudget: boolean = false) => {
    if (!title.trim()) {
      toast.error('Please enter an estimate title');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setLoading(true);

    try {
      // Create estimate
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          project_id: projectId,
          title,
          status: acceptAndSetBudget ? 'accepted' : status,
          subtotal_amount: subtotal,
          tax_amount: parseFloat(taxAmount),
          total_amount: total,
          is_budget_source: acceptAndSetBudget,
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Insert estimate items
      const itemsToInsert = items.map(item => ({
        estimate_id: estimate.id,
        description: item.description,
        category: item.category,
        cost_code_id: item.cost_code_id,
        trade_id: item.trade_id,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        planned_hours: item.planned_hours,
        is_allowance: item.is_allowance,
      }));

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // If accepting and setting as budget, call the sync function
      if (acceptAndSetBudget) {
        const { error: syncError } = await supabase.rpc('sync_estimate_to_budget', {
          p_estimate_id: estimate.id
        });

        if (syncError) throw syncError;
        toast.success('Estimate created and set as budget baseline');
      } else {
        toast.success('Estimate created successfully');
      }

      // Reset form
      setTitle('');
      setStatus('draft');
      setTaxAmount('0');
      setItems([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating estimate:', error);
      toast.error('Failed to create estimate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Estimate</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Estimate Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Kitchen Renovation Estimate"
                />
              </div>
              <div>
                <Label htmlFor="status">Initial Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Line Items ({items.length})</Label>
                <Button type="button" size="sm" onClick={() => setIsItemDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.planned_hours || '—'}</TableCell>
                        <TableCell className="text-right font-medium">${item.line_total.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  No items added. Click "Add Item" to get started.
                </div>
              )}
            </div>

            {/* Category Totals */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor:</span>
                  <span className="font-medium">
                    ${categoryTotals.labor.amount.toFixed(2)}
                    {categoryTotals.labor.hours > 0 && ` • ${categoryTotals.labor.hours}h`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subs:</span>
                  <span className="font-medium">${categoryTotals.subs.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materials:</span>
                  <span className="font-medium">${categoryTotals.materials.amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allowance:</span>
                  <span className="font-medium">${categoryTotals.allowance.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Other:</span>
                  <span className="font-medium">${categoryTotals.other.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="tax">Tax Amount:</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-32"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleSubmit(false)} disabled={loading}>
                Save Draft
              </Button>
              <Button type="button" onClick={() => handleSubmit(true)} disabled={loading}>
                Accept & Set as Budget
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EstimateItemDialog
        open={isItemDialogOpen}
        onOpenChange={(open) => {
          setIsItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSave={editingItem ? handleEditItem : handleAddItem}
        estimateItem={editingItem}
      />
    </>
  );
}
