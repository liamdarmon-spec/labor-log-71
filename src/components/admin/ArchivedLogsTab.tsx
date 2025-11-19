import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RotateCcw, Search, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ArchivedLog {
  id: string;
  original_id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  archived_at: string;
}

interface Worker {
  id: string;
  name: string;
  trade: string;
}

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface Trade {
  id: string;
  name: string;
}

export const ArchivedLogsTab = () => {
  const [archivedLogs, setArchivedLogs] = useState<ArchivedLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ArchivedLog[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [archivedLogs, searchDate]);

  const fetchData = async () => {
    const [logsResult, workersResult, projectsResult, tradesResult] = await Promise.all([
      supabase
        .from('archived_daily_logs')
        .select('*')
        .order('archived_at', { ascending: false }),
      supabase.from('workers').select('id, name, trade'),
      supabase.from('projects').select('id, project_name, client_name'),
      supabase.from('trades').select('id, name'),
    ]);

    if (logsResult.error) {
      toast({
        title: 'Error',
        description: 'Failed to load archived logs',
        variant: 'destructive',
      });
    } else {
      setArchivedLogs(logsResult.data || []);
    }

    if (workersResult.data) setWorkers(workersResult.data);
    if (projectsResult.data) setProjects(projectsResult.data);
    if (tradesResult.data) setTrades(tradesResult.data);
  };

  const filterLogs = () => {
    let filtered = archivedLogs;

    if (searchDate) {
      filtered = filtered.filter((log) => log.date.includes(searchDate));
    }

    setFilteredLogs(filtered);
  };

  const handleRestore = async (log: ArchivedLog) => {
    if (!confirm('Restore this time entry back to active logs?')) return;

    // Restore to daily_logs
    const { error: insertError } = await supabase
      .from('daily_logs')
      .insert({
        date: log.date,
        hours_worked: log.hours_worked,
        notes: log.notes,
        worker_id: log.worker_id,
        project_id: log.project_id,
        trade_id: log.trade_id,
      });

    if (insertError) {
      toast({
        title: 'Error',
        description: 'Failed to restore log',
        variant: 'destructive',
      });
      return;
    }

    // Delete from archived_logs
    const { error: deleteError } = await supabase
      .from('archived_daily_logs')
      .delete()
      .eq('id', log.id);

    if (deleteError) {
      toast({
        title: 'Warning',
        description: 'Log restored but failed to remove from archive',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Log restored successfully',
      });
    }

    fetchData();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this archived log? This cannot be undone.')) return;

    const { error } = await supabase
      .from('archived_daily_logs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete archived log',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Archived log permanently deleted',
      });
      fetchData();
    }
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    return worker ? worker.name : 'Unknown';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.project_name : 'Unknown';
  };

  const getTradeName = (tradeId: string | null) => {
    if (!tradeId) return '-';
    const trade = trades.find((t) => t.id === tradeId);
    return trade ? trade.name : '-';
  };

  const getTimeRemaining = (archivedAt: string) => {
    const deletionTime = new Date(archivedAt).getTime() + 24 * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = deletionTime - now;
    
    if (remaining <= 0) return 'Deleting soon...';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archived Logs</CardTitle>
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Deleted logs are stored here for 24 hours before permanent deletion. You can restore them during this time.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-date">Filter by Date</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-date"
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No archived logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{getWorkerName(log.worker_id)}</TableCell>
                    <TableCell>{getTradeName(log.trade_id)}</TableCell>
                    <TableCell>{getProjectName(log.project_id)}</TableCell>
                    <TableCell>{log.hours_worked}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                    <TableCell>
                      {new Date(log.archived_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTimeRemaining(log.archived_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(log)}
                          className="gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePermanentDelete(log.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
