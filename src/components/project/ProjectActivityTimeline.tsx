import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, DollarSign, User, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ActivityEntry {
  log_id: string;
  worker_id: string;
  date: string;
  hours_worked: number;
  cost: number;
  notes: string | null;
  worker_name: string | null;
  worker_trade: string | null;
  schedule_id: string | null;
}

interface GroupedActivity {
  date: string;
  entries: ActivityEntry[];
  totalHours: number;
  totalCost: number;
}

export const ProjectActivityTimeline = ({ projectId }: { projectId: string }) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('project_activity_view')
        .select('*')
        .eq('project_id', projectId)
        .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  // Group activities by date
  const groupedActivities: GroupedActivity[] = activities.reduce((acc, activity) => {
    const existing = acc.find(g => g.date === activity.date);
    if (existing) {
      existing.entries.push(activity);
      existing.totalHours += Number(activity.hours_worked);
      existing.totalCost += Number(activity.cost);
    } else {
      acc.push({
        date: activity.date,
        entries: [activity],
        totalHours: Number(activity.hours_worked),
        totalCost: Number(activity.cost),
      });
    }
    return acc;
  }, [] as GroupedActivity[]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedActivities.length === 0 ? (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">
            No activity logged for this project in the last 30 days
          </p>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>

          {/* Activity entries */}
          <div className="space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.date} className="relative pl-16">
                {/* Date marker */}
                <div className="absolute left-0 top-0 flex items-center">
                  <div className="w-16 pr-4 text-right">
                    <div className="text-xs font-medium">{format(parseISO(group.date), 'MMM d')}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(group.date), 'EEE')}</div>
                  </div>
                  <div className="absolute left-[30px] w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
                </div>

                {/* Day summary card */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{format(parseISO(group.date), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {group.totalHours.toFixed(1)}h total
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${group.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Individual entries */}
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    {group.entries.map((entry) => (
                      <div key={entry.log_id} className="pl-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">{entry.worker_name || 'Unknown Worker'}</span>
                              {entry.worker_trade && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.worker_trade}
                                </Badge>
                              )}
                              {entry.schedule_id && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Synced
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {entry.hours_worked}h
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ${Number(entry.cost).toFixed(2)}
                              </span>
                            </div>

                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};