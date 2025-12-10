import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { useCreateWorkOrder } from '@/hooks/useWorkOrders';
import { useCompaniesSimple } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  budgetItemId: string;
  budgetItemDescription: string;
  budgetItemAmount?: number;
  defaultSubCompanyId?: string | null;
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  projectId,
  budgetItemId,
  budgetItemDescription,
  budgetItemAmount,
  defaultSubCompanyId,
}: CreateWorkOrderDialogProps) {
  const createWorkOrder = useCreateWorkOrder();
  const { data: companies } = useCompaniesSimple();

  const [formData, setFormData] = useState({
    title: budgetItemDescription,
    scope_summary: '',
    sub_company_id: defaultSubCompanyId || '',
    original_amount: budgetItemAmount?.toString() || '',
    approved_amount: '',
    due_date: null as Date | null,
    scheduled_start: null as Date | null,
    scheduled_end: null as Date | null,
    notes: '',
  });

  // Reset form when dialog opens/closes or props change
  useEffect(() => {
    if (open) {
      setFormData({
        title: budgetItemDescription,
        scope_summary: '',
        sub_company_id: defaultSubCompanyId || '',
        original_amount: budgetItemAmount?.toString() || '',
        approved_amount: '',
        due_date: null,
        scheduled_start: null,
        scheduled_end: null,
        notes: '',
      });
    }
  }, [open, budgetItemDescription, budgetItemAmount, defaultSubCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate amounts
    const originalAmount = formData.original_amount 
      ? (() => {
          const parsed = parseFloat(formData.original_amount);
          if (isNaN(parsed) || parsed < 0) {
            toast.error('Original amount must be a valid positive number');
            return null;
          }
          return parsed;
        })()
      : undefined;

    if (originalAmount === null) return;

    const approvedAmount = formData.approved_amount
      ? (() => {
          const parsed = parseFloat(formData.approved_amount);
          if (isNaN(parsed) || parsed < 0) {
            toast.error('Approved amount must be a valid positive number');
            return null;
          }
          return parsed;
        })()
      : undefined;

    if (approvedAmount === null) return;

    // Validate date ranges
    if (formData.scheduled_start && formData.scheduled_end) {
      if (formData.scheduled_start > formData.scheduled_end) {
        toast.error('Scheduled end date must be after start date');
        return;
      }
    }

    try {
      await createWorkOrder.mutateAsync({
        project_id: projectId,
        budget_item_id: budgetItemId,
        sub_company_id: formData.sub_company_id || undefined,
        title: formData.title.trim(),
        scope_summary: formData.scope_summary.trim() || undefined,
        original_amount: originalAmount,
        approved_amount: approvedAmount,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : undefined,
        scheduled_start: formData.scheduled_start ? format(formData.scheduled_start, 'yyyy-MM-dd') : undefined,
        scheduled_end: formData.scheduled_end ? format(formData.scheduled_end, 'yyyy-MM-dd') : undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success('Work order created successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating work order:', error);
      const errorMessage = error?.message || 'Failed to create work order';
      toast.error(errorMessage);
      
      // Log to help debug RLS/permission issues
      if (error?.code === '42501' || error?.message?.includes('permission')) {
        console.error('Possible RLS/permission issue. Check work_orders table policies.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Work order title"
              required
            />
          </div>

          <div>
            <Label htmlFor="scope_summary">Scope Summary</Label>
            <Textarea
              id="scope_summary"
              value={formData.scope_summary}
              onChange={(e) => setFormData({ ...formData, scope_summary: e.target.value })}
              placeholder="Describe the scope of work..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="sub_company_id">Subcontractor</Label>
            <Select
              value={formData.sub_company_id ?? undefined}
              onValueChange={(value) => setFormData({ ...formData, sub_company_id: value === "__none__" ? null : value })}
            >
              <SelectTrigger id="sub_company_id">
                <SelectValue placeholder="Select subcontractor (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="original_amount">Original Amount</Label>
              <Input
                id="original_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="approved_amount">Approved Amount</Label>
              <Input
                id="approved_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.approved_amount}
                onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <DatePickerWithPresets
              date={formData.due_date}
              onDateChange={(date) => setFormData({ ...formData, due_date: date })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_start">Scheduled Start</Label>
              <DatePickerWithPresets
                date={formData.scheduled_start}
                onDateChange={(date) => setFormData({ ...formData, scheduled_start: date })}
              />
            </div>

            <div>
              <Label htmlFor="scheduled_end">Scheduled End</Label>
              <DatePickerWithPresets
                date={formData.scheduled_end}
                onDateChange={(date) => setFormData({ ...formData, scheduled_end: date })}
              />
            </div>
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
            <Button type="submit" disabled={createWorkOrder.isPending}>
              {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
