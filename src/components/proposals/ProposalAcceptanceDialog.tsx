import { useState, useEffect } from 'react';
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
import { z } from 'zod';

// Input validation schema
const acceptanceSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .trim()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
  signature: z.string()
    .trim()
    .max(100, 'Signature must be less than 100 characters')
    .optional(),
});

interface ProposalAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  publicToken: string;
  type: 'accept' | 'changes' | 'reject';
  onSuccess: () => void;
}

export function ProposalAcceptanceDialog({
  open,
  onOpenChange,
  proposalId,
  publicToken,
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({ name: '', email: '', notes: '', signature: '' });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = acceptanceSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const validData = validation.data;

    try {
      setLoading(true);
      
      const ip = await getClientIP().catch(() => 'unknown');
      
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

      // Public acceptance MUST be token-validated (no raw proposal_id writes)
      const { data: result, error: rpcError } = await (supabase as any).rpc('update_proposal_acceptance_public', {
        p_public_token: publicToken,
        p_new_status: acceptanceStatus,
        p_accepted_by_name: validData.name,
        p_accepted_by_email: validData.email || null,
        p_acceptance_notes: validData.notes || null,
        p_client_signature: validData.signature || null,
        p_acceptance_ip: ip,
      });

      if (rpcError) throw rpcError;

      // Check if update was successful
      const response = result as any;
      if (!response.success) {
        toast.error(response.error || 'Failed to submit response');
        return;
      }

      // Log event using backend function (with deduplication)
      await supabase.rpc('log_proposal_event', {
        p_proposal_id: proposalId,
        p_event_type: eventType,
        p_actor_name: validData.name,
        p_actor_email: validData.email || null,
        p_actor_ip: ip,
        p_metadata: {
          notes: validData.notes,
          signature: validData.signature,
          previous_status: response.previous_status,
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
      toast.error('Failed to submit response. Please try again.');
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
