import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { format, isFuture, isPast, isToday } from 'date-fns';

interface SubScheduleTabProps {
  subId: string;
}

export function SubScheduleTab({ subId }: SubScheduleTabProps) {
  // Fetch sub_scheduled_shifts for this sub across all projects
  const { data: scheduleEntries, isLoading } = useQuery({
    queryKey: ['sub-schedule', subId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_scheduled_shifts')
        .select(`
          *,
          projects (id, project_name, address),
          subs (name, company_name)
        `)
        .eq('sub_id', subId)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Separate upcoming and past
  const today = new Date();
  const upcoming = scheduleEntries?.filter(e => isFuture(new Date(e.scheduled_date)) || isToday(new Date(e.scheduled_date))) || [];
  const past = scheduleEntries?.filter(e => isPast(new Date(e.scheduled_date)) && !isToday(new Date(e.scheduled_date))) || [];

  const getDateBadge = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) {
      return <Badge variant="default">Today</Badge>;
    } else if (isFuture(d)) {
      return <Badge variant="outline">Upcoming</Badge>;
    } else {
      return <Badge variant="secondary">Past</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Schedule ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                        <div className="font-medium">{format(new Date(entry.scheduled_date), 'EEE, MMM d, yyyy')}</div>
                          {getDateBadge(entry.scheduled_date)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.projects?.project_name}</div>
                        {entry.projects?.address && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {entry.projects.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {entry.notes || <span className="text-muted-foreground">No description</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'confirmed' ? 'default' : 'outline'}>
                        {entry.status || 'scheduled'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming schedule</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Schedule */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Schedule ({past.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.slice(0, 10).map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(entry.scheduled_date), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.projects?.project_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {entry.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {past.length > 10 && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Showing 10 of {past.length} past entries
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
