/**
 * Dashboard Overview Cards
 * Key metrics and quick actions for the week
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar,
  Clock, 
  DollarSign, 
  AlertTriangle,
  Users,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export function DashboardOverviewCards() {
  const navigate = useNavigate();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const today = format(new Date(), 'yyyy-MM-dd');

  // This Week's Schedule
  const { data: weekSchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['week-schedule-summary', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_schedules')
        .select('scheduled_hours, worker_id')
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      const totalHours = data?.reduce((sum, s) => sum + s.scheduled_hours, 0) || 0;
      const uniqueWorkers = new Set(data?.map(s => s.worker_id)).size;

      return { totalHours, workerCount: uniqueWorkers };
    },
  });

  // Unpaid Labor
  const { data: unpaidLabor, isLoading: unpaidLoading } = useQuery({
    queryKey: ['unpaid-labor-summary'],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from('time_logs')
        .select(`
          hours_worked,
          hourly_rate,
          worker_id,
          workers(hourly_rate)
        `)
        .eq('payment_status', 'unpaid');

      const totalAmount = logs?.reduce((sum, log) => {
        const rate = log.hourly_rate || log.workers?.hourly_rate || 0;
        return sum + (log.hours_worked * rate);
      }, 0) || 0;

      const uniqueWorkers = new Set(logs?.map(l => l.worker_id)).size;

      return { totalAmount, workerCount: uniqueWorkers, logCount: logs?.length || 0 };
    },
  });

  // Unlogged Schedules (past days not yet logged)
  const { data: unlogged, isLoading: unloggedLoading } = useQuery({
    queryKey: ['unlogged-schedules-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_schedules')
        .select('id, scheduled_hours')
        .lt('scheduled_date', today)
        .eq('converted_to_timelog', false);

      // Filter out those that already have time logs
      const filtered = await Promise.all(
        (data || []).map(async (schedule) => {
          const { data: log } = await supabase
            .from('time_logs')
            .select('id')
            .eq('source_schedule_id', schedule.id)
            .maybeSingle();
          
          return log ? null : schedule;
        })
      );

      const unloggedSchedules = filtered.filter(s => s !== null);
      const totalHours = unloggedSchedules.reduce((sum, s) => sum + (s?.scheduled_hours || 0), 0);

      return { count: unloggedSchedules.length, hours: totalHours };
    },
  });

  // Active Projects
  const { data: activeProjects } = useQuery({
    queryKey: ['active-projects-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      return count || 0;
    },
  });

  if (scheduleLoading || unpaidLoading || unloggedLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row: This Week & Unpaid Labor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
          onClick={() => navigate('/workforce?tab=scheduler')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                This Week's Schedule
              </span>
              <Button variant="ghost" size="sm">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{weekSchedule?.totalHours || 0}</span>
                <span className="text-lg text-muted-foreground">hours</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {weekSchedule?.workerCount || 0} workers scheduled this week
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:border-orange-800/30 dark:from-orange-950/20 dark:to-orange-900/20"
          onClick={() => navigate('/workforce?tab=pay-center&view=unpaid')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Unpaid Labor
              </span>
              <Button variant="ghost" size="sm">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  ${unpaidLabor?.totalAmount.toLocaleString() || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {unpaidLabor?.logCount || 0} unpaid time logs • {unpaidLabor?.workerCount || 0} workers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Alerts & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unlogged Schedules Alert */}
        {unlogged && unlogged.count > 0 ? (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10"
            onClick={() => navigate('/workforce?tab=pay-center&view=unlogged')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Unlogged Schedules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-destructive">{unlogged.count}</span>
                <span className="text-sm text-muted-foreground">past days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {unlogged.hours}h need converting to time logs
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950/20 dark:to-green-900/20 dark:border-green-800/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                All Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                No unlogged schedules
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All past work has been logged
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Projects */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/projects')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{activeProjects || 0}</span>
              <span className="text-sm text-muted-foreground">projects</span>
            </div>
          </CardContent>
        </Card>

        {/* Team Size */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/workforce?tab=labor')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Workforce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{weekSchedule?.workerCount || 0}</span>
              <span className="text-sm text-muted-foreground">active this week</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
