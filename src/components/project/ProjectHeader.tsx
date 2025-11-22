import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useProjectStats } from '@/hooks/useProjectStats';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  clientName: string;
  address?: string | null;
  status: string;
  companyId?: string | null;
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on hold':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function ProjectHeader({ projectId, projectName, clientName, address, status }: ProjectHeaderProps) {
  const { data: stats, isLoading } = useProjectStats(projectId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{projectName}</h1>
          <Badge className={getStatusColor(status)}>{status}</Badge>
        </div>
        <div className="flex flex-col text-sm text-muted-foreground">
          <span className="font-medium">{clientName}</span>
          {address && <span>{address}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget vs Actual</p>
                    <p className="text-2xl font-bold">
                      ${stats?.budgetTotal.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Actual: ${stats?.actualTotal.toLocaleString() || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Labor Hours</p>
                    <p className="text-2xl font-bold">
                      {stats?.totalLaborHours.toFixed(1) || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Logged hours</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Labor Cost</p>
                    <p className="text-2xl font-bold">
                      ${stats?.totalLaborCost.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Incurred to date</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className={stats?.unpaidLaborAmount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unpaid Labor</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${stats?.unpaidLaborAmount.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
