import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingDown, Clock } from 'lucide-react';

interface SubBalanceSheetProps {
  contractValue: number;
  amountBilled: number;
  amountPaid: number;
  retentionPercentage: number;
  retentionHeld: number;
}

export function SubBalanceSheet({
  contractValue,
  amountBilled,
  amountPaid,
  retentionPercentage,
  retentionHeld,
}: SubBalanceSheetProps) {
  const remaining = contractValue - amountBilled;
  const unpaid = amountBilled - amountPaid;
  const finalPayment = remaining + retentionHeld;
  const percentComplete = contractValue > 0 ? (amountBilled / contractValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contract Balance Sheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Contract Progress</span>
            <span className="font-semibold">{percentComplete.toFixed(1)}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              Contract Value
            </div>
            <p className="text-2xl font-bold">${contractValue.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3" />
              Retention Held
            </div>
            <p className="text-2xl font-bold text-amber-600">
              ${retentionHeld.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{retentionPercentage}% rate</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Approved Invoices</span>
            <span className="font-semibold">${amountBilled.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Paid to Date</span>
            <span className="font-semibold text-emerald-600">
              ${amountPaid.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Remaining Contract</span>
            <span className="font-semibold">${remaining.toLocaleString()}</span>
          </div>

          {unpaid > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Unpaid Invoices
              </span>
              <Badge variant="secondary" className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                ${unpaid.toLocaleString()}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm font-semibold">Final Payment (Est.)</span>
            <span className="text-lg font-bold text-primary">
              ${finalPayment.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Remaining work + retention release
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
