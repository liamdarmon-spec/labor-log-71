import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleDialog } from "@/components/scheduling/ScheduleDialog";
import { BulkScheduleDialog } from "@/components/scheduling/BulkScheduleDialog";
import { DayDetailDialog } from "@/components/scheduling/DayDetailDialog";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";
import { DailyScheduleView } from "@/components/scheduling/DailyScheduleView";
import { MonthlyScheduleView } from "@/components/scheduling/MonthlyScheduleView";

type ViewMode = "daily" | "weekly" | "monthly";

const Schedule = () => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isBulkScheduleDialogOpen, setIsBulkScheduleDialogOpen] = useState(false);
  const [isDayDetailDialogOpen, setIsDayDetailDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");

  const handleScheduleClick = (date: Date) => {
    setScheduleDefaultDate(date);
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
            <Button
              variant="outline"
              onClick={() => setIsBulkScheduleDialogOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Schedule
            </Button>
            <Button onClick={() => setIsScheduleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Worker
            </Button>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "daily" && (
          <DailyScheduleView
            onScheduleClick={handleScheduleClick}
            refreshTrigger={scheduleRefresh}
          />
        )}

        {viewMode === "weekly" && (
          <WeeklyScheduleView 
            onScheduleClick={handleScheduleClick}
            refreshTrigger={scheduleRefresh}
          />
        )}

        {viewMode === "monthly" && (
          <MonthlyScheduleView
            onDayClick={handleDayClick}
            refreshTrigger={scheduleRefresh}
          />
        )}

        <ScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          onScheduleCreated={handleScheduleCreated}
          defaultDate={scheduleDefaultDate}
        />

        <BulkScheduleDialog
          open={isBulkScheduleDialogOpen}
          onOpenChange={setIsBulkScheduleDialogOpen}
          onScheduleCreated={handleScheduleCreated}
          defaultDate={scheduleDefaultDate}
        />

        <DayDetailDialog
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