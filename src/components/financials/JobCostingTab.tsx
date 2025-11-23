import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobCosting } from '@/hooks/useJobCosting';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const JobCostingTab = () => {
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const navigate = useNavigate();

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: jobCostingData, isLoading } = useJobCosting({
    companyId: companyFilter === 'all' ? undefined : companyFilter,
    projectStatus: statusFilter,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies?.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="all">All Projects</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Labor</TableHead>
                  <TableHead className="text-right">Subs</TableHead>
                  <TableHead className="text-right">Materials</TableHead>
                  <TableHead className="text-right">Total Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobCostingData?.map((item) => (
                  <TableRow
                    key={item.project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/projects/${item.project.id}`)}
                  >
                    <TableCell className="font-medium">
                      {item.project.project_name}
                    </TableCell>
                    <TableCell>{(item.project as any).companies?.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.budget)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actuals.labor)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actuals.subs)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actuals.materials)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.actuals.total)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getVarianceColor(item.variance)}`}>
                      {formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.billed)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getVarianceColor(item.margin)}`}>
                      {formatCurrency(item.margin)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
