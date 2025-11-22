import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateBidPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function CreateBidPackageDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateBidPackageDialogProps) {
  const [title, setTitle] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [bidDueDate, setBidDueDate] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a bid package title',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('bid_packages').insert({
        project_id: projectId,
        title: title.trim(),
        scope_summary: scopeSummary.trim() || null,
        bid_due_date: bidDueDate || null,
        desired_start_date: desiredStartDate || null,
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bid package created successfully',
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating bid package:', error);
      toast({
        title: 'Error',
        description: 'Failed to create bid package',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setScopeSummary('');
    setBidDueDate('');
    setDesiredStartDate('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Bid Package</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Exterior Paint - Phase 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="scope">Scope Summary</Label>
            <Textarea
              id="scope"
              placeholder="Describe the scope of work for this bid..."
              value={scopeSummary}
              onChange={(e) => setScopeSummary(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bidDue">Bid Due Date</Label>
              <Input
                id="bidDue"
                type="date"
                value={bidDueDate}
                onChange={(e) => setBidDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Desired Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={desiredStartDate}
                onChange={(e) => setDesiredStartDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
