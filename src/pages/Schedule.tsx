import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToScheduleDialog } from "@/components/scheduling/AddToScheduleDialog";
import { UniversalDayDetailDialog } from "@/components/scheduling/UniversalDayDetailDialog";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";
import { DailyScheduleView } from "@/components/scheduling/DailyScheduleView";
import { MonthlyScheduleView } from "@/components/scheduling/MonthlyScheduleView";

type ViewMode = "daily" | "weekly" | "monthly";
type ScheduleType = "workers" | "subs" | "meetings" | "all";

const Schedule = () => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDayDetailDialogOpen, setIsDayDetailDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("all");

  const handleScheduleClick = (date?: Date) => {
    if (date) {
      setScheduleDefaultDate(date);
    }
    setIsScheduleDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setIsDayDetailDialogOpen(true);
  };

  const handleScheduleCreated = () => {
    setScheduleRefresh(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Plan worker assignments for upcoming projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsScheduleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="workers">Workers</TabsTrigger>
              <TabsTrigger value="subs">Subs</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
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
            onDayClick={handleDayClick}
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

        <UniversalDayDetailDialog
          open={isDayDetailDialogOpen}
          onOpenChange={setIsDayDetailDialogOpen}
          date={selectedDay}
          onRefresh={handleScheduleCreated}
          onAddSchedule={handleScheduleClick}
        />
      </div>
    </Layout>
  );
};

export default Schedule;