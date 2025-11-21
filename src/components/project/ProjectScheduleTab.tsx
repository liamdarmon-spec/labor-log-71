import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Clock, User, AlertCircle, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { UniversalDayDetailDialog } from '@/components/scheduling/UniversalDayDetailDialog';
import { useScheduleConflicts } from '@/hooks/useScheduleConflicts';
import { ProjectScheduleCalendar } from './ProjectScheduleCalendar';

interface ScheduleEntry {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  status: string;
  notes: string | null;
  workers?: { name: string; trade: string } | null;
}

interface WorkerConflicts {
  [workerId: string]: {
    date: string;
    hasConflicts: boolean;
    scheduleCount: number;
    projectNames: string[];
  };
}

export const ProjectScheduleTab = ({ projectId }: { projectId: string }) => {
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null);
  const [highlightWorkerId, setHighlightWorkerId] = useState<string | null>(null);

  const openDayDialog = (date: string, workerId?: string) => {
    // Parse date in local timezone to avoid timezone shift issues
    const [year, month, day] = date.split('-').map(Number);
    setDayDialogDate(new Date(year, month - 1, day));
    setHighlightWorkerId(workerId || null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Schedule</h3>
        </div>
        <ProjectScheduleCalendar projectId={projectId} />
      </div>

      <UniversalDayDetailDialog
        open={!!dayDialogDate}
        onOpenChange={(open) => {
          if (!open) {
            setDayDialogDate(null);
            setHighlightWorkerId(null);
          }
        }}
        date={dayDialogDate}
        onRefresh={() => {}}
        onAddSchedule={() => {}}
        highlightWorkerId={highlightWorkerId}
        projectContext={projectId}
      />
    </>
  );
};