import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Eye,
  Star,
  Zap,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CreateEstimateDialog } from './CreateEstimateDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectEstimatesV3Props {
  projectId: string;
}

type EstimateRecord = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  is_budget_source: boolean;
  created_at: string | null;
  updated_at: string | null;
  version?: number | null;
};

type EstimateItemRecord = {
  id: string;
  estimate_id: string;
  description: string;
  category: string | null;
  cost_code_id: string | null;
  trade_id?: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  planned_hours: number | null;
  is_allowance: boolean | null;
  area_name: string | null;
  scope_group: string | null;
  created_at: string | null;
};

export function ProjectEstimatesV3({ projectId }: ProjectEstimatesV3Props) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [detailEstimate, setDetailEstimate] = useState<EstimateRecord | null>(null);
  const { toast } = useToast();

  const {
    data: estimates,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['estimates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EstimateRecord[];
    },
  });

  const handleSyncToBudget = async () => {
    if (!selectedEstimateId) return;

    try {
      const { error } = await supabase.rpc('sync_estimate_to_budget', {
        p_estimate_id: selectedEstimateId,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Estimate synced to budget successfully',
      });

      refetch();
      setSyncDialogOpen(false);
      setSelectedEstimateId(null);
    } catch (error) {
      console.error('Error syncing estimate to budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync estimate to budget',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.draft;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estimates
              </CardTitle>
              <CardDescription>
                Manage project estimates and sync to budget
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              New Estimate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimates && estimates.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Budget Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell className="font-medium">
                        {estimate.title || 'Untitled estimate'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusBadge(estimate.status)}
                          variant="outline"
                        >
                          {estimate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(estimate.subtotal_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(estimate.tax_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(estimate.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {estimate.created_at
                          ? format(new Date(estimate.created_at), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {estimate.is_budget_source ? (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Budget Baseline
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!estimate.is_budget_source &&
                            estimate.status === 'accepted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEstimateId(estimate.id);
                                  setSyncDialogOpen(true);
                                }}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Sync to Budget
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant={detailEstimate?.id === estimate.id ? 'default' : 'ghost'}
                            onClick={() =>
                              setDetailEstimate((prev) =>
                                prev?.id === estimate.id ? null : estimate
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {detailEstimate && (
                <div className="mt-6">
                  <EstimateDetail
                    estimate={detailEstimate}
                    onClose={() => setDetailEstimate(null)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No estimates yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Create First Estimate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEstimateDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) refetch();
        }}
        projectId={projectId}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Estimate to Budget?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Mark this estimate as the budget baseline</li>
                <li>Create budget lines for each estimate item</li>
                <li>Replace any existing budget for this project</li>
              </ul>
              <p className="mt-4 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncToBudget}>
              <Zap className="h-4 w-4 mr-2" />
              Sync to Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface EstimateDetailProps {
  estimate: EstimateRecord;
  onClose: () => void;
}

function EstimateDetail({ estimate, onClose }: EstimateDetailProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['estimate-items', estimate.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimate.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as EstimateItemRecord[];
    },
  });

  // Basic category rollup for the summary strip
  const rollup = (category: string) => {
    if (!items) return 0;
    return items
      .filter((i) =>
        i.category ? i.category.toLowerCase().startsWith(category) : false
      )
      .reduce(
        (sum, i) =>
          sum +
          (i.line_total ??
            (Number(i.quantity || 0) * Number(i.unit_price || 0))),
        0
      );
  };

  const laborTotal = rollup('lab');
  const subsTotal = rollup('sub');
  const materialsTotal = rollup('mat');
  const otherTotal =
    (items || []).reduce(
      (sum, i) =>
        sum +
        (i.line_total ??
          (Number(i.quantity || 0) * Number(i.unit_price || 0))),
      0
    ) -
    laborTotal -
    subsTotal -
    materialsTotal;

  const formattedTotal = (estimate.total_amount ?? estimate.subtotal_amount ?? 0)
    .toLocaleString();

  return (
    <Card className="border border-primary/10 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {estimate.title || 'Estimate details'}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3 mt-2">
            <Badge variant="outline" className="capitalize">
              {estimate.status}
            </Badge>
            {estimate.created_at && (
              <span className="text-xs text-muted-foreground">
                Created {format(new Date(estimate.created_at), 'MMM d, yyyy')}
              </span>
            )}
            {estimate.updated_at && (
              <span className="text-xs text-muted-foreground">
                • Updated {format(new Date(estimate.updated_at), 'MMM d, yyyy')}
              </span>
            )}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 sm:mt-0"
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/40 px-3 py-3">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-lg font-semibold">${formattedTotal}</div>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-3">
            <div className="text-xs text-muted-foreground mb-1">Labor</div>
            <div className="text-lg font-semibold">
              ${laborTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-3">
            <div className="text-xs text-muted-foreground mb-1">Subs</div>
            <div className="text-lg font-semibold">
              ${subsTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-3">
            <div className="text-xs text-muted-foreground mb-1">
              Materials & Other
            </div>
            <div className="text-lg font-semibold">
              ${(materialsTotal + otherTotal).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Line Items
            </h3>
            {/* Placeholder for future export / filters */}
            <Button variant="outline" size="sm" disabled>
              <Download className="h-3 w-3 mr-1" />
              Export (soon)
            </Button>
          </div>
          <div className="border rounded-lg max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Loading estimate items…
              </div>
            ) : items && items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Scope/Phase</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-center">Allowance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const qty = Number(item.quantity || 0);
                    const unitPrice = Number(item.unit_price || 0);
                    const lineTotal = item.line_total ?? (qty * unitPrice);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="capitalize">
                          {item.category || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.cost_code_id || '—'}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.area_name || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.scope_group || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {qty.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.unit || 'ea'}</TableCell>
                        <TableCell className="text-right">
                          ${unitPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${lineTotal.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_allowance ? (
                            <Badge variant="outline" className="text-xs">
                              Allowance
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No line items found for this estimate. This could be a scope
                block–only estimate, or it may still be in setup.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
