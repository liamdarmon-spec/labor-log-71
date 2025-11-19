import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';

interface WorkerCardProps {
  name: string;
  trade: string;
  hourlyRate: number;
  phone?: string | null;
  active: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const WorkerCard = ({
  name,
  trade,
  hourlyRate,
  phone,
  active,
  onEdit,
  onDelete,
}: WorkerCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Name and Trade */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground">{name}</h3>
            <Badge variant="secondary">{trade}</Badge>
          </div>
          <Badge variant={active ? 'default' : 'outline'}>
            {active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm pt-2 border-t border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hourly Rate</span>
            <span className="font-semibold text-primary">${hourlyRate.toFixed(2)}/hr</span>
          </div>
          
          {phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{phone}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 gap-2">
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
