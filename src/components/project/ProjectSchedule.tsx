import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ScheduleEntry {
  id: string;
  worker_id: string;
  scheduled_date: string;
  scheduled_hours: number;
  status: string;
  notes: string | null;
  workers?: { name: string; trade: string } | null;
  trades?: { name: string } | null;
}

export const ProjectSchedule = ({ projectId }: { projectId: string }) => {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, [projectId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_schedule_view')
        .select('*, workers(name, trade), trades(name)')
        .eq('project_id', projectId)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'synced':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'split_modified':
      case 'split_created':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Shifts (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No scheduled shifts for this project this month
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <User className="w-4 h-4" />
                        {schedule.workers?.name || 'Unknown Worker'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {schedule.workers?.trade || schedule.trades?.name || 'No Trade'}
                      </Badge>
                      <Badge className={getStatusColor(schedule.status)} variant="outline">
                        {schedule.status || 'planned'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(schedule.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {schedule.scheduled_hours}h
                      </span>
                    </div>

                    {schedule.notes && (
                      <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
