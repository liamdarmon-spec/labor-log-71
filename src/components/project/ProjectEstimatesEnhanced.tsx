import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, CheckCircle2, TrendingUp, Star, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { CreateEstimateDialog } from './CreateEstimateDialog';

interface Estimate {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  created_at: string;
  is_budget_source: boolean;
}

export const ProjectEstimatesEnhanced = ({ projectId }: { projectId: string }) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEstimates();
  }, [projectId]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimates(data || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const syncToBudget = async (estimateId: string) => {
    try {
      const { error } = await supabase.rpc('sync_estimate_to_budget', {
        p_estimate_id: estimateId
      });

      if (error) throw error;

      toast.success('Budget lines synced from estimate by cost code');
      fetchEstimates();
      
      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('budget-updated'));
    } catch (error) {
      console.error('Error syncing to budget:', error);
      toast.error('Failed to sync budget');
    }
  };

  const acceptEstimate = async (estimateId: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: 'accepted' })
        .eq('id', estimateId);

      if (error) throw error;

      toast.success('Estimate accepted. You can now sync to budget.');
      fetchEstimates();
    } catch (error) {
      console.error('Error accepting estimate:', error);
      toast.error('Failed to accept estimate');
    }
  };

  const updateEstimateStatus = async (estimateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: newStatus })
        .eq('id', estimateId);

      if (error) throw error;
      toast.success('Estimate status updated');
      fetchEstimates();
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast.error('Failed to update estimate');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'change_order':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getBudgetImpact = (estimate: Estimate) => {
    if (estimate.is_budget_source) {
      return { label: 'BUDGET BASELINE', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
    if (estimate.status === 'accepted') {
      // Calculate if it's a change order (simplified - would need more logic)
      return { label: 'Not Applied', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
    }
    return { label: 'Not Applied', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Estimates</h3>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Estimate
        </Button>
      </div>

      <CreateEstimateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
        onSuccess={fetchEstimates}
      />

      {estimates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No estimates yet. Create your first estimate to get started.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget Impact</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => {
                const budgetImpact = getBudgetImpact(estimate);
                return (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {estimate.title}
                        {estimate.is_budget_source && (
                          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500/20">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                            Budget Source
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(estimate.status)} variant="outline">
                        {estimate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={budgetImpact.color} variant="outline">
                        {budgetImpact.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(estimate.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(estimate.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {estimate.status !== 'accepted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acceptEstimate(estimate.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        )}
                        {estimate.status === 'accepted' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => syncToBudget(estimate.id)}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Sync to Budget
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
