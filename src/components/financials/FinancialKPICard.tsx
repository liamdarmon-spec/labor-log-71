import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialKPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export function FinancialKPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default',
  onClick 
}: FinancialKPICardProps) {
  const variantStyles = {
    default: 'bg-card hover:bg-accent/5',
    success: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100',
    warning: 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100',
    danger: 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100',
  };

  const textStyles = {
    default: 'text-foreground',
    success: 'text-emerald-900 dark:text-emerald-100',
    warning: 'text-amber-900 dark:text-amber-100',
    danger: 'text-rose-900 dark:text-rose-100',
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={cn('text-3xl font-bold mt-1', textStyles[variant])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', iconStyles[variant])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
