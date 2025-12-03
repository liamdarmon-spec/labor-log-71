import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { AddToScheduleDialog } from "@/components/scheduling/AddToScheduleDialog";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";
import { MonthlyScheduleView } from "@/components/scheduling/MonthlyScheduleView";
import { ScheduleFilters, ScheduleFiltersState } from "@/components/schedule/ScheduleFilters";
import { ScheduleSummaryBar } from "@/components/schedule/ScheduleSummaryBar";
import { useSchedulerData } from "@/lib/scheduler/useSchedulerData";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ViewMode = "weekly" | "monthly";
type ScheduleType = "workers" | "subs" | "meetings" | "all";

const Schedule = () => {
  const [searchParams] = useSearchParams();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<ScheduleFiltersState>({
    projectId: searchParams.get('projectId') || null,
    workerId: null,
  });

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "weekly") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start, end };
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end };
    }
  }, [viewMode, currentDate]);

  // Fetch summary data for the KPI bar
  const { days, loading } = useSchedulerData({
    viewMode: viewMode === "weekly" ? "week" : "month",
    filter: scheduleType,
    startDate: dateRange.start,
    endDate: dateRange.end,
    projectId: filters.projectId || undefined,
    refreshTrigger: scheduleRefresh,
  });

  // Calculate totals from days data
  const totals = useMemo(() => {
    return days.reduce(
      (acc, day) => ({
        workers: acc.workers + day.totalWorkers,
        hours: acc.hours + day.totalHours,
        subs: acc.subs + day.totalSubs,
        meetings: acc.meetings + day.totalMeetings,
      }),
      { workers: 0, hours: 0, subs: 0, meetings: 0 }
    );
  }, [days]);

  // Sync filters from URL params
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId && urlProjectId !== filters.projectId) {
      setFilters(prev => ({ ...prev, projectId: urlProjectId }));
    }
  }, [searchParams]);

  const handleScheduleClick = (date?: Date) => {
    if (date) {
      setScheduleDefaultDate(date);
    }
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleCreated = () => {
    setScheduleRefresh(prev => prev + 1);
  };

  const handleFiltersChange = (newFilters: ScheduleFiltersState) => {
    setFilters(newFilters);
    setScheduleRefresh(prev => prev + 1);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === "weekly") {
      setCurrentDate(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
    } else {
      setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const periodLabel = viewMode === "weekly" 
    ? `Week of ${format(dateRange.start, "MMM d")}`
    : format(currentDate, "MMMM yyyy");

  const summaryPeriodLabel = viewMode === "weekly" ? "this week" : "this month";

  // Build active filter chips
  const activeFilters: string[] = [];
  if (scheduleType !== "all") {
    activeFilters.push(scheduleType === "workers" ? "Workers" : scheduleType === "subs" ? "Subs" : "Events");
  }
  if (filters.projectId) {
    activeFilters.push("Project filtered");
  }
  if (filters.workerId) {
    activeFilters.push("Person filtered");
  }

  return (
    <Layout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Schedule
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Company-wide calendar for crews, subs, and events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToToday}
              className="text-xs"
            >
              Today
            </Button>
            <Button onClick={() => setIsScheduleDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add to Schedule</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Summary Bar */}
        <ScheduleSummaryBar
          totalWorkers={totals.workers}
          totalHours={totals.hours}
          totalSubs={totals.subs}
          totalMeetings={totals.meetings}
          periodLabel={summaryPeriodLabel}
          loading={loading}
        />

        {/* Unified Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          {/* Type Filter */}
          <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="workers">Workers</SelectItem>
              <SelectItem value="subs">Subs</SelectItem>
              <SelectItem value="meetings">Events</SelectItem>
            </SelectContent>
          </Select>

          {/* Project & Person Filters */}
          <div className="flex-1">
            <ScheduleFilters
              projectId={filters.projectId}
              workerId={filters.workerId}
              onChange={handleFiltersChange}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-input">
            <button
              onClick={() => setViewMode("weekly")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "weekly" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "monthly" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Month
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Showing:</span>
            {activeFilters.map((filter) => (
              <Badge key={filter} variant="secondary" className="text-xs">
                {filter}
              </Badge>
            ))}
          </div>
        )}

        {/* Period Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigatePeriod('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm sm:text-base font-semibold min-w-[160px] sm:min-w-[200px] text-center">
              {periodLabel}
            </h3>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigatePeriod('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === "weekly" ? (
          <WeeklyScheduleView 
            onScheduleClick={(date) => handleScheduleClick(date)}
            refreshTrigger={scheduleRefresh}
            scheduleType={scheduleType}
            currentWeekStart={startOfWeek(currentDate, { weekStartsOn: 0 })}
          />
        ) : (
          <MonthlyScheduleView
            onDayClick={(date) => handleScheduleClick(date)}
            refreshTrigger={scheduleRefresh}
            scheduleType={scheduleType}
            currentMonth={currentDate}
          />
        )}

        <AddToScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          onScheduleCreated={handleScheduleCreated}
          defaultDate={scheduleDefaultDate}
        />
      </div>
    </Layout>
  );
};

export default Schedule;
