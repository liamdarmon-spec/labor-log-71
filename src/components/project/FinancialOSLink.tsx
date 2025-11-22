import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinancialOSLinkProps {
  projectId: string;
}

export function FinancialOSLink({ projectId }: FinancialOSLinkProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => navigate(`/financials/payments?project=${projectId}`)}
    >
      <DollarSign className="w-4 h-4" />
      View in Financial OS
    </Button>
  );
}
