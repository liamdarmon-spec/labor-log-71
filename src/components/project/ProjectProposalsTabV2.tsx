import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Plus, MoreVertical, Eye, Send, CheckCircle, XCircle, Copy } from 'lucide-react';
import { useProposals, useUpdateProposalStatus } from '@/hooks/useProposals';
import { CreateProposalDialog } from './CreateProposalDialog';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ProjectProposalsTabV2Props {
  projectId: string;
}

export function ProjectProposalsTabV2({ projectId }: ProjectProposalsTabV2Props) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: proposals, isLoading } = useProposals(projectId);
  const updateStatus = useUpdateProposalStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'viewed':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleStatusChange = (proposalId: string, newStatus: any) => {
    updateStatus.mutate({ id: proposalId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Proposals</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage client proposals
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Proposal
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading proposals...
          </CardContent>
        </Card>
      ) : !proposals || proposals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first proposal from an accepted estimate
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Proposal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal: any) => {
                  const validUntil = new Date(proposal.proposal_date);
                  validUntil.setDate(validUntil.getDate() + proposal.validity_days);

                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{proposal.title}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {proposal.client_name || proposal.projects?.client_name || '-'}
                      </TableCell>
                      <TableCell>${proposal.total_amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(proposal.proposal_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(validUntil, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(
                                  `/app/projects/${projectId}/proposals/${proposal.id}`
                                )
                              }
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View / Edit
                            </DropdownMenuItem>
                            {proposal.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(proposal.id, 'sent')}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(proposal.id, 'accepted')
                                  }
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(proposal.id, 'rejected')
                                  }
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Mark as Rejected
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => {}}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateProposalDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(id) => {
          setCreateDialogOpen(false);
          navigate(`/app/projects/${projectId}/proposals/${id}`);
        }}
      />
    </div>
  );
}
