import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, FileText, Eye, Edit2, Copy, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { CreateProposalDialog } from './CreateProposalDialog';
import { ProposalDesigner } from './ProposalDesigner';
import { ProposalPreview } from './ProposalPreview';

interface Proposal {
  id: string;
  title: string;
  status: string;
  version_label: string | null;
  created_at: string;
  total_amount: number;
}

interface ProjectProposalsProps {
  projectId: string;
}

export const ProjectProposals = ({ projectId }: ProjectProposalsProps) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'designer' | 'preview'>('list');

  useEffect(() => {
    fetchProposals();
  }, [projectId]);

  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        id,
        title,
        status,
        version_label,
        created_at
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load proposals');
      return;
    }

    // Calculate totals for each proposal
    const proposalsWithTotals = await Promise.all(
      (data || []).map(async (proposal) => {
        const { data: sections } = await supabase
          .from('proposal_sections')
          .select('id')
          .eq('proposal_id', proposal.id);

        let total = 0;
        if (sections) {
          for (const section of sections) {
            const { data: sectionItems } = await supabase
              .from('proposal_section_items')
              .select('estimate_item_id, display_quantity, display_unit_price')
              .eq('proposal_section_id', section.id);

            if (sectionItems) {
              for (const item of sectionItems) {
                // Fetch estimate item for fallback values
                const { data: estimateItem } = await supabase
                  .from('estimate_items')
                  .select('quantity, unit_price')
                  .eq('id', item.estimate_item_id)
                  .single();

                if (estimateItem) {
                  const qty = item.display_quantity ?? estimateItem.quantity;
                  const price = item.display_unit_price ?? estimateItem.unit_price;
                  total += qty * price;
                }
              }
            }
          }
        }

        return {
          ...proposal,
          total_amount: total,
        };
      })
    );

    setProposals(proposalsWithTotals);
  };

  const handleDuplicate = async (proposalId: string) => {
    // Implementation for duplicating proposals
    toast.info('Duplicate feature coming soon');
  };

  const handleArchive = async (proposalId: string) => {
    const { error } = await supabase
      .from('proposals')
      .update({ status: 'archived' })
      .eq('id', proposalId);

    if (error) {
      toast.error('Failed to archive proposal');
      return;
    }

    toast.success('Proposal archived');
    fetchProposals();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'archived': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  if (viewMode === 'designer' && selectedProposalId) {
    return (
      <ProposalDesigner 
        proposalId={selectedProposalId}
        onBack={() => {
          setViewMode('list');
          setSelectedProposalId(null);
          fetchProposals();
        }}
      />
    );
  }

  if (viewMode === 'preview' && selectedProposalId) {
    return (
      <ProposalPreview 
        proposalId={selectedProposalId}
        onBack={() => {
          setViewMode('list');
          setSelectedProposalId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Client Proposals</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Format estimates for client presentation
                </p>
              </div>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No proposals yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  proposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{proposal.title}</TableCell>
                      <TableCell>
                        {proposal.version_label ? (
                          <Badge variant="outline">{proposal.version_label}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${proposal.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProposalId(proposal.id);
                              setViewMode('preview');
                            }}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProposalId(proposal.id);
                              setViewMode('designer');
                            }}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(proposal.id)}
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {proposal.status !== 'archived' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(proposal.id)}
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateProposalDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        onSuccess={(proposalId) => {
          fetchProposals();
          setSelectedProposalId(proposalId);
          setViewMode('designer');
        }}
      />
    </div>
  );
};
