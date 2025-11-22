import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { WeeklyScheduleView } from '@/components/scheduling/WeeklyScheduleView';
import { MonthlyScheduleView } from '@/components/scheduling/MonthlyScheduleView';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { FullDayPlanner } from '@/components/scheduling/FullDayPlanner';

interface WorkerScheduleViewProps {
  workerId: string;
}

export function WorkerScheduleView({ workerId }: WorkerScheduleViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleScheduleClick = (date: Date) => {
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5" />
              Worker Schedule
            </CardTitle>
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="week" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="week" className="text-xs sm:text-sm">Week View</TabsTrigger>
              <TabsTrigger value="month" className="text-xs sm:text-sm">Month View</TabsTrigger>
            </TabsList>

            <TabsContent value="week" className="space-y-4">
              <WeeklyScheduleView
                onScheduleClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="workers"
              />
            </TabsContent>

            <TabsContent value="month" className="space-y-4">
              <MonthlyScheduleView
                onDayClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="workers"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddToScheduleDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) handleRefresh();
        }}
        onScheduleCreated={handleRefresh}
      />

      <FullDayPlanner
        open={dayPlannerOpen}
        onOpenChange={setDayPlannerOpen}
        date={selectedDate}
        onRefresh={handleRefresh}
        onAddSchedule={() => setAddDialogOpen(true)}
        scheduleType="labor"
      />
    </>
  );
}
