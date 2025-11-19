import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScheduleDialog } from "@/components/scheduling/ScheduleDialog";
import { WeeklyScheduleView } from "@/components/scheduling/WeeklyScheduleView";

const Schedule = () => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  const handleScheduleClick = (date: Date) => {
    setScheduleDefaultDate(date);
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleCreated = () => {
    setScheduleRefresh(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Plan worker assignments for upcoming projects
            </p>
          </div>
          <Button onClick={() => setIsScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Worker
          </Button>
        </div>

        <WeeklyScheduleView 
          onScheduleClick={handleScheduleClick}
          refreshTrigger={scheduleRefresh}
        />

        <ScheduleDialog
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