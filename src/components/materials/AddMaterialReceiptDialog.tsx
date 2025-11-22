import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AddMaterialReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function AddMaterialReceiptDialog({ isOpen, onClose, projectId }: AddMaterialReceiptDialogProps) {
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    subtotal: '',
    tax: '',
    cost_code_id: '',
    notes: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      return data || [];
    },
  });

  const { data: costCodes } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('is_active', true)
        .order('code');
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_id || !formData.vendor || !formData.subtotal) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const subtotal = parseFloat(formData.subtotal);
    const tax = formData.tax ? parseFloat(formData.tax) : 0;
    const total = subtotal + tax;

    const { error } = await supabase
      .from('material_receipts')
      .insert([{
        project_id: formData.project_id,
        vendor: formData.vendor,
        date: formData.date,
        subtotal,
        tax,
        total,
        cost_code_id: formData.cost_code_id || null,
        notes: formData.notes || null,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add material receipt',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Material receipt added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['material-receipts'] });
      onClose();
      setFormData({
        project_id: projectId || '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        subtotal: '',
        tax: '',
        cost_code_id: '',
        notes: '',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Material Receipt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor *</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g., Home Depot, Lowe's"
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subtotal">Subtotal *</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cost_code">Cost Code</Label>
            <Select
              value={formData.cost_code_id}
              onValueChange={(value) => setFormData({ ...formData, cost_code_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cost code" />
              </SelectTrigger>
              <SelectContent>
                {costCodes?.filter(cc => cc.category === 'materials').map((code) => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.code} - {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Receipt</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
