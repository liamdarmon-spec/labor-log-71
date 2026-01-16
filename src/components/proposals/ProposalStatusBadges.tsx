import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | string;
type AcceptanceStatus = 'accepted' | 'rejected' | 'changes_requested' | string | null | undefined;

const statusVariant = (status: ProposalStatus) => {
  switch (status) {
    case 'draft':
      return 'secondary' as const;
    case 'sent':
      return 'default' as const;
    case 'accepted':
      return 'default' as const;
    case 'rejected':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
};

export function ProposalStatusBadges({
  status,
  acceptanceStatus,
  className,
}: {
  status: ProposalStatus;
  acceptanceStatus: AcceptanceStatus;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={statusVariant(status)} className="text-xs">
        {status}
      </Badge>
      {acceptanceStatus === 'accepted' && (
        <Badge variant="default" className="text-xs bg-emerald-600">
          ✓ Approved
        </Badge>
      )}
      {acceptanceStatus === 'rejected' && (
        <Badge variant="destructive" className="text-xs">
          ✗ Rejected
        </Badge>
      )}
      {acceptanceStatus === 'changes_requested' && (
        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
          Changes Requested
        </Badge>
      )}
    </div>
  );
}


