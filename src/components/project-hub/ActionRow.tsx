import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, CalendarPlus, FileUp, Receipt, FileEdit 
} from 'lucide-react';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { AddCostDialog } from '@/components/financials/AddCostDialog';

interface ActionRowProps {
  projectId: string;
  onRefresh?: () => void;
}

export function ActionRow({ projectId, onRefresh }: ActionRowProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);

  return (
    <>
      <div className="overflow-x-auto -mx-2 px-2 pb-1">
        <div className="flex items-center gap-2 min-w-max">
          {/* New Task - uses trigger pattern */}
          <CreateTaskDialog
            projectId={projectId}
            trigger={
              <Button variant="default" size="sm" className="gap-1.5 whitespace-nowrap text-xs h-8">
                <Plus className="h-3.5 w-3.5" />
                New Task
              </Button>
            }
          />

          {/* Schedule Workers */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScheduleDialog(true)}
            className="gap-1.5 whitespace-nowrap text-xs h-8"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule Workers
          </Button>

          {/* Add Document - placeholder */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            className="gap-1.5 whitespace-nowrap text-xs h-8"
          >
            <FileUp className="h-3.5 w-3.5" />
            Add Document
          </Button>

          {/* Log Cost */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCostDialog(true)}
            className="gap-1.5 whitespace-nowrap text-xs h-8"
          >
            <Receipt className="h-3.5 w-3.5" />
            Log Cost
          </Button>

          {/* Change Order - placeholder */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            className="gap-1.5 whitespace-nowrap text-xs h-8"
          >
            <FileEdit className="h-3.5 w-3.5" />
            Change Order
          </Button>
        </div>
      </div>

      <AddToScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        defaultProjectId={projectId}
        onScheduleCreated={() => {
          setShowScheduleDialog(false);
          onRefresh?.();
        }}
      />

      <AddCostDialog
        open={showCostDialog}
        onOpenChange={setShowCostDialog}
      />
    </>
  );
}
