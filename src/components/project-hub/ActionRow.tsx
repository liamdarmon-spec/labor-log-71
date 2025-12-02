import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, CalendarPlus, FileUp, Receipt, FileEdit } from 'lucide-react';

export interface ActionRowProps {
  onNewTask?: () => void;
  onScheduleWorkers?: () => void;
  onAddDocument?: () => void;
  onLogCost?: () => void;
  onAddChangeOrder?: () => void;
}

export function ActionRow({
  onNewTask,
  onScheduleWorkers,
  onAddDocument,
  onLogCost,
  onAddChangeOrder,
}: ActionRowProps) {
  const actions = [
    { label: 'New Task', icon: Plus, onClick: onNewTask, primary: true },
    { label: 'Schedule Workers', icon: CalendarPlus, onClick: onScheduleWorkers },
    { label: 'Add Document', icon: FileUp, onClick: onAddDocument },
    { label: 'Log Cost', icon: Receipt, onClick: onLogCost },
    { label: 'Change Order', icon: FileEdit, onClick: onAddChangeOrder },
  ];

  return (
    <TooltipProvider>
      <div className="overflow-x-auto -mx-2 px-2 pb-1">
        <div className="flex gap-2 min-w-max">
          {actions.map((action) => {
            const isDisabled = !action.onClick;
            const button = (
              <Button
                key={action.label}
                variant={action.primary ? 'default' : 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={isDisabled}
                className="gap-1.5 whitespace-nowrap text-xs h-8"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            );

            if (isDisabled) {
              return (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
