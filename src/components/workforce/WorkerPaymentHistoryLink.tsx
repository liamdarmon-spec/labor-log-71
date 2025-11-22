import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkerPaymentHistoryLinkProps {
  workerId: string;
}

export function WorkerPaymentHistoryLink({ workerId }: WorkerPaymentHistoryLinkProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => navigate(`/financials/payments?worker=${workerId}`)}
    >
      <DollarSign className="w-4 h-4" />
      View Payment History
    </Button>
  );
}
