import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimeLogCardProps {
  date: string;
  workerName: string;
  tradeName: string;
  totalHours: number;
  totalCost: number;
  entries: Array<{
    id: string;
    project_name: string;
    hours: number;
    notes?: string | null;
  }>;
  paymentStatus?: 'paid' | 'unpaid';
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TimeLogCard = ({
  date,
  workerName,
  tradeName,
  totalHours,
  totalCost,
  entries,
  paymentStatus,
  onEdit,
  onDelete,
}: TimeLogCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Top row: Date and Cost */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(date), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">
              ${totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Worker and Trade */}
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{workerName}</p>
          <Badge variant="secondary" className="text-xs">
            {tradeName}
          </Badge>
        </div>

        {/* Projects and Hours */}
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground truncate flex-1">{entry.project_name}</span>
              <Badge variant="outline" className="ml-2 shrink-0">
                {entry.hours}h
              </Badge>
            </div>
          ))}
        </div>

        {/* Total Hours Badge */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Hours</span>
            <Badge className="font-semibold">{totalHours}h</Badge>
          </div>
        </div>

        {/* Bottom row: Status and Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {paymentStatus && (
              <Badge variant={paymentStatus === 'paid' ? 'default' : 'outline'}>
                {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
              </Badge>
            )}
            {entries.some((e) => e.notes) && (
              <Badge variant="secondary" className="text-xs">
                Has Notes
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
