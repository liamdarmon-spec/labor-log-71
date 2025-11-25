import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, DollarSign, Plus } from 'lucide-react';
import { CreatePayRunDialog } from './CreatePayRunDialog';
import { PayRunDetailDrawer } from './PayRunDetailDrawer';

export function WorkforcePayRunsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPayRunId, setSelectedPayRunId] = useState<string | null>(null);

  const { data: payRuns, isLoading, refetch } = useQuery({
    queryKey: ['labor-pay-runs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('labor_pay_runs')
        .select(`
          *,
          payer_company:companies!labor_pay_runs_payer_company_id_fkey(name),
          payee_company:companies!labor_pay_runs_payee_company_id_fkey(name)
        `)
        .order('date_range_end', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle>Labor Pay Runs</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto gap-2">
                <Plus className="w-4 h-4" />
                New Pay Run
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!payRuns || payRuns.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pay Runs Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first labor pay run from unpaid time logs.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Pay Run
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Payer Company</TableHead>
                    <TableHead>Payee Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payRuns.map((run: any) => (
                    <TableRow 
                      key={run.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPayRunId(run.id)}
                    >
                      <TableCell>
                        {new Date(run.date_range_start).toLocaleDateString()} -{' '}
                        {new Date(run.date_range_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{run.payer_company?.name || 'N/A'}</TableCell>
                      <TableCell>{run.payee_company?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(run.status)}>
                          {run.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(run.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayRunId(run.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePayRunDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      {selectedPayRunId && (
        <PayRunDetailDrawer
          payRunId={selectedPayRunId}
          open={!!selectedPayRunId}
          onOpenChange={(open) => !open && setSelectedPayRunId(null)}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
