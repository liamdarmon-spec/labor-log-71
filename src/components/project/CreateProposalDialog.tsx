import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: (proposalId: string) => void;
}

// Settings presets based on presentation mode
const PRESENTATION_PRESETS = {
  summary: {
    show_line_items: false,
    show_line_item_totals: false,
    group_line_items_by_area: true,
    show_scope_summary: true,
  },
  detailed: {
    show_line_items: true,
    show_line_item_totals: true,
    group_line_items_by_area: true,
    show_scope_summary: true,
  },
  flat: {
    show_line_items: true,
    show_line_item_totals: true,
    group_line_items_by_area: false,
    show_scope_summary: true,
  },
};

type PresentationMode = 'summary' | 'detailed' | 'flat';

export function CreateProposalDialog({ open, onOpenChange, projectId, onSuccess }: CreateProposalDialogProps) {
  const [title, setTitle] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [presentationMode, setPresentationMode] = useState<PresentationMode>('detailed');
  const [loading, setLoading] = useState(false);

  // Fetch estimates for this project
  const { data: estimates } = useQuery({
    queryKey: ['estimates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, title, status, is_budget_source, total_amount, subtotal_amount, tax_amount')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch project info for default title
  const { data: project } = useQuery({
    queryKey: ['project-basic', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name, client_name')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Auto-select baseline estimate if available
  useEffect(() => {
    if (estimates && estimates.length > 0 && !estimateId) {
      const baseline = estimates.find(e => e.is_budget_source);
      if (baseline) {
        setEstimateId(baseline.id);
      } else {
        setEstimateId(estimates[0].id);
      }
    }
  }, [estimates, estimateId]);

  // Auto-generate title when estimate or project changes
  useEffect(() => {
    if (project && !title) {
      const date = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setTitle(`${project.project_name} – Proposal ${date}`);
    }
  }, [project, title]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a proposal title');
      return;
    }

    if (!estimateId) {
      toast.error('Please select an estimate');
      return;
    }

    setLoading(true);

    try {
      // Get estimate details (no items needed - we read from scope_blocks)
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('subtotal_amount, tax_amount, total_amount')
        .eq('id', estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Build settings from presentation mode preset
      const settingsPreset = PRESENTATION_PRESETS[presentationMode];
      const settings = {
        show_project_info: true,
        show_client_info: true,
        show_address: true,
        show_allowances: true,
        show_exclusions: true,
        show_payment_schedule: false,
        show_terms: true,
        show_signature_block: true,
        payment_schedule: [],
        terms_text: '',
        exclusions_text: '',
        allowances_text: '',
        ...settingsPreset,
      };

      // Create proposal - metadata only, NO proposal_sections/items
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          project_id: projectId,
          primary_estimate_id: estimateId,
          title,
          status: 'draft',
          subtotal_amount: estimate.subtotal_amount,
          tax_amount: estimate.tax_amount,
          total_amount: estimate.total_amount,
          proposal_date: new Date().toISOString().split('T')[0],
          settings,
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      toast.success('Proposal created successfully');
      setTitle('');
      setEstimateId('');
      setPresentationMode('detailed');
      onOpenChange(false);
      onSuccess(proposal.id);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Proposal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Kitchen Renovation Proposal"
            />
          </div>

          <div>
            <Label htmlFor="estimate">Source Estimate</Label>
            <Select value={estimateId} onValueChange={setEstimateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an estimate..." />
              </SelectTrigger>
              <SelectContent>
                {estimates?.map((estimate) => (
                  <SelectItem key={estimate.id} value={estimate.id}>
                    {estimate.title} 
                    {estimate.is_budget_source && ' ⭐ Baseline'}
                    {' – $'}{(estimate.total_amount || 0).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              All scope and pricing comes from this estimate
            </p>
          </div>

          <div>
            <Label htmlFor="presentationMode">Presentation Style</Label>
            <Select 
              value={presentationMode} 
              onValueChange={(v) => setPresentationMode(v as PresentationMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">
                  Simple Summary (areas with totals only)
                </SelectItem>
                <SelectItem value="detailed">
                  Detailed (areas with line items)
                </SelectItem>
                <SelectItem value="flat">
                  Flat List (no area grouping)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              You can adjust visibility settings in the builder
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !estimateId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
