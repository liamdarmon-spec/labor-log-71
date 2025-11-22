import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectCostsTabProps {
  projectId: string;
}

export function ProjectCostsTab({ projectId }: ProjectCostsTabProps) {
  // Category summary
  const { data: categorySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['costs-summary', projectId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id')
        .eq('project_id', projectId);

      const workerIds = [...new Set(logs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);
      const laborCost = logs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      return {
        labor: laborCost,
        subs: 0, // Placeholder
        materials: 0, // Placeholder
        misc: 0, // Placeholder
      };
    },
  });

  // Cost table (labor only for now)
  const { data: costEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ['cost-entries', projectId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('id, date, hours_worked, worker_id, cost_code_id, workers(name), cost_codes(code, name)')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(50);

      const workerIds = [...new Set(logs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);

      return logs?.map(log => ({
        id: log.id,
        date: log.date,
        type: 'Labor',
        source: log.workers?.name || 'Unknown',
        description: `${log.hours_worked}h logged`,
        costCode: log.cost_codes ? `${log.cost_codes.code} - ${log.cost_codes.name}` : 'Unassigned',
        amount: (log.hours_worked || 0) * (workerRateMap.get(log.worker_id) || 0),
      })) || [];
    },
  });

  if (loadingSummary || loadingEntries) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['labor', 'subs', 'materials', 'misc'].map((category) => {
              const amount = categorySummary?.[category as keyof typeof categorySummary] || 0;
              return (
                <Card key={category}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium capitalize mb-2">{category}</p>
                    <p className="text-2xl font-bold">${amount.toLocaleString()}</p>
                    {category !== 'labor' && (
                      <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Details</CardTitle>
        </CardHeader>
        <CardContent>
          {costEntries && costEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costEntries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.type}</Badge>
                    </TableCell>
                    <TableCell>{entry.source}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                    <TableCell className="text-sm">{entry.costCode}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${entry.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No cost entries yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
