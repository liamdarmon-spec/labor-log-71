import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Copy, Archive, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CreateProposalDialog } from './CreateProposalDialog';
import { useNavigate } from 'react-router-dom';

interface Proposal {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  version_label: string | null;
  notes_internal: string | null;
  project_id: string;
}

interface ProjectProposalsTabProps {
  projectId: string;
}

export function ProjectProposalsTab({ projectId }: ProjectProposalsTabProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
  }, [projectId]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load proposals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (proposal: Proposal) => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          project_id: projectId,
          title: `${proposal.title} (Copy)`,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Copy sections and items
      const { data: sections } = await supabase
        .from('proposal_sections')
        .select('*, proposal_section_items(*)')
        .eq('proposal_id', proposal.id);

      if (sections) {
        for (const section of sections) {
          const { data: newSection, error: sectionError } = await supabase
            .from('proposal_sections')
            .insert({
              proposal_id: data.id,
              title: section.title,
              sort_order: section.sort_order,
              is_lump_sum: section.is_lump_sum,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          if (section.proposal_section_items && newSection) {
            const items = section.proposal_section_items.map((item: any) => ({
              proposal_section_id: newSection.id,
              estimate_item_id: item.estimate_item_id,
              display_description: item.display_description,
              display_quantity: item.display_quantity,
              display_unit: item.display_unit,
              display_unit_price: item.display_unit_price,
              show_line_item: item.show_line_item,
              sort_order: item.sort_order,
            }));

            await supabase.from('proposal_section_items').insert(items);
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Proposal duplicated successfully',
      });
      fetchProposals();
    } catch (error) {
      console.error('Error duplicating proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate proposal',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'archived' })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Proposal archived',
      });
      fetchProposals();
    } catch (error) {
      console.error('Error archiving proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive proposal',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'sent':
        return 'bg-blue-500/10 text-blue-500';
      case 'accepted':
        return 'bg-green-500/10 text-green-500';
      case 'archived':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'estimate':
        return 'bg-purple-500/10 text-purple-500';
      case 'budget':
        return 'bg-blue-500/10 text-blue-500';
      case 'custom':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div>Loading proposals...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Proposals</CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Proposal
          </Button>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No proposals yet</p>
              <p className="text-sm mb-4">Create your first client-facing proposal</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Proposal
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/projects/${projectId}/proposals/${proposal.id}`)}
                  >
                    <TableCell className="font-medium">{proposal.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {proposal.version_label || 'v1'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      -
                    </TableCell>
                    <TableCell>{new Date(proposal.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(proposal.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/projects/${projectId}/proposals/${proposal.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(proposal)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {proposal.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(proposal.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateProposalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={(proposalId) => {
          fetchProposals();
          setCreateDialogOpen(false);
          navigate(`/app/projects/${projectId}/proposals/${proposalId}`);
        }}
      />
    </div>
  );
}
