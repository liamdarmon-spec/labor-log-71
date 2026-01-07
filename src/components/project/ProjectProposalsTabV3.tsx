import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Copy, Archive, Send } from 'lucide-react';
import { format } from 'date-fns';
import { CreateProposalDialog } from './CreateProposalDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ProjectProposalsTabV3Props {
  projectId: string;
}

export function ProjectProposalsTabV3({ projectId }: ProjectProposalsTabV3Props) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: proposals, isLoading, refetch } = useQuery({
    queryKey: ['proposals', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, estimates(title)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleStatusChange = async (proposalId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId);

      if (error) throw error;

      toast.success(`Proposal marked as ${newStatus}`);
      refetch();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Failed to update proposal status');
    }
  };

  // Duplicate proposal: clone ONLY the proposals row, NO sections/items
  const handleDuplicate = async (proposalId: string) => {
    try {
      // Fetch original proposal
      const { data: original, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate proposal - metadata only
      const { error: proposalError } = await supabase
        .from('proposals')
        .insert({
          project_id: original.project_id,
          primary_estimate_id: original.primary_estimate_id,
          title: `${original.title} (Copy)`,
          status: 'draft',
          intro_text: original.intro_text,
          settings: original.settings,
          subtotal_amount: original.subtotal_amount,
          tax_amount: original.tax_amount,
          total_amount: original.total_amount,
          validity_days: original.validity_days,
          proposal_date: new Date().toISOString().split('T')[0],
        });

      if (proposalError) throw proposalError;

      toast.success('Proposal duplicated successfully');
      refetch();
    } catch (error) {
      console.error('Error duplicating proposal:', error);
      toast.error('Failed to duplicate proposal');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground border-border',
      sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      accepted: 'bg-green-500/10 text-green-600 border-green-500/20',
      lost: 'bg-destructive/10 text-destructive border-destructive/20',
      archived: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || colors.draft;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Proposals
              </CardTitle>
              <CardDescription>
                Client-facing presentations built from estimates
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {proposals && proposals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source Estimate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal: any) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{proposal.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(proposal.status)} variant="outline">
                        {proposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {proposal.estimates?.title || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(proposal.total_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(proposal.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {proposal.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(proposal.id, 'sent')}
                            title="Mark as Sent"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/app/projects/${projectId}/proposals/${proposal.id}`)}
                          title="Edit Proposal"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(proposal.id)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {proposal.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(proposal.id, 'archived')}
                            title="Archive"
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
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No proposals yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create one from your baseline estimate
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Create First Proposal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateProposalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={(proposalId) => {
          refetch();
          navigate(`/app/projects/${projectId}/proposals/${proposalId}`);
        }}
      />
    </>
  );
}
