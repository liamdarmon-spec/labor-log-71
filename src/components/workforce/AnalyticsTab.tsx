import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks } from 'date-fns';

export function AnalyticsTab() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['workforce-analytics'],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get all workers
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate, active');

      const activeWorkerCount = workers?.filter(w => w.active).length || 0;

      // Get this week's hours and cost
      const { data: weekLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);

      const weekHours = weekLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;
      const weekCost = weekLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      // Get this month's data
      const { data: monthLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      const monthHours = monthLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;
      const monthCost = monthLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      // Get unpaid labor
      const { data: unpaidLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id, payment_status')
        .eq('payment_status', 'unpaid');

      const unpaidAmount = unpaidLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      // Get cost by trade
      const { data: tradeData } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id, workers(trade, hourly_rate)')
        .gte('date', format(monthStart, 'yyyy-MM-dd'));

      const costByTrade = tradeData?.reduce((acc, log) => {
        const trade = log.workers?.trade || 'Unknown';
        const cost = (log.hours_worked || 0) * (log.workers?.hourly_rate || 0);
        acc[trade] = (acc[trade] || 0) + cost;
        return acc;
      }, {} as Record<string, number>);

      // Calculate utilization (assuming 40h/week target per active worker)
      const targetWeekHours = activeWorkerCount * 40;
      const utilizationRate = targetWeekHours > 0 ? (weekHours / targetWeekHours) * 100 : 0;

      // Get last week for comparison
      const lastWeekStart = subWeeks(weekStart, 1);
      const lastWeekEnd = subWeeks(weekEnd, 1);

      const { data: lastWeekLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .gte('date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(lastWeekEnd, 'yyyy-MM-dd'));

      const lastWeekCost = lastWeekLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      const weekOverWeekChange = lastWeekCost > 0 
        ? ((weekCost - lastWeekCost) / lastWeekCost) * 100 
        : 0;

      return {
        activeWorkerCount,
        weekHours,
        weekCost,
        monthHours,
        monthCost,
        unpaidAmount,
        costByTrade: Object.entries(costByTrade || {})
          .map(([trade, cost]) => ({ trade, cost }))
          .sort((a, b) => b.cost - a.cost),
        utilizationRate,
        weekOverWeekChange,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const metrics = [
    {
      label: 'Active Workers',
      value: analytics.activeWorkerCount,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'This Week Hours',
      value: analytics.weekHours.toFixed(1),
      suffix: 'h',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'This Week Cost',
      value: analytics.weekCost.toLocaleString(),
      prefix: '$',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: analytics.weekOverWeekChange,
    },
    {
      label: 'Utilization Rate',
      value: analytics.utilizationRate.toFixed(1),
      suffix: '%',
      icon: TrendingUp,
      color: analytics.utilizationRate >= 80 ? 'text-green-600' : 'text-orange-600',
      bgColor: analytics.utilizationRate >= 80 ? 'bg-green-50' : 'bg-orange-50',
    },
    {
      label: 'This Month Cost',
      value: analytics.monthCost.toLocaleString(),
      prefix: '$',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Unpaid Labor',
      value: analytics.unpaidAmount.toLocaleString(),
      prefix: '$',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Workforce Analytics</h3>
        <p className="text-muted-foreground">
          Real-time insights into labor costs, utilization, and trends
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className={`text-3xl font-bold ${metric.color} tracking-tight`}>
                    {metric.prefix}{metric.value}{metric.suffix}
                  </p>
                  {metric.change !== undefined && (
                    <p className={`text-xs ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}% vs last week
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cost by Trade */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Trade (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.costByTrade.slice(0, 10).map((item, index) => {
              const percentage = analytics.monthCost > 0 
                ? (item.cost / analytics.monthCost) * 100 
                : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.trade}</span>
                    <span className="text-muted-foreground">
                      ${item.cost.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
