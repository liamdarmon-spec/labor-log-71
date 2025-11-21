import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, CheckCircle2, TrendingUp, Star } from 'lucide-react';
import { format } from 'date-fns';

interface Estimate {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  created_at: string;
  is_budget_source: boolean;
}

interface EstimateItem {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  line_total: number;
  category: string;
}

export const ProjectEstimatesEnhanced = ({ projectId }: { projectId: string }) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    status: 'draft',
    tax_amount: '0',
  });
  const [lineItems, setLineItems] = useState<EstimateItem[]>([
    { description: '', quantity: '1', unit: 'ea', unit_price: '0', line_total: 0, category: 'labor' }
  ]);

  useEffect(() => {
    fetchEstimates();
  }, [projectId]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimates(data || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const calculateLineTotal = (quantity: string, unitPrice: string) => {
    return Number(quantity) * Number(unitPrice);
  };

  const calculateCategorySubtotals = () => {
    const subtotals = {
      labor: 0,
      subs: 0,
      materials: 0,
      allowance: 0,
      other: 0,
    };
    
    lineItems.forEach(item => {
      const category = item.category as keyof typeof subtotals;
      subtotals[category] = (subtotals[category] || 0) + item.line_total;
    });
    
    return subtotals;
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + Number(formData.tax_amount);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unit: 'ea', unit_price: '0', line_total: 0, category: 'labor' }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof EstimateItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].line_total = calculateLineTotal(updated[index].quantity, updated[index].unit_price);
    }
    
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          project_id: projectId,
          title: formData.title,
          status: formData.status,
          subtotal_amount: subtotal,
          tax_amount: Number(formData.tax_amount),
          total_amount: total,
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      const itemsToInsert = lineItems.map(item => ({
        estimate_id: estimate.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
        line_total: item.line_total,
        category: item.category,
      }));

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Estimate created successfully');
      setIsDialogOpen(false);
      setFormData({ title: '', status: 'draft', tax_amount: '0' });
      setLineItems([{ description: '', quantity: '1', unit: 'ea', unit_price: '0', line_total: 0, category: 'labor' }]);
      fetchEstimates();
    } catch (error) {
      console.error('Error creating estimate:', error);
      toast.error('Failed to create estimate');
    }
  };

  const syncToBudget = async (estimateId: string) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('line_total, category')
        .eq('estimate_id', estimateId);

      if (itemsError) throw itemsError;

      const laborTotal = items?.filter(i => i.category === 'labor').reduce((sum, item) => sum + Number(item.line_total), 0) || 0;
      const subsTotal = items?.filter(i => i.category === 'subs').reduce((sum, item) => sum + Number(item.line_total), 0) || 0;
      const materialsTotal = items?.filter(i => i.category === 'materials').reduce((sum, item) => sum + Number(item.line_total), 0) || 0;

      const { error: budgetError } = await supabase
        .from('project_budgets')
        .upsert({
          project_id: projectId,
          labor_budget: laborTotal,
          subs_budget: subsTotal,
          materials_budget: materialsTotal,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id'
        });

      if (budgetError) throw budgetError;

      // Mark this estimate as budget source
      await supabase
        .from('estimates')
        .update({ is_budget_source: false })
        .eq('project_id', projectId);

      const { error: markError } = await supabase
        .from('estimates')
        .update({ is_budget_source: true })
        .eq('id', estimateId);

      if (markError) throw markError;

      toast.success('Budget synced from estimate');
      fetchEstimates();
    } catch (error) {
      console.error('Error syncing to budget:', error);
      toast.error('Failed to sync budget');
    }
  };

  const updateEstimateStatus = async (estimateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: newStatus })
        .eq('id', estimateId);

      if (error) throw error;
      toast.success('Estimate status updated');
      fetchEstimates();
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast.error('Failed to update estimate');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  const categorySubtotals = calculateCategorySubtotals();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Estimates</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Kitchen Renovation Estimate"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateLineItem(index, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="subs">Subs</SelectItem>
                            <SelectItem value="materials">Materials</SelectItem>
                            <SelectItem value="allowance">Allowance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Unit"
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm font-medium">${item.line_total.toFixed(2)}</p>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor:</span>
                      <span className="font-medium">${categorySubtotals.labor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subs:</span>
                      <span className="font-medium">${categorySubtotals.subs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Materials:</span>
                      <span className="font-medium">${categorySubtotals.materials.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowance:</span>
                      <span className="font-medium">${categorySubtotals.allowance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other:</span>
                      <span className="font-medium">${categorySubtotals.other.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Subtotal:</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Tax:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 h-8"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Estimate</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {estimates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No estimates yet. Create your first estimate to get started.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {estimate.title}
                      {estimate.is_budget_source && (
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500/20">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                          Budget Source
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(estimate.status)} variant="outline">
                      {estimate.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(estimate.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${Number(estimate.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {estimate.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncToBudget(estimate.id)}
                        >
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Sync to Budget
                        </Button>
                      )}
                      {estimate.status !== 'accepted' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateEstimateStatus(estimate.id, 'accepted')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};