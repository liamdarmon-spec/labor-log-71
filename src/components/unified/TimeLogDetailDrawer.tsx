/**
 * Unified Time Log Detail Drawer
 * Used consistently across Activity Tab, Time Logs Table, and any other time log views
 */

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { 
  User, 
  Briefcase, 
  Clock, 
  DollarSign, 
  Calendar, 
  Hash,
  ExternalLink,
  Split,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TimeLogDetailDrawerProps {
  log: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSplit?: (log: any) => void;
  onEdit?: (log: any) => void;
}

export function TimeLogDetailDrawer({ 
  log, 
  open, 
  onOpenChange,
  onSplit,
  onEdit 
}: TimeLogDetailDrawerProps) {
  const navigate = useNavigate();

  if (!log) return null;

  const hourlyRate = log.hourly_rate || log.workers?.hourly_rate || 0;
  const laborCost = log.hours_worked * hourlyRate;
  const isPaid = log.payment_status === 'paid';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Time Log Details</SheetTitle>
          <SheetDescription>
            {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Worker Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Worker Information</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="font-semibold">{log.workers?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Trade</p>
                <Badge variant="secondary">{log.trades?.name || log.workers?.trade || 'N/A'}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Project & Company Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>Project & Company</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company</p>
                <Badge variant="outline" className="font-medium">
                  {log.companies?.name || log.projects?.companies?.name || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Project</p>
                <p className="font-medium text-sm">{log.projects?.project_name}</p>
              </div>
            </div>
            {log.project_id && (
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-6 gap-2"
                onClick={() => navigate(`/projects/${log.project_id}`)}
              >
                <ExternalLink className="h-3 w-3" />
                View Project
              </Button>
            )}
          </div>

          <Separator />

          {/* Time & Cost Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time & Cost</span>
            </div>
            <div className="pl-6 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Hours</p>
                  <p className="text-2xl font-bold">{log.hours_worked}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rate</p>
                  <p className="text-xl font-semibold">${hourlyRate}/hr</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Labor Cost</p>
                  <p className="text-2xl font-bold text-primary">${laborCost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Status Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Payment Status</span>
            </div>
            <div className="pl-6 space-y-3">
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>
                )}
                {isPaid && log.paid_amount && (
                  <span className="text-sm text-muted-foreground">
                    ${log.paid_amount.toFixed(2)} paid
                  </span>
                )}
              </div>
              {log.payments && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Payment Date</p>
                  <p className="font-medium">{format(new Date(log.payments.payment_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground mt-1">Paid by: {log.payments.paid_by}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Code Section */}
          {log.cost_codes && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>Cost Code</span>
                </div>
                <div className="pl-6">
                  <Badge variant="outline" className="font-mono">
                    {log.cost_codes.code} – {log.cost_codes.name}
                  </Badge>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes Section */}
          {log.notes && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Notes</span>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Schedule Link */}
          {log.source_schedule_id && (
            <div className="pl-6 text-xs text-muted-foreground">
              Originated from schedule #{log.source_schedule_id.slice(0, 8)}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {onSplit && !isPaid && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onSplit(log)}>
                <Split className="h-4 w-4" />
                Split Across Projects
              </Button>
            )}
            {onEdit && !isPaid && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(log)}>
                <Edit className="h-4 w-4" />
                Edit Log
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
