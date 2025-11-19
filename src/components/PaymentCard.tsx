import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PaymentCardProps {
  startDate: string;
  endDate: string;
  amount: number;
  paidBy: string;
  company?: string;
  paidVia?: string;
  notes?: string | null;
  reimbursementStatus?: 'pending' | 'reimbursed' | null;
  reimbursementDate?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PaymentCard = ({
  startDate,
  endDate,
  amount,
  paidBy,
  company,
  paidVia,
  notes,
  reimbursementStatus,
  reimbursementDate,
  onEdit,
  onDelete,
}: PaymentCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Top row: Date Range and Amount */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">
              ${amount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex gap-2">
          <Badge variant={reimbursementStatus === 'reimbursed' ? 'default' : 'outline'}>
            {reimbursementStatus === 'reimbursed' ? 'Reimbursed' : 'Pending'}
          </Badge>
          {reimbursementStatus === 'reimbursed' && reimbursementDate && (
            <p className="text-xs text-muted-foreground self-center">
              on {format(new Date(reimbursementDate), 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        {/* Payment Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid By</span>
            <span className="font-medium text-foreground">{paidBy}</span>
          </div>
          
          {company && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium text-foreground">{company}</span>
            </div>
          )}
          
          {paidVia && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Via</span>
              <span className="font-medium text-foreground">{paidVia}</span>
            </div>
          )}
          
          {notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground mt-1 line-clamp-2">{notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-2">
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
