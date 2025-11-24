import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { FullDayPlanner } from '@/components/scheduling/FullDayPlanner';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useTradesSimple } from '@/hooks/useTrades';
import { useProjectsSimple } from '@/hooks/useProjects';

export function WorkforceScheduleTab() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Use centralized hooks with caching
  const { data: trades = [] } = useTradesSimple();
  const { data: projects = [] } = useProjectsSimple();

  // Fetch active workers
  const { data: workers } = useQuery({
    queryKey: ['workers-active', selectedTrade],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('id, name, trade, hourly_rate')
        .eq('active', true)
        .order('name');

      if (selectedTrade !== 'all') {
        query = query.eq('trade_id', selectedTrade);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch schedule data for the week
  const { data: schedules, isLoading: schedulesLoading, refetch } = useScheduleData({
    startDate: format(weekStart, 'yyyy-MM-dd'),
    endDate: format(weekEnd, 'yyyy-MM-dd'),
    companyId: selectedCompany,
    projectId: selectedProject !== 'all' ? selectedProject : undefined,
    type: 'labor',
  });

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleToday = () => setCurrentWeek(new Date());

  const handleCellClick = (workerId: string, date: Date) => {
    setSelectedWorkerId(workerId);
    setSelectedDate(date);
    setDayPlannerOpen(true);
  };

  const getSchedulesForWorkerAndDay = (workerId: string, date: Date) => {
    return schedules?.filter(s => 
      s.worker_id === workerId && 
      isSameDay(parseISO(s.scheduled_date), date)
    ) || [];
  };

  const getTotalHoursForDay = (workerId: string, date: Date) => {
    const daySchedules = getSchedulesForWorkerAndDay(workerId, date);
    return daySchedules.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);
  };

  if (schedulesLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Weekly Schedule</h3>
          <p className="text-sm text-muted-foreground">
            Plan and assign workers to projects
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Schedule
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 text-center">
            <Button variant="ghost" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b bg-muted/50">
              <div className="p-3 font-semibold border-r">Worker</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
                  <div className="font-semibold">{format(day, 'EEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                </div>
              ))}
            </div>

            {/* Worker Rows */}
            {workers && workers.length > 0 ? (
              workers.map(worker => (
                <div key={worker.id} className="grid grid-cols-8 border-b hover:bg-accent/50">
                  <div className="p-3 border-r flex flex-col justify-center">
                    <p className="font-medium text-sm">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{worker.trade}</p>
                  </div>
                  {weekDays.map(day => {
                    const daySchedules = getSchedulesForWorkerAndDay(worker.id, day);
                    const totalHours = getTotalHoursForDay(worker.id, day);

                    return (
                      <div
                        key={`${worker.id}-${day.toISOString()}`}
                        className="p-2 border-r last:border-r-0 cursor-pointer hover:bg-accent"
                        onClick={() => handleCellClick(worker.id, day)}
                      >
                        {daySchedules.length > 0 ? (
                          <div className="space-y-1">
                            {daySchedules.slice(0, 2).map(schedule => (
                              <Badge
                                key={schedule.id}
                                variant="outline"
                                className="text-xs truncate block"
                                title={schedule.project?.project_name}
                              >
                                {schedule.project?.project_name.substring(0, 12)}
                              </Badge>
                            ))}
                            {daySchedules.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{daySchedules.length - 2} more
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {totalHours}h
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p>No active workers found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}

      {selectedDate && dayPlannerOpen && (
        <FullDayPlanner
          open={dayPlannerOpen}
          onOpenChange={setDayPlannerOpen}
          date={selectedDate}
          highlightWorkerId={selectedWorkerId}
          companyId={selectedCompany !== 'all' ? selectedCompany : undefined}
          onRefresh={() => refetch()}
          onAddSchedule={() => {
            setDayPlannerOpen(false);
            setAddDialogOpen(true);
          }}
        />
      )}

      {/* AddToScheduleDialog with default date */}
      {addDialogOpen && (
        <AddToScheduleDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onScheduleCreated={() => refetch()}
          defaultDate={selectedDate || undefined}
        />
      )}
    </div>
  );
}
