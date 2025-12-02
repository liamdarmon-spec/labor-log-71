import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectMetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'warning';
  iconClassName?: string;
}

export function ProjectMetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  onClick,
  variant = 'default',
  iconClassName,
}: ProjectMetricCardProps) {
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'rounded-xl transition-all duration-200',
        variant === 'warning' && 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20',
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/30',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className={cn(
              'text-2xl font-bold truncate',
              variant === 'warning' && 'text-orange-600 dark:text-orange-400'
            )}>
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-muted-foreground truncate">{subtext}</p>
            )}
          </div>
          <Icon
            className={cn(
              'h-8 w-8 flex-shrink-0',
              variant === 'warning'
                ? 'text-orange-500'
                : 'text-muted-foreground/60',
              iconClassName
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
