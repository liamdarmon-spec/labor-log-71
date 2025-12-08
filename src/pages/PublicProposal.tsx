import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, MessageSquare, AlertCircle, MapPin, User, Calendar } from 'lucide-react';
import { ProposalAcceptanceDialog } from '@/components/proposals/ProposalAcceptanceDialog';
import { getClientIP } from '@/hooks/useProposalEvents';
import { usePublicProposalData } from '@/hooks/usePublicProposalData';
import { format } from 'date-fns';

// Category colors for scope items
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    labor: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    subs: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    materials: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    other: 'bg-muted text-muted-foreground border-border',
  };
  return colors[category?.toLowerCase()] || colors.other;
};

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [dialogType, setDialogType] = useState<'accept' | 'changes' | 'reject' | null>(null);
  const [eventLogged, setEventLogged] = useState(false);

  const { data: proposal, isLoading, error, refetch } = usePublicProposalData(token);

  // Log view event once
  useEffect(() => {
    if (proposal && !eventLogged) {
      const logView = async () => {
        try {
          const ip = await getClientIP();
          await supabase.rpc('log_proposal_event', {
            p_proposal_id: proposal.id,
            p_event_type: 'viewed',
            p_actor_ip: ip,
            p_metadata: {},
          });
          setEventLogged(true);
        } catch {
          // Silent fail for event logging
        }
      };
      logView();
    }
  }, [proposal, eventLogged]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'changes_requested': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Unable to Load Proposal</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Proposal not found or link has expired'}
          </p>
        </Card>
      </div>
    );
  }

  const { settings } = proposal;
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
                {settings.show_project_info && proposal.project && (
                  <p>Project: {proposal.project.project_name}</p>
                )}
                {settings.show_client_info && (
                  <p className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {proposal.client_name || proposal.project?.client_name || 'N/A'}
                  </p>
                )}
                {settings.show_address && proposal.project?.address && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {proposal.project.address}
                  </p>
                )}
                <p className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(proposal.proposal_date || proposal.created_at), 'MMMM d, yyyy')}
                </p>
                {proposal.validity_days && (
                  <p className="text-xs">Valid for {proposal.validity_days} days</p>
                )}
              </div>
            </div>
            <Badge className={getStatusColor(proposal.acceptance_status)} variant="outline">
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
              </div>
            </div>
          </Card>
        )}

        {/* Main Proposal Content */}
        <Card className="p-6 md:p-12 mb-6">
          <div className="space-y-12">
            {/* Introduction */}
            {proposal.intro_text && (
              <section>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {proposal.intro_text}
                </p>
              </section>
            )}

            {/* Scope & Pricing */}
            {settings.show_scope_summary && (
              <section>
                <h2 className="text-2xl font-semibold mb-6">Scope of Work & Pricing</h2>
                
                {settings.group_line_items_by_area ? (
                  // Grouped by area
                  <div className="space-y-6">
                    {proposal.scopeByArea.map((area) => (
                      <div key={area.area_label} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <h3 className="font-semibold">{area.area_label}</h3>
                          <span className="font-semibold">
                            ${area.subtotal.toLocaleString()}
                          </span>
                        </div>
                        
                        {settings.show_line_items && (
                          <div className="divide-y">
                            {area.items.map((item) => (
                              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getCategoryColor(item.category)}`}
                                    >
                                      {item.category}
                                    </Badge>
                                    <span className="text-sm">{item.description}</span>
                                  </div>
                                </div>
                                {settings.show_line_item_totals && (
                                  <span className="text-sm font-medium">
                                    ${item.line_total.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Flat list
                  <div className="border rounded-lg divide-y">
                    {proposal.allItems.map((item) => (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(item.category)}`}
                            >
                              {item.category}
                            </Badge>
                            <span className="text-sm">{item.description}</span>
                          </div>
                        </div>
                        {settings.show_line_item_totals && (
                          <span className="text-sm font-medium">
                            ${item.line_total.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Grand Total */}
            <div className="pt-6 border-t">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold">
                    ${proposal.total_amount?.toLocaleString() || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Allowances */}
            {settings.show_allowances && settings.allowances_text && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Allowances</h2>
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {settings.allowances_text}
                </p>
              </section>
            )}

            {/* Exclusions */}
            {settings.show_exclusions && settings.exclusions_text && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Exclusions</h2>
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {settings.exclusions_text}
                </p>
              </section>
            )}

            {/* Payment Schedule */}
            {settings.show_payment_schedule && settings.payment_schedule?.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Payment Schedule</h2>
                <div className="border rounded-lg divide-y">
                  {settings.payment_schedule.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        {item.due_on && (
                          <p className="text-sm text-muted-foreground">{item.due_on}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {item.percentage && (
                          <p className="text-sm text-muted-foreground">{item.percentage}%</p>
                        )}
                        <p className="font-medium">
                          ${(item.amount || (proposal.total_amount * (item.percentage || 0) / 100)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Terms */}
            {settings.show_terms && settings.terms_text && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Terms & Conditions</h2>
                <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {settings.terms_text}
                </p>
              </section>
            )}

            {/* Signature Block */}
            {settings.show_signature_block && (
              <section className="pt-8">
                <h2 className="text-xl font-semibold mb-6">Agreement</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Client</p>
                    <div className="border-b border-dashed pb-6 mb-2">
                      <p className="font-medium">
                        {proposal.client_name || proposal.project?.client_name || 'Client Name'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Signature / Date</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Contractor</p>
                    <div className="border-b border-dashed pb-6 mb-2">
                      <p className="font-medium">Your Company Name</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Signature / Date</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </Card>

        {/* Action Buttons - Sticky on mobile */}
        {isActionable && (
          <div className="sticky bottom-4 bg-card border rounded-lg p-4 shadow-lg">
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
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
