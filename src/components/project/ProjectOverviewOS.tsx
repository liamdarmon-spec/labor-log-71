import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Users, TrendingUp, AlertTriangle, CheckCircle2, 
  Clock, Briefcase, DollarSign, Plus, ClipboardList, FileText,
  ArrowRight, Building2, Hammer
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';

interface ProjectOverviewOSProps {
  projectId: string;
}

export function ProjectOverviewOS({ projectId }: ProjectOverviewOSProps) {
  const navigate = useNavigate();
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  // PROJECT HEALTH: Schedule Status
  const { data: scheduleHealth } = useQuery({
    queryKey: ['schedule-health', projectId],
    queryFn: async () => {
      const { data: schedules } = await supabase
        .from('work_schedules')
        .select('scheduled_date, worker_id')
        .eq('project_id', projectId)
        .lt('scheduled_date', today);
      
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('date')
        .eq('project_id', projectId)
        .lt('date', today);

      const scheduledDays = new Set(schedules?.map(s => s.scheduled_date) || []).size;
      const loggedDays = new Set(logs?.map(l => l.date) || []).size;
      
      const completion = scheduledDays > 0 ? (loggedDays / scheduledDays) * 100 : 0;
      
      let status: 'On Track' | 'At Risk' | 'Delayed' = 'On Track';
      if (completion < 50) status = 'Delayed';
      else if (completion < 80) status = 'At Risk';

      return { status, completion: completion.toFixed(1), scheduledDays, loggedDays };
    },
  });

  // PROJECT HEALTH: Budget Status
  const { data: budgetHealth } = useQuery({
    queryKey: ['budget-health', projectId],
    queryFn: async () => {
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .single();

      const totalBudget = (budget?.labor_budget || 0) + (budget?.subs_budget || 0) + 
                          (budget?.materials_budget || 0) + (budget?.other_budget || 0);

      // Calculate labor actual
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .eq('project_id', projectId);

      const workerIds = [...new Set(logs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);
      const laborActual = logs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      // Get materials actual
      const { data: materials } = await supabase
        .from('material_receipts')
        .select('total')
        .eq('project_id', projectId);
      const materialsActual = materials?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;

      // Get subs actual
      const { data: subInvoices } = await supabase
        .from('sub_invoices')
        .select('total')
        .eq('project_id', projectId);
      const subsActual = subInvoices?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

      const totalActual = laborActual + subsActual + materialsActual;
      const percentUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      let status: 'healthy' | 'warning' | 'danger' = 'healthy';
      if (percentUsed > 100) status = 'danger';
      else if (percentUsed > 80) status = 'warning';

      return { 
        status, 
        percentUsed: percentUsed.toFixed(1), 
        totalBudget, 
        totalActual,
        remaining: totalBudget - totalActual
      };
    },
  });

  // PROJECT HEALTH: Labor Status
  const { data: laborHealth } = useQuery({
    queryKey: ['labor-health', projectId, weekStart],
    queryFn: async () => {
      const { data: weekLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, payment_status, worker_id')
        .eq('project_id', projectId)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const weekHours = weekLogs?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      const { data: unpaidLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .eq('project_id', projectId)
        .eq('payment_status', 'unpaid');

      const workerIds = [...new Set(unpaidLogs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);
      const unpaidAmount = unpaidLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      return { weekHours, unpaidAmount, hasUnpaid: unpaidAmount > 0 };
    },
  });

  // PROJECT HEALTH: Subs Status
  const { data: subsHealth } = useQuery({
    queryKey: ['subs-health', projectId],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('sub_contracts')
        .select(`
          id,
          contract_value,
          amount_billed,
          amount_paid,
          retention_held,
          subs(name, trade_id)
        `)
        .eq('project_id', projectId);

      const totalValue = contracts?.reduce((sum, c) => sum + (c.contract_value || 0), 0) || 0;
      const totalBilled = contracts?.reduce((sum, c) => sum + (c.amount_billed || 0), 0) || 0;
      const totalPaid = contracts?.reduce((sum, c) => sum + (c.amount_paid || 0), 0) || 0;
      const totalRetention = contracts?.reduce((sum, c) => sum + (c.retention_held || 0), 0) || 0;

      return {
        contractCount: contracts?.length || 0,
        totalValue,
        totalBilled,
        totalPaid,
        totalRetention,
        outstanding: totalBilled - totalPaid
      };
    },
  });

  // Today's Schedule
  const { data: todaySchedule } = useQuery({
    queryKey: ['today-schedule', projectId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_schedules')
        .select('*, workers(name, trade), project:projects(company_id)')
        .eq('project_id', projectId)
        .eq('scheduled_date', today);

      const totalHours = data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const uniqueWorkers = new Set(data?.map(s => s.worker_id) || []).size;

      return { shifts: data || [], totalHours, uniqueWorkers };
    },
  });

  // This Week Data
  const { data: weekData } = useQuery({
    queryKey: ['week-data', projectId, weekStart],
    queryFn: async () => {
      const [scheduleRes, logsRes] = await Promise.all([
        supabase
          .from('work_schedules')
          .select('scheduled_hours')
          .eq('project_id', projectId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
        supabase
          .from('daily_logs')
          .select('hours_worked')
          .eq('project_id', projectId)
          .gte('date', weekStart)
          .lte('date', weekEnd),
      ]);

      const scheduledHours = scheduleRes.data?.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0) || 0;
      const loggedHours = logsRes.data?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0;

      return { scheduledHours, loggedHours };
    },
  });

  // Budget by Category
  const { data: budgetByCategory } = useQuery({
    queryKey: ['budget-by-category', projectId],
    queryFn: async () => {
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .single();

      // Get actuals - same logic as budgetHealth but broken down
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .eq('project_id', projectId);

      const workerIds = [...new Set(logs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);
      const laborActual = logs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      const { data: materials } = await supabase
        .from('material_receipts')
        .select('total')
        .eq('project_id', projectId);
      const materialsActual = materials?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;

      const { data: subInvoices } = await supabase
        .from('sub_invoices')
        .select('total')
        .eq('project_id', projectId);
      const subsActual = subInvoices?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

      return {
        labor: {
          budget: budget?.labor_budget || 0,
          actual: laborActual,
          variance: (budget?.labor_budget || 0) - laborActual,
        },
        subs: {
          budget: budget?.subs_budget || 0,
          actual: subsActual,
          variance: (budget?.subs_budget || 0) - subsActual,
        },
        materials: {
          budget: budget?.materials_budget || 0,
          actual: materialsActual,
          variance: (budget?.materials_budget || 0) - materialsActual,
        },
        other: {
          budget: budget?.other_budget || 0,
          actual: 0,
          variance: budget?.other_budget || 0,
        },
      };
    },
  });

  // Workforce Snapshot (last 7 days)
  const { data: workforceSnapshot } = useQuery({
    queryKey: ['workforce-snapshot', projectId],
    queryFn: async () => {
      const sevenDaysAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('worker_id, hours_worked, payment_status')
        .eq('project_id', projectId)
        .gte('date', sevenDaysAgo);

      const workerStats = new Map<string, { hours: number; unpaid: number }>();
      logs?.forEach(log => {
        const current = workerStats.get(log.worker_id) || { hours: 0, unpaid: 0 };
        current.hours += log.hours_worked || 0;
        workerStats.set(log.worker_id, current);
      });

      const workerIds = Array.from(workerStats.keys());
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, trade, hourly_rate')
        .in('id', workerIds);

      const { data: unpaidLogs } = await supabase
        .from('daily_logs')
        .select('worker_id, hours_worked')
        .eq('project_id', projectId)
        .eq('payment_status', 'unpaid')
        .in('worker_id', workerIds);

      const unpaidByWorker = new Map<string, number>();
      unpaidLogs?.forEach(log => {
        const current = unpaidByWorker.get(log.worker_id) || 0;
        unpaidByWorker.set(log.worker_id, current + (log.hours_worked || 0));
      });

      const enriched = workers?.map(w => {
        const stats = workerStats.get(w.id);
        const unpaidHours = unpaidByWorker.get(w.id) || 0;
        return {
          ...w,
          totalHours: stats?.hours || 0,
          unpaidAmount: unpaidHours * (w.hourly_rate || 0),
        };
      }) || [];

      return enriched.sort((a, b) => b.totalHours - a.totalHours).slice(0, 10);
    },
  });

  // Subs Snapshot
  const { data: subsSnapshot } = useQuery({
    queryKey: ['subs-snapshot', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sub_contracts')
        .select(`
          *,
          subs(id, name, company_name, trade_id, trades(name))
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      return data?.map(contract => ({
        ...contract,
        outstanding: (contract.amount_billed || 0) - (contract.amount_paid || 0),
        percentComplete: contract.contract_value > 0 
          ? ((contract.amount_billed || 0) / contract.contract_value * 100).toFixed(1)
          : '0',
      })) || [];
    },
  });

  const isLoading = !scheduleHealth || !budgetHealth || !laborHealth || !subsHealth;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A) PROJECT HEALTH BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schedule Status */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/projects/${projectId}?tab=schedule`)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge 
                  variant={
                    scheduleHealth.status === 'On Track' ? 'default' :
                    scheduleHealth.status === 'At Risk' ? 'outline' : 'destructive'
                  }
                  className={
                    scheduleHealth.status === 'On Track' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                    scheduleHealth.status === 'At Risk' ? 'border-orange-500 text-orange-700' : ''
                  }
                >
                  {scheduleHealth.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{scheduleHealth.completion}%</div>
              <p className="text-xs text-muted-foreground">
                {scheduleHealth.loggedDays}/{scheduleHealth.scheduledDays} days logged
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/projects/${projectId}?tab=financials`)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress 
                value={Number(budgetHealth.percentUsed)} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{budgetHealth.percentUsed}% used</span>
                <Badge 
                  variant={
                    budgetHealth.status === 'healthy' ? 'default' :
                    budgetHealth.status === 'warning' ? 'outline' : 'destructive'
                  }
                  className={
                    budgetHealth.status === 'healthy' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                    budgetHealth.status === 'warning' ? 'border-orange-500 text-orange-700' : ''
                  }
                >
                  {budgetHealth.status}
                </Badge>
              </div>
              <div className="text-lg font-bold">
                ${budgetHealth.remaining.toLocaleString()} left
              </div>
              <p className="text-xs text-muted-foreground">
                ${budgetHealth.totalActual.toLocaleString()} / ${budgetHealth.totalBudget.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Labor Risk */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/workforce?tab=pay-center&project=${projectId}`)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Labor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {laborHealth.hasUnpaid && (
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    Unpaid
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold">{laborHealth.weekHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">This week</p>
              {laborHealth.hasUnpaid && (
                <div className="text-sm font-semibold text-orange-600">
                  ${laborHealth.unpaidAmount.toLocaleString()} unpaid
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subs Risk */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/projects/${projectId}?tab=subs`)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Subs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{subsHealth.contractCount}</div>
              <p className="text-xs text-muted-foreground">Active contracts</p>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium">${subsHealth.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billed:</span>
                  <span className="font-medium">${subsHealth.totalBilled.toLocaleString()}</span>
                </div>
                {subsHealth.totalRetention > 0 && (
                  <div className="flex justify-between text-xs text-orange-600 mt-1">
                    <span>Retention:</span>
                    <span className="font-medium">${subsHealth.totalRetention.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* B) TODAY & THIS WEEK SNAPSHOT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today & This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Workers Scheduled Today */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Workers Scheduled Today</p>
              <div 
                className="cursor-pointer hover:bg-accent p-3 rounded-lg transition-colors"
                onClick={() => {
                  setSelectedDate(new Date());
                  setIsDayDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-3xl font-bold text-primary">{todaySchedule?.uniqueWorkers || 0}</div>
                  <div className="text-sm">
                    <div className="font-semibold">{todaySchedule?.totalHours.toFixed(1)}h</div>
                    <div className="text-muted-foreground">scheduled</div>
                  </div>
                </div>
                {todaySchedule && todaySchedule.shifts.length > 0 && (
                  <div className="space-y-1">
                    {todaySchedule.shifts.slice(0, 3).map((shift: any) => (
                      <div key={shift.id} className="text-xs text-muted-foreground">
                        {shift.workers?.name} • {shift.scheduled_hours}h
                      </div>
                    ))}
                    {todaySchedule.shifts.length > 3 && (
                      <div className="text-xs text-primary font-medium">+{todaySchedule.shifts.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hours This Week */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Hours This Week</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scheduled:</span>
                  <span className="text-xl font-bold text-blue-600">{weekData?.scheduledHours.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Logged:</span>
                  <span className="text-xl font-bold text-green-600">{weekData?.loggedHours.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Variance:</span>
                  <span className={`text-lg font-bold ${
                    (weekData?.loggedHours || 0) - (weekData?.scheduledHours || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {((weekData?.loggedHours || 0) - (weekData?.scheduledHours || 0)).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Open Items */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Open Items</p>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Task tracking coming soon</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C) BUDGET VS ACTUAL BY CATEGORY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Budget vs Actual by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['labor', 'subs', 'materials', 'other'].map((category) => {
              const data = budgetByCategory?.[category as keyof typeof budgetByCategory];
              if (!data) return null;

              const percentUsed = data.budget > 0 ? (data.actual / data.budget) * 100 : 0;
              const isOverBudget = percentUsed > 100;
              const isWarning = percentUsed > 80 && percentUsed <= 100;

              return (
                <Card 
                  key={category} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    isOverBudget ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 
                    isWarning ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''
                  }`}
                  onClick={() => navigate(`/projects/${projectId}?tab=financials&category=${category}`)}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold capitalize mb-3">{category}</p>
                    <div className="space-y-2">
                      <Progress value={Math.min(percentUsed, 100)} className="h-2" />
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="font-medium">${data.budget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Actual:</span>
                          <span className="font-medium">${data.actual.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold pt-1 border-t">
                          <span className="text-muted-foreground">Variance:</span>
                          <span className={data.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${Math.abs(data.variance).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {isOverBudget && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Over budget</span>
                        </div>
                      )}
                      {isWarning && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{percentUsed.toFixed(0)}% used</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* D) WORKFORCE SNAPSHOT */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Workforce Snapshot (Last 7 Days)
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/workforce?tab=labor&project=${projectId}`)}
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workforceSnapshot && workforceSnapshot.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workforceSnapshot.map((worker: any) => (
                  <TableRow key={worker.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.trade}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.companies?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{worker.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      {worker.unpaidAmount > 0 ? (
                        <span className="font-semibold text-orange-600">
                          ${worker.unpaidAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No workforce activity in the last 7 days</p>
          )}
        </CardContent>
      </Card>

      {/* E) SUBCONTRACTORS SNAPSHOT */}
      {subsSnapshot && subsSnapshot.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Project Subcontractors
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/projects/${projectId}?tab=subs`)}
              >
                Manage Subs <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub</TableHead>
                  <TableHead className="text-right">Contract Value</TableHead>
                  <TableHead className="text-right">Billed / Paid</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsSnapshot.map((contract: any) => {
                  const percentComplete = Number(contract.percentComplete);
                  let statusBadge = <Badge variant="outline">No Invoices</Badge>;
                  if (percentComplete > 0 && percentComplete < 100) {
                    statusBadge = <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
                  } else if (percentComplete >= 100) {
                    statusBadge = <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Complete</Badge>;
                  }

                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contract.subs?.name}</p>
                          <p className="text-xs text-muted-foreground">{contract.subs?.trades?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${contract.contract_value.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <div>${contract.amount_billed?.toLocaleString() || 0}</div>
                          <div className="text-xs text-muted-foreground">
                            / ${contract.amount_paid?.toLocaleString() || 0} paid
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {contract.retention_held > 0 ? (
                          <span className="text-sm font-medium text-orange-600">
                            ${contract.retention_held.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">$0</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* F) QUICK ACTIONS ROW */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/schedule?project=${projectId}`)}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Workers
            </Button>
            <Button variant="outline" onClick={() => navigate(`/daily-log?project=${projectId}`)}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Add Time Log
            </Button>
            <Button variant="outline" onClick={() => navigate(`/materials?project=${projectId}`)}>
              <Briefcase className="h-4 w-4 mr-2" />
              Add Material Receipt
            </Button>
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}?tab=subs`)}>
              <FileText className="h-4 w-4 mr-2" />
              Add Sub Invoice
            </Button>
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}?tab=financials`)}>
              <DollarSign className="h-4 w-4 mr-2" />
              View Financials
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Universal Day Detail Dialog */}
      <UniversalDayDetailDialog
        open={isDayDetailOpen}
        onOpenChange={setIsDayDetailOpen}
        date={selectedDate}
        onRefresh={() => {}}
        projectContext={projectId}
      />
    </div>
  );
}