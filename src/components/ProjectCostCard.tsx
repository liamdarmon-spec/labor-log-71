import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProjectCostCardProps {
  projectName: string;
  hours: number;
  cost: number;
  percentage: number;
}

export const ProjectCostCard = ({ projectName, hours, cost, percentage }: ProjectCostCardProps) => {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h4 className="font-semibold text-foreground flex-1 pr-2">{projectName}</h4>
          <span className="text-lg font-bold text-primary shrink-0">${cost.toFixed(2)}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hours Worked</span>
            <span className="font-medium text-foreground">{hours}h</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">% of Total</span>
              <span className="font-medium text-foreground">{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
