import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubFinancials } from '@/hooks/useSubFinancials';
import { useNavigate } from 'react-router-dom';

interface SubProjectsTabProps {
  subId: string;
}

/**
 * Projects & Contracts tab for Sub Detail page
 * Uses unified financial calculations from useSubFinancials
 */
export function SubProjectsTab({ subId }: SubProjectsTabProps) {
  const navigate = useNavigate();
  const { data: financials, isLoading } = useSubFinancials(subId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {financials && financials.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead className="text-right">Approved Change Orders</TableHead>
                <TableHead className="text-right">Contract Total</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financials.map((fin) => {
                // Color coding for remaining
                const remainingColor = fin.remaining < 0 
                  ? 'text-red-600 font-bold' 
                  : fin.remaining < fin.contractTotal * 0.1 
                  ? 'text-orange-600 font-semibold' 
                  : 'text-foreground font-semibold';

                return (
                  <TableRow key={fin.projectId}>
                    <TableCell className="font-medium">
                      {fin.projectName}
                    </TableCell>
                    <TableCell className="text-right">
                      ${fin.contractValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {fin.approvedChangeOrders > 0 ? (
                        <span className="text-blue-600 font-medium">
                          +${fin.approvedChangeOrders.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${fin.contractTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-purple-600 font-medium">
                      ${fin.actualCost.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right ${remainingColor}`}>
                      ${fin.remaining.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      ${fin.amountBilled.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      ${fin.amountPaid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={fin.outstanding > 0 ? 'text-orange-600 font-bold' : ''}>
                        ${fin.outstanding.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/projects/${fin.projectId}?tab=subs`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
