import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddSubcontractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubcontractorDialog({ open, onOpenChange }: AddSubcontractorDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    trade_id: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Fetch trades
  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createSubMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from('subs')
        .insert({
          name: data.name,
          company_name: data.company_name,
          trade_id: data.trade_id || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Subcontractor added successfully');
      queryClient.invalidateQueries({ queryKey: ['subs'] });
      onOpenChange(false);
      setFormData({
        name: '',
        company_name: '',
        trade_id: '',
        email: '',
        phone: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to add subcontractor: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    createSubMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subcontractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="ABC Contracting LLC"
            />
          </div>

          <div>
            <Label htmlFor="trade">Trade</Label>
            <Select
              value={formData.trade_id}
              onValueChange={(value) => setFormData({ ...formData, trade_id: value })}
            >
              <SelectTrigger id="trade">
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

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

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
            <Button type="submit" disabled={createSubMutation.isPending}>
              {createSubMutation.isPending ? 'Adding...' : 'Add Subcontractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
