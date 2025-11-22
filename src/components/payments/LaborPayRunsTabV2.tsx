import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LaborPayRunsTabV2() {
  const navigate = useNavigate();

  const { data: payRuns, isLoading } = useQuery({
    queryKey: ['labor-pay-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_pay_runs')
        .select(`
          *,
          payee_company:companies!labor_pay_runs_payee_company_id_fkey(name)
        `)
        .order('date_range_end', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!payRuns || payRuns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pay Runs</h3>
          <p className="text-muted-foreground mb-4">
            Create your first labor pay run from unpaid time logs.
          </p>
          <Button onClick={() => navigate('/financials/payments?tab=unpaid')}>
            View Unpaid Labor
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Labor Pay Runs</CardTitle>
          <Button onClick={() => navigate('/payments')}>
            Create Pay Run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Range</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payRuns.map((run: any) => (
              <TableRow key={run.id}>
                <TableCell>
                  {new Date(run.date_range_start).toLocaleDateString()} -{' '}
                  {new Date(run.date_range_end).toLocaleDateString()}
                </TableCell>
                <TableCell>{run.payee_company?.name || 'N/A'}</TableCell>
                <TableCell>{run.payment_method || 'Not specified'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(run.status)}>
                    {run.status || 'draft'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${(run.total_amount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Open pay run detail drawer
                      console.log('View pay run:', run.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
