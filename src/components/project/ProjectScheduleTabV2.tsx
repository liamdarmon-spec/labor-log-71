import { useState } from 'react';
import { MonthlyScheduleView } from '@/components/scheduling/MonthlyScheduleView';
import { WeeklyScheduleView } from '@/components/scheduling/WeeklyScheduleView';
import { DailyScheduleView } from '@/components/scheduling/DailyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus } from 'lucide-react';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';
import { Button } from '@/components/ui/button';
import { FullDayPlanner } from '@/components/scheduling/FullDayPlanner';

interface ProjectScheduleTabV2Props {
  projectId: string;
}

export function ProjectScheduleTabV2({ projectId }: ProjectScheduleTabV2Props) {
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

  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Schedule
            </CardTitle>
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="month" className="space-y-4">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="space-y-4">
              <DailyScheduleView
                onScheduleClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="all"
              />
            </TabsContent>

            <TabsContent value="week" className="space-y-4">
              <WeeklyScheduleView
                onScheduleClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="all"
                projectId={projectId}
              />
            </TabsContent>

            <TabsContent value="month" className="space-y-4">
              <MonthlyScheduleView
                onDayClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="all"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddToScheduleDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            handleRefresh();
          }
        }}
        onScheduleCreated={handleRefresh}
      />

      <FullDayPlanner
        open={dayPlannerOpen}
        onOpenChange={setDayPlannerOpen}
        date={selectedDate}
        projectId={projectId}
        projectContext={projectId}
        onRefresh={handleRefresh}
        onAddSchedule={handleAddClick}
      />
    </>
  );
}
