import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Briefcase, User, DollarSign, Edit2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TimeLog {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  cost_code_id: string | null;
  date: string;
  hours_worked: number;
  notes: string | null;
  payment_status: string | null;
  paid_amount: number | null;
  schedule_id: string | null;
  worker: { name: string; trade: string; hourly_rate: number } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
  cost_code: { code: string; name: string } | null;
  payment: { 
    id: string;
    paid_by: string;
    payment_date: string;
    amount: number;
  } | null;
}

interface UniversalTimeLogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLog: TimeLog | null;
  onRefresh?: () => void;
}

export function UniversalTimeLogDrawer({
  open,
  onOpenChange,
  timeLog,
  onRefresh
}: UniversalTimeLogDrawerProps) {
  const navigate = useNavigate();

  if (!timeLog) return null;

  const laborCost = timeLog.hours_worked * (timeLog.worker?.hourly_rate || 0);
  const isPaid = timeLog.payment_status === 'paid';

  const handleEditInDailyLog = () => {
    navigate(`/daily-log?date=${timeLog.date}&worker_id=${timeLog.worker_id}`);
    onOpenChange(false);
  };

  const handleOpenProject = () => {
    navigate(`/projects/${timeLog.project_id}?tab=budget`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Log Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Worker Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">{timeLog.worker?.name || 'Unknown'}</span>
                  </div>
                  {timeLog.worker?.trade && (
                    <p className="text-sm text-muted-foreground ml-6">{timeLog.worker.trade}</p>
                  )}
                  {timeLog.worker?.hourly_rate && (
                    <p className="text-sm text-muted-foreground ml-6">
                      ${timeLog.worker.hourly_rate}/hr
                    </p>
                  )}
                </div>
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {isPaid ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Project & Time Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{timeLog.project?.project_name || 'Unknown Project'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenProject}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              {timeLog.project?.client_name && (
                <p className="text-sm text-muted-foreground ml-6">Client: {timeLog.project.client_name}</p>
              )}
              <div className="flex items-center gap-4 ml-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{format(new Date(timeLog.date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-semibold">{timeLog.hours_worked}h</span>
                </div>
              </div>
              {timeLog.trade && (
                <div className="ml-6">
                  <Badge variant="outline">{timeLog.trade.name}</Badge>
                </div>
              )}
              {timeLog.cost_code && (
                <div className="ml-6">
                  <Badge variant="outline">
                    {timeLog.cost_code.code} - {timeLog.cost_code.name}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Labor Cost</span>
                </div>
                <span className="text-lg font-semibold">${laborCost.toFixed(2)}</span>
              </div>
              {isPaid && timeLog.payment && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Paid by {timeLog.payment.paid_by} on {format(new Date(timeLog.payment.payment_date), 'MMM d, yyyy')}
                  </p>
                  {timeLog.paid_amount && (
                    <p className="text-xs text-muted-foreground">
                      Amount: ${timeLog.paid_amount.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {timeLog.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Notes:</p>
                <p className="text-sm mt-1">{timeLog.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          {timeLog.schedule_id && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Linked to Schedule ID: {timeLog.schedule_id.slice(0, 8)}...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleEditInDailyLog}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit in Daily Log
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
