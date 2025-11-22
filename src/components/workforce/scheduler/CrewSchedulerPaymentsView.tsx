import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { Label } from '@/components/ui/label';
import { DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CrewSchedulerPaymentsViewProps {
  companyFilter: string;
}

export function CrewSchedulerPaymentsView({ companyFilter }: CrewSchedulerPaymentsViewProps) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfWeek(subWeeks(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date()));

  // Fetch unpaid labor summary by company
  const { data: companySummary, isLoading } = useQuery({
    queryKey: [
      'crew-payment-summary',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      companyFilter
    ],
    queryFn: async () => {
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(project_name, company_id, companies(name))
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const { data: logs } = await query;
      if (!logs) return { ga: null, forma: null };

      // Apply company filter if set
      let filtered = logs;
      if (companyFilter !== 'all') {
        filtered = filtered.filter(log => log.projects?.company_id === companyFilter);
      }

      // Group by company
      const gaLogs = filtered.filter(log => log.projects?.companies?.name === 'GA');
      const formaLogs = filtered.filter(log => log.projects?.companies?.name === 'Forma');

      const calculateSummary = (companyLogs: any[]) => {
        const unpaidLogs = companyLogs.filter(log => log.payment_status === 'unpaid');
        const totalUnpaidHours = unpaidLogs.reduce((sum, log) => sum + log.hours_worked, 0);
        const totalUnpaidCost = unpaidLogs.reduce((sum, log) => {
          const rate = log.workers?.hourly_rate || 0;
          return sum + (log.hours_worked * rate);
        }, 0);

        const totalHours = companyLogs.reduce((sum, log) => sum + log.hours_worked, 0);
        const totalCost = companyLogs.reduce((sum, log) => {
          const rate = log.workers?.hourly_rate || 0;
          return sum + (log.hours_worked * rate);
        }, 0);

        const paidHours = totalHours - totalUnpaidHours;
        const paidCost = totalCost - totalUnpaidCost;

        return {
          totalHours,
          totalCost,
          unpaidHours: totalUnpaidHours,
          unpaidCost: totalUnpaidCost,
          paidHours,
          paidCost,
          workerCount: new Set(unpaidLogs.map(log => log.worker_id)).size,
        };
      };

      return {
        ga: gaLogs.length > 0 ? calculateSummary(gaLogs) : null,
        forma: formaLogs.length > 0 ? calculateSummary(formaLogs) : null,
      };
    },
  });

  const handlePayCompany = (companyName: string) => {
    // Navigate to the existing payment flow with pre-filled data
    navigate(`/financials/payments?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}&company=${companyName}`);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Pay Period:</Label>
              <DatePickerWithPresets date={startDate} onDateChange={setStartDate} />
              <span className="text-muted-foreground">to</span>
              <DatePickerWithPresets date={endDate} onDateChange={setEndDate} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Payment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GA Painting Card */}
        <Card className="border-red-200 bg-gradient-to-br from-card to-red-50/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>GA Painting</span>
              {companySummary?.ga && (
                <DollarSign className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {companySummary?.ga ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unpaid Hours</span>
                    <span className="text-2xl font-bold text-red-600">
                      {companySummary.ga.unpaidHours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unpaid Cost</span>
                    <span className="text-3xl font-bold text-red-600">
                      ${companySummary.ga.unpaidCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Workers Owed</span>
                    <span>{companySummary.ga.workerCount}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Hours:</span>
                    <span className="text-green-600 font-semibold">{companySummary.ga.paidHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Cost:</span>
                    <span className="text-green-600 font-semibold">${companySummary.ga.paidCost.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handlePayCompany('GA')}
                  disabled={companySummary.ga.unpaidCost === 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Start Pay Run
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No GA Painting labor in this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forma Homes Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-card to-blue-50/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Forma Homes</span>
              {companySummary?.forma && (
                <DollarSign className="h-5 w-5 text-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {companySummary?.forma ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unpaid Hours</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {companySummary.forma.unpaidHours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unpaid Cost</span>
                    <span className="text-3xl font-bold text-blue-600">
                      ${companySummary.forma.unpaidCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Workers Owed</span>
                    <span>{companySummary.forma.workerCount}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Hours:</span>
                    <span className="text-green-600 font-semibold">{companySummary.forma.paidHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Cost:</span>
                    <span className="text-green-600 font-semibold">${companySummary.forma.paidCost.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handlePayCompany('Forma')}
                  disabled={companySummary.forma.unpaidCost === 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Start Pay Run
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No Forma Homes labor in this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
