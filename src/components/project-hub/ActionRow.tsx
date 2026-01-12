import { Button } from '@/components/ui/button';
// Canonical Change Orders route: /app/change-orders?projectId=<id>
// The "Change Order" action button navigates to the Change Orders page with project context.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarPlus, FileUp, Receipt, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionRowProps {
  onNewTask?: () => void;
  onScheduleWorkers?: () => void;
  onAddDocument?: () => void;
  onLogCost?: () => void;
  onAddChangeOrder?: () => void;
}

interface ActionChipProps {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
}

function ActionChip({ label, icon: Icon, onClick, disabled }: ActionChipProps) {
  const chip = (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "gap-1.5 whitespace-nowrap text-xs h-7 px-2.5 rounded-full",
        "border-border/60 bg-background/50 hover:bg-muted/80 hover:border-border",
        "transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Button>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Coming soon
        </TooltipContent>
      </Tooltip>
    );
  }

  return chip;
}

export function ActionRow({
  onScheduleWorkers,
  onAddDocument,
  onLogCost,
  onAddChangeOrder,
}: ActionRowProps) {
  // Note: onNewTask is handled externally via CreateTaskDialog trigger
  const actions = [
    { label: 'Schedule', icon: CalendarPlus, onClick: onScheduleWorkers },
    { label: 'Document', icon: FileUp, onClick: onAddDocument },
    { label: 'Cost', icon: Receipt, onClick: onLogCost },
    { label: 'Change Order', icon: FileEdit, onClick: onAddChangeOrder },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-1.5">
        {actions.map((action) => (
          <ActionChip
            key={action.label}
            label={action.label}
            icon={action.icon}
            onClick={action.onClick}
            disabled={!action.onClick}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
