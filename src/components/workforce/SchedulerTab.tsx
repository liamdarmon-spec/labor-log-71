import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, addDays, isSameDay } from 'date-fns';
import { SchedulerTableView } from './SchedulerTableView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';

interface Worker {
  id: string;
  name: string;
  trade: string;
  hourly_rate: number;
  company_name?: string;
}

export function SchedulerTab() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [showOnlyScheduled, setShowOnlyScheduled] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch trades
  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data } = await supabase.from('trades').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch workers with their schedules and logs for the week
  const { data: workersData, isLoading } = useQuery({
    queryKey: ['workforce-scheduler', format(weekStart, 'yyyy-MM-dd'), selectedCompany, selectedTrade, showOnlyScheduled],
    queryFn: async () => {
      let workersQuery = supabase
        .from('workers')
        .select('id, name, trade, trade_id, hourly_rate, active')
        .eq('active', true);

      if (selectedTrade !== 'all') {
        workersQuery = workersQuery.eq('trade_id', selectedTrade);
      }

      const { data: workers } = await workersQuery.order('name');
      if (!workers) return [];

      // Fetch scheduled hours for this week
      const { data: schedules } = await supabase
        .from('scheduled_shifts')
        .select('worker_id, scheduled_date, scheduled_hours, project_id, projects(project_name, company_id, companies(name))')
        .in('worker_id', workers.map(w => w.id))
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      // Fetch logged hours for this week
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('worker_id, date, hours_worked')
        .in('worker_id', workers.map(w => w.id))
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      // Calculate totals and filter by company
      const workersWithTotals = workers.map(worker => {
        const workerSchedules = schedules?.filter(s => s.worker_id === worker.id) || [];
        const workerLogs = logs?.filter(l => l.worker_id === worker.id) || [];

        // Infer company from most recent schedule
        const mostRecentSchedule = workerSchedules[0];
        const companyName = mostRecentSchedule?.projects?.companies?.name;

        const scheduledHours = workerSchedules.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);
        const loggedHours = workerLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);

        return {
          ...worker,
          company_name: companyName,
          scheduled_hours_week: scheduledHours,
          logged_hours_week: loggedHours,
          schedules: workerSchedules,
        };
      });

      // Apply filters
      let filtered = workersWithTotals;

      if (selectedCompany !== 'all') {
        filtered = filtered.filter(w => {
          const hasScheduleInCompany = w.schedules.some(
            s => s.projects?.company_id === selectedCompany
          );
          return hasScheduleInCompany;
        });
      }

      if (showOnlyScheduled) {
        filtered = filtered.filter(w => w.scheduled_hours_week > 0);
      }

      return filtered;
    },
  });

  // Fetch schedule details for selected worker OR aggregate data
  const { data: workerWeekSchedule } = useQuery({
    queryKey: ['worker-week-schedule', selectedWorker?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedWorker) return null;

      const { data } = await supabase
        .from('scheduled_shifts')
        .select('*, projects(project_name, company_id)')
        .eq('worker_id', selectedWorker.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      // Group by date
      const byDate = new Map<string, any[]>();
      data?.forEach(shift => {
        const dateKey = shift.scheduled_date;
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey)!.push(shift);
      });

      return byDate;
    },
    enabled: !!selectedWorker,
  });

  // Fetch aggregate schedule data for all workers (when no worker selected)
  const { data: aggregateSchedule } = useQuery({
    queryKey: ['aggregate-schedule', format(weekStart, 'yyyy-MM-dd'), selectedCompany, selectedTrade],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_shifts')
        .select('*, workers(id, name), projects(project_name, company_id)')
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      if (selectedTrade !== 'all') {
        query = query.eq('trade_id', selectedTrade);
      }

      const { data } = await query;

      // Group by date
      const byDate = new Map<string, { workers: Set<string>; hours: number; entries: any[] }>();
      data?.forEach(shift => {
        const dateKey = shift.scheduled_date;
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { workers: new Set(), hours: 0, entries: [] });
        }
        const day = byDate.get(dateKey)!;
        day.workers.add(shift.worker_id);
        day.hours += shift.scheduled_hours;
        day.entries.push(shift);
      });

      return byDate;
    },
    enabled: !selectedWorker,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Workforce Scheduler</h3>
        <p className="text-muted-foreground">
          People-first weekly planner showing where everyone is scheduled
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
            </div>

            {/* Filters */}
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTrade} onValueChange={setSelectedTrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showOnlyScheduled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyScheduled(!showOnlyScheduled)}
            >
              Show Only Scheduled
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'table')} className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="m-0">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Worker List */}
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
          {workersData?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No workers match the current filters</p>
              </CardContent>
            </Card>
          ) : (
            workersData?.map(worker => (
              <Card
                key={worker.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedWorker?.id === worker.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedWorker(worker)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{worker.name}</p>
                          <p className="text-sm text-muted-foreground">{worker.trade}</p>
                          {worker.company_name && (
                            <Badge variant="outline" className="mt-1">
                              {worker.company_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">${worker.hourly_rate}/hr</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Scheduled</p>
                          <p className="font-semibold text-blue-600">
                            {worker.scheduled_hours_week.toFixed(1)}h
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Logged</p>
                          <p className="font-semibold text-green-600">
                            {worker.logged_hours_week.toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Weekly Grid */}
        <div className="lg:col-span-2">
          {selectedWorker ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {selectedWorker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {selectedWorker.name}'s Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const daySchedules = workerWeekSchedule?.get(dateKey) || [];
                    const totalHours = daySchedules.reduce((sum, s) => sum + s.scheduled_hours, 0);
                    const projects = [...new Set(daySchedules.map(s => s.projects?.project_name))];
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(day);
                        }}
                        className={`p-3 rounded-lg border text-left hover:border-primary hover:bg-accent transition-all ${
                          isToday ? 'bg-primary/5 border-primary' : ''
                        }`}
                      >
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-lg font-bold mb-2">
                          {format(day, 'd')}
                        </div>
                        {totalHours > 0 ? (
                          <>
                            <div className="text-sm font-semibold text-primary mb-1">
                              {totalHours}h
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {projects.slice(0, 2).map((project, i) => (
                                <div key={i} className="truncate">{project}</div>
                              ))}
                              {projects.length > 2 && (
                                <div className="text-xs">+{projects.length - 2} more</div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">No schedule</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Team Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayData = aggregateSchedule?.get(dateKey);
                    const workerCount = dayData?.workers.size || 0;
                    const totalHours = dayData?.hours || 0;
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(day);
                        }}
                        className={`p-3 rounded-lg border text-left hover:border-primary hover:bg-accent transition-all ${
                          isToday ? 'bg-primary/5 border-primary' : ''
                        }`}
                      >
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-lg font-bold mb-2">
                          {format(day, 'd')}
                        </div>
                        {workerCount > 0 ? (
                          <>
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary mb-1">
                              <Users className="h-3 w-3" />
                              {workerCount} workers
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {totalHours.toFixed(1)}h scheduled
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">No schedule</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
          </div>
        </TabsContent>

        <TabsContent value="table" className="m-0">
          <SchedulerTableView
            weekStart={weekStart}
            weekEnd={weekEnd}
            selectedCompany={selectedCompany}
            selectedTrade={selectedTrade}
            onViewDay={(date, workerId) => {
              setSelectedDate(date);
              setSelectedWorker(workersData?.find(w => w.id === workerId) || null);
            }}
            onViewTimeLog={(workerId, date, projectId) => {
              navigate(`/workforce?tab=activity&view=time-logs&worker=${workerId}&date=${date}&project=${projectId}`);
            }}
            refreshTrigger={scheduleRefresh}
          />
        </TabsContent>
      </Tabs>

      {/* Unified Schedule Day Drawer */}
      <UniversalDayDetailDialog
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDate(null);
            setSelectedWorker(null);
          }
        }}
        date={selectedDate}
        onRefresh={() => setScheduleRefresh(prev => prev + 1)}
        onAddSchedule={() => {
          if (selectedDate) {
            setScheduleDefaultDate(selectedDate);
          }
          setIsAddScheduleOpen(true);
        }}
        highlightWorkerId={selectedWorker?.id}
      />

      {/* Add Schedule Dialog */}
      <AddToScheduleDialog
        open={isAddScheduleOpen}
        onOpenChange={setIsAddScheduleOpen}
        onScheduleCreated={() => setScheduleRefresh(prev => prev + 1)}
        defaultDate={scheduleDefaultDate}
      />
    </div>
  );
}
