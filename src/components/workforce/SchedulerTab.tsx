import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Users } from 'lucide-react';
import { MonthlyScheduleView } from '@/components/scheduling/MonthlyScheduleView';
import { WeeklyScheduleView } from '@/components/scheduling/WeeklyScheduleView';
import { AddToScheduleDialog } from '@/components/scheduling/AddToScheduleDialog';

export function SchedulerTab() {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Intelligent Scheduler</h3>
                <p className="text-sm text-muted-foreground">
                  Multi-worker planning with auto-sync and conflict detection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={view === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('weekly')}
              >
                Weekly
              </Button>
              <Button
                variant={view === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('monthly')}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Schedule Worker
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule View */}
      {view === 'weekly' ? (
        <WeeklyScheduleView 
          key={refreshKey}
          onScheduleClick={(date) => {
            // Open add dialog with pre-selected date
            setIsAddDialogOpen(true);
          }}
          refreshTrigger={refreshKey}
          scheduleType="all"
        />
      ) : (
        <MonthlyScheduleView 
          key={refreshKey}
          onDayClick={(date) => {
            // Open add dialog with pre-selected date
            setIsAddDialogOpen(true);
          }}
          refreshTrigger={refreshKey}
          scheduleType="all"
        />
      )}

      {/* Add Schedule Dialog */}
      <AddToScheduleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onScheduleCreated={() => {
          setRefreshKey(prev => prev + 1);
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
}
