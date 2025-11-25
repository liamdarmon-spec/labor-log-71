import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Users, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectSubsCalendar } from './ProjectSubsCalendar';

interface Sub {
  id: string;
  name: string;
  company_name: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  default_rate: number;
}

interface SubLog {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  subs: { name: string } | null;
}

interface SubOnProject {
  sub_id: string;
  sub_name: string;
  trade: string | null;
  total_amount: number;
}

export const ProjectSubs = ({ projectId }: { projectId: string }) => {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [subsOnProject, setSubsOnProject] = useState<SubOnProject[]>([]);
  const [subLogs, setSubLogs] = useState<SubLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [subsBudget, setSubsBudget] = useState(0);
  const [subsActual, setSubsActual] = useState(0);
  const [viewMode, setViewMode] = useState<'tabs' | 'calendar'>('tabs');
  const [logForm, setLogForm] = useState({
    sub_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all subs
      const { data: allSubs } = await supabase
        .from('subs')
        .select('*')
        .eq('active', true)
        .order('name');
      setSubs(allSubs || []);

      // Fetch sub logs for this project
      const { data: logs } = await supabase
        .from('sub_logs')
        .select('*, subs(name)')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      setSubLogs(logs || []);

      // Calculate subs on this project
      const subMap = new Map<string, SubOnProject>();
      logs?.forEach((log: any) => {
        const subId = log.sub_id;
        if (!subMap.has(subId)) {
          subMap.set(subId, {
            sub_id: subId,
            sub_name: log.subs?.name || 'Unknown',
            trade: null,
            total_amount: 0,
          });
        }
        const sub = subMap.get(subId)!;
        sub.total_amount += Number(log.amount);
      });
      setSubsOnProject(Array.from(subMap.values()));

      // Fetch budget
      const { data: costData } = await supabase
        .from('project_budget_vs_actual_view')
        .select('subs_budget')
        .eq('project_id', projectId)
        .single();
      setSubsBudget(costData?.subs_budget || 0);

      // Calculate actual
      const total = logs?.reduce((sum, log) => sum + Number(log.amount), 0) || 0;
      setSubsActual(total);
    } catch (error) {
      console.error('Error fetching subs data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('sub_logs')
        .insert({
          sub_id: logForm.sub_id,
          project_id: projectId,
          date: logForm.date,
          amount: parseFloat(logForm.amount),
          description: logForm.description || null,
        });

      if (error) throw error;

      toast.success('Sub cost added successfully');
      setIsLogDialogOpen(false);
      setLogForm({
        sub_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        description: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding sub cost:', error);
      toast.error('Failed to add sub cost');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  const subsVariance = subsBudget - subsActual;
  const varianceColor = subsVariance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subcontractors</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'tabs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tabs')}
          >
            Details
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <ProjectSubsCalendar projectId={projectId} />
      ) : (
        <>
          <div className="flex justify-end">
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Sub Cost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subcontractor Cost</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <Label htmlFor="sub_id">Subcontractor *</Label>
                <select
                  id="sub_id"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={logForm.sub_id}
                  onChange={(e) => setLogForm({ ...logForm, sub_id: e.target.value })}
                  required
                >
                  <option value="">Select a subcontractor</option>
                  {subs.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.company_name ? `(${sub.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={logForm.amount}
                  onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsLogDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Cost</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Subs Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${subsBudget.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Subs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${subsActual.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              {subsVariance >= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${varianceColor}`}>
              {subsVariance >= 0 ? 'Under' : 'Over'} by ${Math.abs(subsVariance).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="on-project">
        <TabsList>
          <TabsTrigger value="on-project">Subs on This Project</TabsTrigger>
          <TabsTrigger value="all-costs">All Cost Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="on-project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subcontractors on This Project</CardTitle>
            </CardHeader>
            <CardContent>
              {subsOnProject.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No subcontractor costs recorded for this project yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subsOnProject.map((sub) => (
                      <TableRow key={sub.sub_id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {sub.sub_name}
                        </TableCell>
                        <TableCell>
                          {sub.trade ? (
                            <Badge variant="outline">{sub.trade}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${sub.total_amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-costs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Cost Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {subLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No cost entries recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{log.subs?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${Number(log.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};