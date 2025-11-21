import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: (proposalId: string) => void;
}

type GroupingMethod = 'area' | 'trade' | 'blank';

export function CreateProposalDialog({ open, onOpenChange, projectId, onSuccess }: CreateProposalDialogProps) {
  const [title, setTitle] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [groupingMethod, setGroupingMethod] = useState<GroupingMethod>('area');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a proposal title');
      return;
    }

    setLoading(true);

    try {
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          project_id: projectId,
          title,
          version_label: versionLabel || null,
          status: 'draft',
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Fetch estimate items for grouping
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select(`
          *,
          cost_codes(code, name, trade_id),
          trades(name)
        `)
        .eq('estimate_id', (
          await supabase
            .from('estimates')
            .select('id')
            .eq('project_id', projectId)
            .eq('is_budget_source', true)
            .single()
        ).data?.id || '');

      if (itemsError && itemsError.code !== 'PGRST116') throw itemsError;

      if (groupingMethod !== 'blank' && estimateItems && estimateItems.length > 0) {
        // Group items based on method
        const groups = new Map<string, any[]>();

        estimateItems.forEach(item => {
          let groupKey = 'Ungrouped';
          
          if (groupingMethod === 'area') {
            groupKey = item.area_name || 'Ungrouped';
          } else if (groupingMethod === 'trade') {
            groupKey = item.trades?.name || 'General';
          }

          if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
          }
          groups.get(groupKey)!.push(item);
        });

        // Create sections for each group
        let sortOrder = 0;
        for (const [groupName, groupItems] of groups.entries()) {
          const { data: section, error: sectionError } = await supabase
            .from('proposal_sections')
            .insert({
              proposal_id: proposal.id,
              title: groupName,
              sort_order: sortOrder++,
              is_lump_sum: false,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Add items to section
          const sectionItemsToInsert = groupItems.map((item, idx) => ({
            proposal_section_id: section.id,
            estimate_item_id: item.id,
            sort_order: idx,
            show_line_item: true,
          }));

          const { error: itemsInsertError } = await supabase
            .from('proposal_section_items')
            .insert(sectionItemsToInsert);

          if (itemsInsertError) throw itemsInsertError;
        }
      }

      toast.success('Proposal created successfully');
      setTitle('');
      setVersionLabel('');
      onSuccess(proposal.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              placeholder="e.g., Kitchen & Bath Remodel - Rev A"
            />
          </div>

          <div>
            <Label htmlFor="version">Version Label (optional)</Label>
            <Input 
              id="version"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g., v1, Rev A"
            />
          </div>

          <div className="space-y-3">
            <Label>Initial Organization</Label>
            <RadioGroup value={groupingMethod} onValueChange={(v) => setGroupingMethod(v as GroupingMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="area" id="area" />
                <Label htmlFor="area" className="font-normal cursor-pointer">
                  By Area (Kitchen, Bath, etc.)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trade" id="trade" />
                <Label htmlFor="trade" className="font-normal cursor-pointer">
                  By Trade (Electrical, Plumbing, etc.)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blank" id="blank" />
                <Label htmlFor="blank" className="font-normal cursor-pointer">
                  Blank (I'll organize manually)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              You can reorganize sections and items after creation
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
