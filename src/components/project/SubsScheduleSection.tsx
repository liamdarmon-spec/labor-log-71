import { WeeklyScheduleView } from '@/components/scheduling/WeeklyScheduleView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { FullDayPlanner } from '@/components/scheduling/FullDayPlanner';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';

interface SubsScheduleSectionProps {
  projectId: string;
}

export function SubsScheduleSection({ projectId }: SubsScheduleSectionProps) {
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayPlannerOpen(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subs Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Week view of subcontractor schedules for this project
          </p>
          
          <WeeklyScheduleView
            onScheduleClick={handleDayClick}
            refreshTrigger={refreshTrigger}
            scheduleType="all"
            projectId={projectId}
          />
        </CardContent>
      </Card>

      <FullDayPlanner
        open={dayPlannerOpen}
        onOpenChange={setDayPlannerOpen}
        date={selectedDate}
        projectId={projectId}
        scheduleType="sub"
        projectContext={projectId}
        onRefresh={handleRefresh}
        onAddSchedule={() => setAddDialogOpen(true)}
      />

      <AddToScheduleDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onScheduleCreated={handleRefresh}
      />
    </>
  );
}
