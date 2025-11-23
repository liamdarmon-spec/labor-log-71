import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getClientIP } from '@/hooks/useProposalEvents';

interface ProposalAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  type: 'accept' | 'changes' | 'reject';
  onSuccess: () => void;
}

export function ProposalAcceptanceDialog({
  open,
  onOpenChange,
  proposalId,
  type,
  onSuccess,
}: ProposalAcceptanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    signature: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      
      const ip = await getClientIP();
      const timestamp = new Date().toISOString();
      
      let acceptanceStatus = 'pending';
      let eventType: 'accepted' | 'changes_requested' | 'rejected' = 'accepted';
      
      if (type === 'accept') {
        acceptanceStatus = 'accepted';
        eventType = 'accepted';
      } else if (type === 'changes') {
        acceptanceStatus = 'changes_requested';
        eventType = 'changes_requested';
      } else if (type === 'reject') {
        acceptanceStatus = 'rejected';
        eventType = 'rejected';
      }

      // Update proposal
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          acceptance_status: acceptanceStatus,
          acceptance_date: timestamp,
          accepted_by_name: formData.name,
          accepted_by_email: formData.email || null,
          acceptance_notes: formData.notes || null,
          client_signature: formData.signature || null,
          acceptance_ip: ip,
        })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // Log event
      await supabase.from('proposal_events').insert({
        proposal_id: proposalId,
        event_type: eventType,
        actor_name: formData.name,
        actor_email: formData.email || null,
        actor_ip: ip,
        metadata: {
          notes: formData.notes,
          signature: formData.signature,
        },
      });

      toast.success(
        type === 'accept'
          ? 'Proposal accepted successfully!'
          : type === 'changes'
          ? 'Change request submitted'
          : 'Proposal declined'
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'accept': return 'Accept Proposal';
      case 'changes': return 'Request Changes';
      case 'reject': return 'Decline Proposal';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'accept': return 'Please confirm your acceptance of this proposal';
      case 'changes': return 'Please describe the changes you would like';
      case 'reject': return 'Please provide a reason for declining (optional)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Your Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {type === 'accept' ? 'Additional Notes (optional)' : 'Message'}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={
                type === 'accept'
                  ? 'Any additional comments...'
                  : type === 'changes'
                  ? 'Please describe the changes you would like...'
                  : 'Reason for declining...'
              }
              rows={4}
            />
          </div>

          {type === 'accept' && (
            <div className="space-y-2">
              <Label htmlFor="signature">Signature (type your name)</Label>
              <Input
                id="signature"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                placeholder="Type your full name"
                className="font-serif text-lg"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
