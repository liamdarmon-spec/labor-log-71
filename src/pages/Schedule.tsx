import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToScheduleDialog } from "@/components/scheduling/AddToScheduleDialog";
import { MasterScheduleModal } from "@/components/scheduling/MasterScheduleModal";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";
import { DailyScheduleView } from "@/components/scheduling/DailyScheduleView";
import { MonthlyScheduleView } from "@/components/scheduling/MonthlyScheduleView";

type ViewMode = "daily" | "weekly" | "monthly";
type ScheduleType = "workers" | "subs" | "meetings" | "all";

const Schedule = () => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
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
    setIsMasterModalOpen(true);
  };

  const handleScheduleCreated = () => {
    setScheduleRefresh(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Schedule</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Plan worker assignments
              </p>
            </div>
            <Button onClick={() => setIsScheduleDialogOpen(true)} size="sm" className="md:hidden">
              <Plus className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsScheduleDialogOpen(true)} className="hidden md:flex">
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
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

        <MasterScheduleModal
          open={isMasterModalOpen}
          onOpenChange={setIsMasterModalOpen}
          date={selectedDay}
          context="global"
          onRefresh={handleScheduleCreated}
          onAddSchedule={() => {
            setIsMasterModalOpen(false);
            handleScheduleClick(selectedDay || undefined);
          }}
        />
      </div>
    </Layout>
  );
};

export default Schedule;