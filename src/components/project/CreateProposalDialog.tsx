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

export function CreateProposalDialog({ open, onOpenChange, projectId, onSuccess }: CreateProposalDialogProps) {
  const [title, setTitle] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [presentationMode, setPresentationMode] = useState<'flat' | 'by_area' | 'by_phase' | 'by_trade'>('flat');
  const [loading, setLoading] = useState(false);

  // Fetch estimates for this project
  const { data: estimates } = useQuery({
    queryKey: ['estimates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, title, status, is_budget_source, total_amount')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
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
      // Get estimate details and items
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*, estimate_items(*)')
        .eq('id', estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          project_id: projectId,
          primary_estimate_id: estimateId,
          title,
          status: 'draft',
          presentation_mode: presentationMode,
          subtotal_amount: estimate.subtotal_amount,
          tax_amount: estimate.tax_amount,
          total_amount: estimate.total_amount,
          proposal_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Create sections based on presentation mode
      if (presentationMode === 'flat') {
        // Single section for all items
        const { data: section, error: sectionError } = await supabase
          .from('proposal_sections')
          .insert({
            proposal_id: proposal.id,
            title: 'Full Scope',
            sort_order: 0,
            group_type: 'custom',
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Add all estimate items to this section
        const sectionItems = estimate.estimate_items.map((item: any, index: number) => ({
          proposal_section_id: section.id,
          estimate_item_id: item.id,
          sort_order: index,
          show_line_item: true,
        }));

        const { error: itemsError } = await supabase
          .from('proposal_section_items')
          .insert(sectionItems);

        if (itemsError) throw itemsError;

      } else if (presentationMode === 'by_area') {
        // Group by area_name
        const areas = [...new Set(estimate.estimate_items.map((item: any) => item.area_name || 'General'))];
        
        for (let i = 0; i < areas.length; i++) {
          const area = areas[i];
          const { data: section, error: sectionError } = await supabase
            .from('proposal_sections')
            .insert({
              proposal_id: proposal.id,
              title: area,
              sort_order: i,
              group_type: 'area',
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          const areaItems = estimate.estimate_items
            .filter((item: any) => (item.area_name || 'General') === area)
            .map((item: any, index: number) => ({
              proposal_section_id: section.id,
              estimate_item_id: item.id,
              sort_order: index,
              show_line_item: true,
            }));

          const { error: itemsError } = await supabase
            .from('proposal_section_items')
            .insert(areaItems);

          if (itemsError) throw itemsError;
        }

      } else if (presentationMode === 'by_phase') {
        // Group by scope_group
        const phases = [...new Set(estimate.estimate_items.map((item: any) => item.scope_group || 'General'))];
        
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          const { data: section, error: sectionError } = await supabase
            .from('proposal_sections')
            .insert({
              proposal_id: proposal.id,
              title: phase,
              sort_order: i,
              group_type: 'phase',
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          const phaseItems = estimate.estimate_items
            .filter((item: any) => (item.scope_group || 'General') === phase)
            .map((item: any, index: number) => ({
              proposal_section_id: section.id,
              estimate_item_id: item.id,
              sort_order: index,
              show_line_item: true,
            }));

          const { error: itemsError } = await supabase
            .from('proposal_section_items')
            .insert(phaseItems);

          if (itemsError) throw itemsError;
        }

      } else if (presentationMode === 'by_trade') {
        // Group by category (treating as trade-level grouping)
        const categories = [...new Set(estimate.estimate_items.map((item: any) => item.category || 'Other'))];
        
        for (let i = 0; i < categories.length; i++) {
          const category = categories[i];
          const { data: section, error: sectionError } = await supabase
            .from('proposal_sections')
            .insert({
              proposal_id: proposal.id,
              title: category,
              sort_order: i,
              group_type: 'trade',
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          const categoryItems = estimate.estimate_items
            .filter((item: any) => (item.category || 'Other') === category)
            .map((item: any, index: number) => ({
              proposal_section_id: section.id,
              estimate_item_id: item.id,
              sort_order: index,
              show_line_item: true,
            }));

          const { error: itemsError } = await supabase
            .from('proposal_section_items')
            .insert(categoryItems);

          if (itemsError) throw itemsError;
        }
      }

      toast.success('Proposal created successfully');
      setTitle('');
      setEstimateId('');
      setPresentationMode('flat');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Kitchen Renovation Proposal"
            />
          </div>

          <div>
            <Label htmlFor="estimate">Source Estimate *</Label>
            <Select value={estimateId} onValueChange={setEstimateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an estimate..." />
              </SelectTrigger>
              <SelectContent>
                {estimates?.map((estimate) => (
                  <SelectItem key={estimate.id} value={estimate.id}>
                    {estimate.title} 
                    {estimate.is_budget_source && ' ⭐ Budget Baseline'}
                    {' - $'}{(estimate.total_amount || 0).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="presentationMode">Presentation Mode</Label>
            <Select value={presentationMode} onValueChange={(value: any) => setPresentationMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat List (Single Section)</SelectItem>
                <SelectItem value="by_area">Group by Area/Room</SelectItem>
                <SelectItem value="by_phase">Group by Phase/Scope</SelectItem>
                <SelectItem value="by_trade">Group by Trade/Category</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              How line items will be organized for the client
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Proposal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}