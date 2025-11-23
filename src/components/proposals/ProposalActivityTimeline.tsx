import { useProposalEvents } from '@/hooks/useProposalEvents';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  FileText,
  Send,
  Eye,
  Download,
  CheckCircle,
  MessageSquare,
  XCircle,
  Edit,
} from 'lucide-react';

interface ProposalActivityTimelineProps {
  proposalId: string;
}

export function ProposalActivityTimeline({ proposalId }: ProposalActivityTimelineProps) {
  const { data: events, isLoading } = useProposalEvents(proposalId);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'sent': return <Send className="h-5 w-5 text-purple-600" />;
      case 'viewed': return <Eye className="h-5 w-5 text-green-600" />;
      case 'pdf_downloaded': return <Download className="h-5 w-5 text-indigo-600" />;
      case 'accepted': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'changes_requested': return <MessageSquare className="h-5 w-5 text-yellow-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'updated': return <Edit className="h-5 w-5 text-gray-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'created': return 'Proposal Created';
      case 'sent': return 'Sent to Client';
      case 'viewed': return 'Viewed by Client';
      case 'pdf_downloaded': return 'PDF Downloaded';
      case 'accepted': return 'Accepted';
      case 'changes_requested': return 'Changes Requested';
      case 'rejected': return 'Declined';
      case 'updated': return 'Updated';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Activity Timeline</h3>
      
      {events?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No activity recorded yet
        </p>
      ) : (
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-border" />
          
          {events?.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                {getEventIcon(event.event_type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-sm">
                    {getEventLabel(event.event_type)}
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                
                {(event.actor_name || event.actor_email || event.actor_ip) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {event.actor_name && <p>By: {event.actor_name}</p>}
                    {event.actor_email && <p>Email: {event.actor_email}</p>}
                    {event.actor_ip && event.actor_ip !== 'unknown' && (
                      <p>IP: {event.actor_ip}</p>
                    )}
                  </div>
                )}
                
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 text-xs bg-muted/50 rounded p-2">
                    {event.metadata.notes && (
                      <p className="italic">{event.metadata.notes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
