import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const UnpaidLaborSummary = () => {
  const [unpaidCount, setUnpaidCount] = useState<number>(0);
  const [unpaidAmount, setUnpaidAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnpaidSummary();
  }, []);

  const fetchUnpaidSummary = async () => {
    try {
      const { data: unpaidLogs, error } = await supabase
        .from('daily_logs')
        .select(`
          hours_worked,
          workers (hourly_rate)
        `)
        .eq('payment_status', 'unpaid');

      if (error) throw error;

      if (unpaidLogs) {
        setUnpaidCount(unpaidLogs.length);
        const total = unpaidLogs.reduce((sum, log) => {
          const rate = (log.workers as any)?.hourly_rate || 0;
          return sum + (log.hours_worked * rate);
        }, 0);
        setUnpaidAmount(total);
      }
    } catch (error) {
      console.error('Error fetching unpaid summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unpaid Labor Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Unpaid Labor Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Unpaid labor logs:</span>
          <span className="font-semibold">{unpaidCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Estimated unpaid amount:</span>
          <span className="font-semibold text-lg text-orange-600 dark:text-orange-400">
            ${unpaidAmount.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
