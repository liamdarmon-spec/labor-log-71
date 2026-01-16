import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ContractLockNotice({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={cn('text-xs text-muted-foreground flex items-center gap-1', className)}>
      <Lock className="h-3 w-3" />
      {message}
    </p>
  );
}


