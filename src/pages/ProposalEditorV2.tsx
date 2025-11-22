import { Layout } from '@/components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useProposal } from '@/hooks/useProposals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Eye, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ProposalPreview } from '@/components/project/ProposalPreview';

export default function ProposalEditorV2() {
  const { projectId, proposalId } = useParams();
  const navigate = useNavigate();
  const { data: proposal, isLoading } = useProposal(proposalId!);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!proposal) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Proposal not found</h3>
            <Button onClick={() => navigate(`/projects/${projectId}`)}>
              Return to Project
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

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

  const validUntil = new Date(proposal.proposal_date);
  validUntil.setDate(validUntil.getDate() + proposal.validity_days);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Button>
            <h1 className="text-3xl font-bold">{proposal.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Proposal Date: {format(new Date(proposal.proposal_date), 'MMM d, yyyy')}
              </span>
              <span>•</span>
              <span>Valid Until: {format(validUntil, 'MMM d, yyyy')}</span>
              <span>•</span>
              <Badge variant={getStatusColor(proposal.status)}>{proposal.status}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {proposal.client_name || proposal.projects?.client_name || 'Not specified'}
              </div>
              {proposal.client_email && (
                <p className="text-sm text-muted-foreground mt-1">
                  {proposal.client_email}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${proposal.total_amount?.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Subtotal: ${proposal.subtotal_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Source Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {proposal.estimates?.title || 'Unknown'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ${proposal.estimates?.total_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Client Preview
            </TabsTrigger>
            <TabsTrigger value="edit">
              <FileText className="w-4 h-4 mr-2" />
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-6">
            <ProposalPreview proposalId={proposalId!} onBack={() => navigate(`/projects/${projectId}`)} />
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Proposal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Full proposal editing with sections, line item overrides, and custom
                  presentation coming in Phase 1.1
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
