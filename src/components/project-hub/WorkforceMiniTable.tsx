import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';

interface WorkforceMiniTableProps {
  projectId: string;
}

export function WorkforceMiniTable({ projectId }: WorkforceMiniTableProps) {
  const navigate = useNavigate();
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['workforce-mini', projectId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from('time_logs')
        .select('worker_id, hours_worked, labor_cost, payment_status')
        .eq('project_id', projectId)
        .gte('date', sevenDaysAgo);

      const workerStats = new Map<string, { hours: number; unpaid: number }>();
      logs?.forEach(log => {
        const current = workerStats.get(log.worker_id) || { hours: 0, unpaid: 0 };
        current.hours += log.hours_worked || 0;
        if (log.payment_status !== 'paid') {
          current.unpaid += log.labor_cost || 0;
        }
        workerStats.set(log.worker_id, current);
      });

      if (workerStats.size === 0) return [];

      const workerIds = Array.from(workerStats.keys());
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, trades(name)')
        .in('id', workerIds);

      return workers?.map(w => ({
        id: w.id,
        name: w.name,
        trade: w.trades?.name || '—',
        hours: workerStats.get(w.id)?.hours || 0,
        unpaid: workerStats.get(w.id)?.unpaid || 0,
      })).sort((a, b) => b.hours - a.hours).slice(0, 6) || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate(`?tab=labor`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Workforce (Last 7 Days)
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs h-9">Worker</TableHead>
                  <TableHead className="text-xs h-9">Trade</TableHead>
                  <TableHead className="text-xs h-9 text-right">Hours</TableHead>
                  <TableHead className="text-xs h-9 text-right">Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((worker) => (
                  <TableRow key={worker.id} className="hover:bg-muted/50">
                    <TableCell className="py-2.5 font-medium text-sm">{worker.name}</TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">{worker.trade}</TableCell>
                    <TableCell className="py-2.5 text-sm text-right">{worker.hours.toFixed(1)}h</TableCell>
                    <TableCell className="py-2.5 text-right">
                      {worker.unpaid > 0 ? (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          ${worker.unpaid.toLocaleString()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground text-center py-4">
              No labor logged in the last 7 days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
