import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnpaidLaborBills } from "@/hooks/useUnpaidLaborBills";
import { format } from "date-fns";
import { Receipt, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LaborBillsSectionProps {
  projectId: string;
}

export function LaborBillsSection({ projectId }: LaborBillsSectionProps) {
  const { data: bills, isLoading } = useUnpaidLaborBills(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Labor Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Unpaid Labor Bills
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Outstanding labor costs that need to be paid
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No unpaid labor for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalUnpaid = bills.reduce((sum, bill) => sum + bill.total_amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Unpaid Labor Bills
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Outstanding labor costs totaling ${totalUnpaid.toFixed(2)}
            </p>
          </div>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            ${totalUnpaid.toFixed(2)} Due
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  {bill.company_name || 'Unknown Company'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(bill.period_start), 'MMM d')} - {format(new Date(bill.period_end), 'MMM d, yyyy')}
                  <span className="ml-2 text-xs">({bill.log_count} logs)</span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {bill.total_hours.toFixed(1)} hrs
                </TableCell>
                <TableCell className="text-right font-bold text-destructive">
                  ${bill.total_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Navigate to payments page with pre-filled filters
                      window.location.href = `/payments?company=${bill.company_id}&start=${bill.period_start}&end=${bill.period_end}&project=${projectId}`;
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Pay Now
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
