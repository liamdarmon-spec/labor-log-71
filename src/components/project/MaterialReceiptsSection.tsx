import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useCostCodes } from '@/hooks/useCostCodes';

interface MaterialReceiptsSectionProps {
  projectId: string;
}

export function MaterialReceiptsSection({ projectId }: MaterialReceiptsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    subtotal: '',
    tax: '',
    total: '',
    cost_code_id: '',
    notes: '',
  });

  const { data: costCodes } = useCostCodes('materials');

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['material-receipts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_receipts')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('material_receipts')
        .insert([{
          project_id: projectId,
          ...data,
          subtotal: Number(data.subtotal),
          tax: Number(data.tax),
          total: Number(data.total),
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-receipts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger', projectId] });
      toast({ title: 'Receipt added successfully' });
      setIsDialogOpen(false);
      setFormData({
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        subtotal: '',
        tax: '',
        total: '',
        cost_code_id: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast({ title: 'Error adding receipt', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const totalSpend = receipts?.reduce((sum, r) => sum + Number(r.total), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Material Receipts</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total Spend: ${totalSpend.toLocaleString()}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Material Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Vendor *</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Vendor name"
                    required
                  />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cost Code</Label>
                  <Select
                    value={formData.cost_code_id}
                    onValueChange={(value) => setFormData({ ...formData, cost_code_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost code" />
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Subtotal *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => {
                        const subtotal = Number(e.target.value);
                        const tax = Number(formData.tax);
                        setFormData({ 
                          ...formData, 
                          subtotal: e.target.value,
                          total: (subtotal + tax).toString()
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label>Tax</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tax}
                      onChange={(e) => {
                        const subtotal = Number(formData.subtotal);
                        const tax = Number(e.target.value);
                        setFormData({ 
                          ...formData, 
                          tax: e.target.value,
                          total: (subtotal + tax).toString()
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Total *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Receipt</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading receipts...</div>
        ) : receipts && receipts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Cost Code</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt: any) => (
                <TableRow key={receipt.id}>
                  <TableCell>{format(new Date(receipt.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{receipt.vendor}</TableCell>
                  <TableCell>
                    {receipt.cost_codes ? (
                      <Badge variant="outline">{receipt.cost_codes.code}</Badge>
                    ) : (
                      <Badge variant="secondary">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>${Number(receipt.subtotal).toFixed(2)}</TableCell>
                  <TableCell>${Number(receipt.tax).toFixed(2)}</TableCell>
                  <TableCell className="font-bold">${Number(receipt.total).toFixed(2)}</TableCell>
                  <TableCell>
                    {receipt.auto_classified && (
                      <Badge variant="secondary">AI</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No receipts yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first material receipt to track spending
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
