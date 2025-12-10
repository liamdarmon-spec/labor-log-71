import { useState } from 'react';
import { useProjectWorkOrders, useUpdateWorkOrder } from '@/hooks/useWorkOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { WorkOrderStatus } from '@/types/workOrders';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';

interface ProjectWorkOrdersTabProps {
  projectId: string;
}

type StatusFilter = 'all' | 'open' | 'closed';

const OPEN_STATUSES: WorkOrderStatus[] = ['draft', 'issued', 'scheduled', 'in_progress'];
const CLOSED_STATUSES: WorkOrderStatus[] = ['completed', 'cancelled'];

function getStatusBadgeVariant(status: WorkOrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'issued':
      return 'secondary';
    case 'scheduled':
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProjectWorkOrdersTab({ projectId }: ProjectWorkOrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: workOrders, isLoading } = useProjectWorkOrders(projectId);
  const updateWorkOrder = useUpdateWorkOrder();

  // Fetch budget lines for display - memoize to avoid refetching
  const { data: budgetLines } = useQuery({
    queryKey: ['project-budget-lines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .select('id, description_client, description_internal')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch companies for display - reuse existing hook
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.map(c => ({ id: c.id, name: c.name })) || [];

  const getBudgetLineDescription = (budgetItemId: string | null) => {
    if (!budgetItemId || !budgetLines) return null;
    const line = budgetLines.find((l: any) => l.id === budgetItemId);
    return line?.description_client || line?.description_internal || null;
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId || !companies) return null;
    const company = companies.find((c: any) => c.id === companyId);
    return company?.name || null;
  };

  // Filter work orders by status - ensure correct mapping
  const filteredWorkOrders = (workOrders || []).filter((wo) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') {
      return OPEN_STATUSES.includes(wo.status);
    }
    if (statusFilter === 'closed') {
      return CLOSED_STATUSES.includes(wo.status);
    }
    return true;
  });

  const handleStatusChange = async (workOrderId: string, newStatus: WorkOrderStatus, projectId: string) => {
    try {
      await updateWorkOrder.mutateAsync({
        id: workOrderId,
        project_id: projectId,
        payload: { status: newStatus },
      });
      toast.success('Work order status updated');
    } catch (error: any) {
      console.error('Error updating work order status:', error);
      const errorMessage = error?.message || 'Failed to update work order status';
      toast.error(errorMessage);
      
      // Log to help debug RLS/permission issues
      if (error?.code === '42501' || error?.message?.includes('permission')) {
        console.error('Possible RLS/permission issue. Check work_orders table policies.');
      }
    }
  };

  const isOpen = (status: WorkOrderStatus) => OPEN_STATUSES.includes(status);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Work Orders</h2>
          <p className="text-sm text-muted-foreground">
            Manage work orders for this project
          </p>
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Work Orders</SelectItem>
            <SelectItem value="open">Open Only</SelectItem>
            <SelectItem value="closed">Closed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work Orders Table */}
      {filteredWorkOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {statusFilter === 'all'
                ? 'No work orders found. Create one from a budget line item.'
                : `No ${statusFilter} work orders found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Budget Item</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Approved Amount</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.map((wo) => {
                  const budgetDesc = getBudgetLineDescription(wo.budget_item_id);
                  const companyName = getCompanyName(wo.sub_company_id);
                  // Handle scheduled range - support partial dates
                  const scheduledRange = (() => {
                    if (wo.scheduled_start && wo.scheduled_end) {
                      try {
                        return `${format(new Date(wo.scheduled_start), 'MMM d')} - ${format(new Date(wo.scheduled_end), 'MMM d')}`;
                      } catch {
                        return 'Invalid dates';
                      }
                    }
                    if (wo.scheduled_start) {
                      try {
                        return format(new Date(wo.scheduled_start), 'MMM d');
                      } catch {
                        return 'Invalid date';
                      }
                    }
                    return '—';
                  })();

                  return (
                    <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{wo.title}</TableCell>
                      <TableCell>
                        {budgetDesc ? (
                          <Badge variant="outline" className="text-xs">
                            {budgetDesc.length > 30 ? `${budgetDesc.substring(0, 30)}...` : budgetDesc}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {companyName ? (
                          <span className="text-sm">{companyName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(wo.status)} className="capitalize">
                            {wo.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={isOpen(wo.status) ? 'default' : 'secondary'} className="text-xs">
                            {isOpen(wo.status) ? 'Open' : 'Closed'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(wo.original_amount)}</TableCell>
                      <TableCell className="text-right">{formatMoney(wo.approved_amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{scheduledRange}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {wo.due_date ? (() => {
                          try {
                            return format(new Date(wo.due_date), 'MMM d, yyyy');
                          } catch {
                            return wo.due_date; // Fallback to raw value
                          }
                        })() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={wo.status}
                          onValueChange={(value) => handleStatusChange(wo.id, value as WorkOrderStatus, wo.project_id)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="issued">Issued</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
