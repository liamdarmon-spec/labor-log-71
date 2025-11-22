import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddSubInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  projectId: string;
  subId: string;
  retentionPercentage: number;
}

export function AddSubInvoiceDialog({
  open,
  onOpenChange,
  contractId,
  projectId,
  subId,
  retentionPercentage,
}: AddSubInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const amount = parseFloat(data.amount) || 0;
      const retentionAmount = (amount * retentionPercentage) / 100;
      const payableAmount = amount - retentionAmount;

      const { data: result, error } = await supabase
        .from('sub_invoices')
        .insert({
          contract_id: contractId,
          project_id: projectId,
          sub_id: subId,
          invoice_number: data.invoice_number || null,
          invoice_date: data.invoice_date,
          subtotal: amount,
          total: amount,
          retention_amount: retentionAmount,
          notes: data.notes || null,
          payment_status: 'unpaid',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Invoice added successfully');
      queryClient.invalidateQueries({ queryKey: ['sub-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sub-contract-summary'] });
      onOpenChange(false);
      setFormData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        amount: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to add invoice: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error('Amount is required');
      return;
    }
    createInvoiceMutation.mutate(formData);
  };

  const amount = parseFloat(formData.amount) || 0;
  const retentionAmount = (amount * retentionPercentage) / 100;
  const payableAmount = amount - retentionAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sub Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              placeholder="INV-001"
            />
          </div>

          <div>
            <Label htmlFor="invoice_date">Invoice Date *</Label>
            <Input
              id="invoice_date"
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="5000.00"
              required
            />
          </div>

          {amount > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Amount:</span>
                <span className="font-medium">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retention ({retentionPercentage}%):</span>
                <span className="font-medium text-amber-600">-${retentionAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-semibold">Payable Amount:</span>
                <span className="font-bold text-primary">${payableAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? 'Adding...' : 'Add Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
