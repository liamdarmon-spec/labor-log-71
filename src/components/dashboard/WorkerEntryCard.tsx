import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronRight, Minus, Plus, Edit, X } from 'lucide-react';

interface JobEntry {
  id: string;
  project_id: string;
  hours_worked: string;
  trade_id: string;
}

interface WorkerEntryCardProps {
  workerName: string;
  tradeName: string;
  isFullDay: boolean;
  totalHours: number;
  cost: number;
  notes: string;
  jobEntries: JobEntry[];
  projects: { id: string; project_name: string }[];
  onToggleFullDay: () => void;
  onEditProjects: () => void;
  onAddNote: () => void;
  onRemove: () => void;
  onHoursChange: (delta: number) => void;
}

export const WorkerEntryCard = ({
  workerName,
  tradeName,
  isFullDay,
  totalHours,
  cost,
  notes,
  jobEntries,
  projects,
  onToggleFullDay,
  onEditProjects,
  onAddNote,
  onRemove,
  onHoursChange,
}: WorkerEntryCardProps) => {
  // Get project summary
  const assignedProjects = jobEntries.filter(j => j.project_id);
  const firstProject = assignedProjects.length > 0 
    ? projects.find(p => p.id === assignedProjects[0].project_id)
    : null;
  
  const projectSummary = assignedProjects.length === 0
    ? 'No projects assigned'
    : assignedProjects.length === 1
    ? firstProject?.project_name || 'Unknown Project'
    : `${firstProject?.project_name} · ${assignedProjects[0].hours_worked}h · +${assignedProjects.length - 1} more`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-lg text-foreground">{workerName}</h3>
            <Badge variant="secondary" className="text-xs">{tradeName}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Hours / Full Day */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Full Day</Label>
            <Switch
              checked={isFullDay}
              onCheckedChange={onToggleFullDay}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Hours</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onHoursChange(-0.5)}
                disabled={totalHours <= 0}
                className="h-9 w-9"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[3rem] text-center">
                {totalHours.toFixed(1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onHoursChange(0.5)}
                disabled={totalHours >= 24}
                className="h-9 w-9"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects */}
        <button
          onClick={onEditProjects}
          className="w-full flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left min-h-[44px]"
        >
          <div>
            <Label className="text-sm font-medium block mb-1">Projects</Label>
            <span className="text-sm text-muted-foreground">{projectSummary}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </button>

        {/* Notes */}
        <button
          onClick={onAddNote}
          className="w-full flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left min-h-[44px]"
        >
          <div className="flex-1 overflow-hidden">
            <Label className="text-sm font-medium block mb-1">Notes</Label>
            {notes ? (
              <span className="text-sm text-muted-foreground line-clamp-1">
                {notes}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/70">+ Add note</span>
            )}
          </div>
          <Edit className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
        </button>

        {/* Cost */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Cost</span>
          <span className="text-lg font-semibold text-primary">
            ${cost.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
