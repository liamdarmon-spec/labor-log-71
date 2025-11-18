import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Search } from 'lucide-react';

interface DailyLog {
  id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  workers: { name: string; trade: string };
  projects: { project_name: string; client_name: string };
}

export const LogsTab = () => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DailyLog[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchWorker, setSearchWorker] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchDate, searchWorker, searchProject]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        workers (name, trade),
        projects (project_name, client_name)
      `)
      .order('date', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load logs',
        variant: 'destructive',
      });
    } else {
      setLogs(data || []);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchDate) {
      filtered = filtered.filter((log) => log.date.includes(searchDate));
    }

    if (searchWorker) {
      filtered = filtered.filter((log) =>
        log.workers.name.toLowerCase().includes(searchWorker.toLowerCase())
      );
    }

    if (searchProject) {
      filtered = filtered.filter((log) =>
        log.projects.project_name.toLowerCase().includes(searchProject.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return;

    const { error } = await supabase.from('daily_logs').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete log',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Log deleted successfully',
      });
      fetchLogs();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="search-worker">Filter by Worker</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search-worker"
                placeholder="Worker name..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-project">Filter by Project</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search-project"
                placeholder="Project name..."
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{log.workers.name}</TableCell>
                  <TableCell>{log.workers.trade}</TableCell>
                  <TableCell>{log.projects.project_name}</TableCell>
                  <TableCell>{log.projects.client_name}</TableCell>
                  <TableCell>{log.hours_worked}h</TableCell>
                  <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
