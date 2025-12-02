import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays } from "lucide-react";
import { AddToScheduleDialog } from "@/components/scheduling/AddToScheduleDialog";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";
import { DailyScheduleView } from "@/components/scheduling/DailyScheduleView";
import { MonthlyScheduleView } from "@/components/scheduling/MonthlyScheduleView";
import { ScheduleFilters, ScheduleFiltersState } from "@/components/schedule/ScheduleFilters";

type ViewMode = "daily" | "weekly" | "monthly";
type ScheduleType = "workers" | "subs" | "meetings" | "all";

const Schedule = () => {
  const [searchParams] = useSearchParams();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("all");
  const [filters, setFilters] = useState<ScheduleFiltersState>({
    projectId: searchParams.get('projectId') || null,
    workerId: null,
  });

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

  return (
    <Layout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                Schedule
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Company-wide calendar for crews, subs, and key events.
              </p>
            </div>
            <Button onClick={() => setIsScheduleDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
          
          <ScheduleFilters
            projectId={filters.projectId}
            workerId={filters.workerId}
            onChange={handleFiltersChange}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)} className="w-full">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:max-w-md sm:grid-cols-4">
                <TabsTrigger value="workers" className="text-xs sm:text-sm whitespace-nowrap">Workers</TabsTrigger>
                <TabsTrigger value="subs" className="text-xs sm:text-sm whitespace-nowrap">Subs</TabsTrigger>
                <TabsTrigger value="meetings" className="text-xs sm:text-sm whitespace-nowrap">Meetings</TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className={viewMode === "daily" ? "block" : "hidden"}>
          <DailyScheduleView
            onScheduleClick={(date) => handleScheduleClick(date)}
            refreshTrigger={scheduleRefresh}
            scheduleType={scheduleType}
          />
        </div>

        <div className={viewMode === "weekly" ? "block" : "hidden"}>
          <WeeklyScheduleView 
            onScheduleClick={(date) => handleScheduleClick(date)}
            refreshTrigger={scheduleRefresh}
            scheduleType={scheduleType}
          />
        </div>

        <div className={viewMode === "monthly" ? "block" : "hidden"}>
          <MonthlyScheduleView
            onDayClick={(date) => handleScheduleClick(date)}
            refreshTrigger={scheduleRefresh}
            scheduleType={scheduleType}
          />
        </div>

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
