import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { ProposalAcceptanceDialog } from '@/components/proposals/ProposalAcceptanceDialog';
import { getClientIP } from '@/hooks/useProposalEvents';
import { format } from 'date-fns';

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<'accept' | 'changes' | 'reject' | null>(null);

  useEffect(() => {
    loadProposal();
  }, [token]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch proposal by public token
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (project_name, client_name, address)
        `)
        .eq('public_token', token)
        .single();

      if (proposalError) throw proposalError;

      if (!proposalData) {
        setError('Proposal not found or link has expired');
        return;
      }

      // Check if token is expired
      if (proposalData.token_expires_at && new Date(proposalData.token_expires_at) < new Date()) {
        setError('This proposal link has expired');
        return;
      }

      setProposal(proposalData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('proposal_sections')
        .select('*')
        .eq('proposal_id', proposalData.id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Log "viewed" event
      const ip = await getClientIP();
      await supabase.from('proposal_events').insert({
        proposal_id: proposalData.id,
        event_type: 'viewed',
        actor_ip: ip,
      });

    } catch (err: any) {
      console.error('Error loading proposal:', err);
      setError('Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'changes_requested': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Unable to Load Proposal</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  const isActionable = proposal.acceptance_status === 'pending';
  const hasResponded = proposal.acceptance_status !== 'pending';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{proposal.title}</h1>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Project: {proposal.projects?.project_name || 'N/A'}</p>
                <p>Client: {proposal.client_name || proposal.projects?.client_name || 'N/A'}</p>
                <p>Date: {format(new Date(proposal.proposal_date || proposal.created_at), 'MMMM d, yyyy')}</p>
                {proposal.validity_days && (
                  <p>Valid for: {proposal.validity_days} days</p>
                )}
              </div>
            </div>
            <Badge variant={getStatusColor(proposal.acceptance_status)} className="text-sm px-3 py-1">
              {proposal.acceptance_status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Response Status */}
        {hasResponded && (
          <Card className="p-6 mb-6 bg-muted/50">
            <div className="flex items-start gap-3">
              {proposal.acceptance_status === 'accepted' && (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              )}
              {proposal.acceptance_status === 'rejected' && (
                <XCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              )}
              {proposal.acceptance_status === 'changes_requested' && (
                <MessageSquare className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  {proposal.acceptance_status === 'accepted' && 'Proposal Accepted'}
                  {proposal.acceptance_status === 'rejected' && 'Proposal Declined'}
                  {proposal.acceptance_status === 'changes_requested' && 'Changes Requested'}
                </h3>
                {proposal.accepted_by_name && (
                  <p className="text-sm text-muted-foreground">
                    By: {proposal.accepted_by_name}
                    {proposal.accepted_by_email && ` (${proposal.accepted_by_email})`}
                  </p>
                )}
                {proposal.acceptance_date && (
                  <p className="text-sm text-muted-foreground">
                    On: {format(new Date(proposal.acceptance_date), 'MMMM d, yyyy h:mm a')}
                  </p>
                )}
                {proposal.acceptance_notes && (
                  <p className="text-sm mt-2">{proposal.acceptance_notes}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Sections */}
        <Card className="p-6 md:p-12 mb-6">
          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.id} className="prose prose-sm max-w-none">
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {section.content_richtext || 'No content'}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-12 pt-8 border-t">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold">
                  ${proposal.total_amount?.toLocaleString() || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {isActionable && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setDialogType('accept')}
              className="flex-1"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Accept Proposal
            </Button>
            <Button
              onClick={() => setDialogType('changes')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Request Changes
            </Button>
            <Button
              onClick={() => setDialogType('reject')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Decline
            </Button>
          </div>
        )}
      </div>

      {/* Acceptance Dialog */}
      {dialogType && (
        <ProposalAcceptanceDialog
          open={!!dialogType}
          onOpenChange={(open) => !open && setDialogType(null)}
          proposalId={proposal.id}
          type={dialogType}
          onSuccess={loadProposal}
        />
      )}
    </div>
  );
}
