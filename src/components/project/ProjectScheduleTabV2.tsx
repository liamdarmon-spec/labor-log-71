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
import { format } from 'date-fns';

interface ProjectScheduleTabV2Props {
  projectId: string;
}

export function ProjectScheduleTabV2({ projectId }: ProjectScheduleTabV2Props) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('month');

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

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDate(today);
    // You can decide if "Today" should also open the day planner or not.
    // For now, just update the active view so user can see today in context.
    setActiveTab('day');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Project Schedule
              </CardTitle>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium">Focus date:</span>
                  {format(selectedDate, 'EEE, MMM d, yyyy')}
                </span>
                <span className="hidden sm:inline text-muted-foreground">
                  • Click any day/slot to open the full-day planner.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
              >
                Today
              </Button>
              <Button size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'day' | 'week' | 'month')}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>

            {/* DAY VIEW – great for “today” + tight coordination */}
            <TabsContent value="day" className="space-y-4">
              <DailyScheduleView
                onScheduleClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="all"
              />
            </TabsContent>

            {/* WEEK VIEW – primary project-level coordination */}
            <TabsContent value="week" className="space-y-4">
              <WeeklyScheduleView
                onScheduleClick={handleScheduleClick}
                refreshTrigger={refreshTrigger}
                scheduleType="all"
                projectId={projectId}
              />
            </TabsContent>

            {/* MONTH VIEW – long-range planning */}
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

      {/* Quick “add to schedule” from anywhere on this tab */}
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

      {/* Deep dive into a single day, tied to this project */}
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
