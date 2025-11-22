import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddSubToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddSubToProjectDialog({ open, onOpenChange, projectId }: AddSubToProjectDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    sub_id: '',
    contract_value: '',
    retention_percentage: '10',
    payment_terms: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  // Fetch subs
  const { data: subs } = useQuery({
    queryKey: ['subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select('*, trades(name)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from('sub_contracts')
        .insert({
          project_id: projectId,
          sub_id: data.sub_id,
          contract_value: parseFloat(data.contract_value) || 0,
          retention_percentage: parseFloat(data.retention_percentage) || 0,
          payment_terms: data.payment_terms || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          description: data.description || null,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Subcontractor added to project');
      queryClient.invalidateQueries({ queryKey: ['sub-contracts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sub-contract-summary', projectId] });
      onOpenChange(false);
      setFormData({
        sub_id: '',
        contract_value: '',
        retention_percentage: '10',
        payment_terms: '',
        start_date: '',
        end_date: '',
        description: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to add subcontractor: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sub_id || !formData.contract_value) {
      toast.error('Subcontractor and contract value are required');
      return;
    }
    createContractMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subcontractor to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sub_id">Subcontractor *</Label>
            <Select
              value={formData.sub_id}
              onValueChange={(value) => setFormData({ ...formData, sub_id: value })}
            >
              <SelectTrigger id="sub_id">
                <SelectValue placeholder="Select subcontractor..." />
              </SelectTrigger>
              <SelectContent>
                {subs?.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name} {sub.company_name ? `(${sub.company_name})` : ''} - {sub.trades?.name || sub.trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contract_value">Contract Value *</Label>
            <Input
              id="contract_value"
              type="number"
              step="0.01"
              value={formData.contract_value}
              onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
              placeholder="25000.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="retention_percentage">Retention % (default 10%)</Label>
            <Input
              id="retention_percentage"
              type="number"
              step="0.1"
              value={formData.retention_percentage}
              onChange={(e) => setFormData({ ...formData, retention_percentage: e.target.value })}
              placeholder="10"
            />
          </div>

          <div>
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="Net 30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Scope of work..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createContractMutation.isPending}>
              {createContractMutation.isPending ? 'Adding...' : 'Add to Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
