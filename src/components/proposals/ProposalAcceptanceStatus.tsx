import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ProposalAcceptanceStatusProps {
  proposal: any;
}

export function ProposalAcceptanceStatus({ proposal }: ProposalAcceptanceStatusProps) {
  const { acceptance_status, accepted_by_name, accepted_by_email, acceptance_date, acceptance_notes } = proposal;

  if (acceptance_status === 'pending') {
    return (
      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-3">
          <Clock className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Awaiting Client Response</h3>
            <p className="text-sm text-muted-foreground">
              This proposal has been shared with the client and is awaiting their response.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getIcon = () => {
    switch (acceptance_status) {
      case 'accepted': return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'rejected': return <XCircle className="h-6 w-6 text-destructive" />;
      case 'changes_requested': return <MessageSquare className="h-6 w-6 text-blue-600" />;
      default: return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getTitle = () => {
    switch (acceptance_status) {
      case 'accepted': return 'Proposal Accepted';
      case 'rejected': return 'Proposal Declined';
      case 'changes_requested': return 'Changes Requested';
      default: return 'Status Unknown';
    }
  };

  const getBgColor = () => {
    switch (acceptance_status) {
      case 'accepted': return 'bg-green-50 dark:bg-green-950/20';
      case 'rejected': return 'bg-red-50 dark:bg-red-950/20';
      case 'changes_requested': return 'bg-blue-50 dark:bg-blue-950/20';
      default: return 'bg-muted/30';
    }
  };

  return (
    <Card className={`p-6 ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-2">{getTitle()}</h3>
          
          <div className="space-y-1 text-sm text-muted-foreground mb-3">
            {accepted_by_name && (
              <p>
                <span className="font-medium">By:</span> {accepted_by_name}
                {accepted_by_email && ` (${accepted_by_email})`}
              </p>
            )}
            {acceptance_date && (
              <p>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(acceptance_date), 'MMMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          
          {acceptance_notes && (
            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Notes:</p>
              <p className="text-sm text-muted-foreground">{acceptance_notes}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
