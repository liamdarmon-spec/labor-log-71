import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface BudgetMiniOverviewProps {
  projectId: string;
}

export function BudgetMiniOverview({ projectId }: BudgetMiniOverviewProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['budget-mini-overview', projectId],
    queryFn: async () => {
      const [budgetRes, laborRes, costsRes] = await Promise.all([
        supabase
          .from('project_budgets')
          .select('labor_budget, subs_budget, materials_budget, other_budget')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('time_logs')
          .select('labor_cost')
          .eq('project_id', projectId),
        supabase
          .from('costs')
          .select('amount, category')
          .eq('project_id', projectId),
      ]);

      const laborActual = laborRes.data?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0;
      const subsActual = costsRes.data?.filter(c => c.category === 'subs').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const materialsActual = costsRes.data?.filter(c => c.category === 'materials').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const otherActual = costsRes.data?.filter(c => 
        c.category === 'misc' || c.category === 'equipment' || c.category === 'other' || !c.category
      ).reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return [
        {
          category: 'Labor',
          budget: budgetRes.data?.labor_budget || 0,
          actual: laborActual,
        },
        {
          category: 'Subs',
          budget: budgetRes.data?.subs_budget || 0,
          actual: subsActual,
        },
        {
          category: 'Materials',
          budget: budgetRes.data?.materials_budget || 0,
          actual: materialsActual,
        },
        {
          category: 'Other',
          budget: budgetRes.data?.other_budget || 0,
          actual: otherActual,
        },
      ];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBudget = data?.reduce((sum, d) => sum + d.budget, 0) || 0;
  const totalActual = data?.reduce((sum, d) => sum + d.actual, 0) || 0;
  const totalPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate(`?tab=budget`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Budget Overview
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total</span>
            <span className={`text-sm font-semibold ${totalPercent > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalPercent.toFixed(0)}% used
            </span>
          </div>
          <Progress 
            value={Math.min(totalPercent, 100)} 
            className="h-2"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>${totalActual.toLocaleString()} spent</span>
            <span>${totalBudget.toLocaleString()} budget</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {data?.map((item) => {
            const percent = item.budget > 0 ? (item.actual / item.budget) * 100 : 0;
            const variance = item.budget - item.actual;
            const isOver = variance < 0;
            
            return (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.category}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      ${item.actual.toLocaleString()} / ${item.budget.toLocaleString()}
                    </span>
                    <span className={`font-medium min-w-[60px] text-right ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isOver ? '-' : '+'}${Math.abs(variance).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(percent, 100)} 
                  className={`h-1.5 ${percent > 100 ? '[&>div]:bg-red-500' : percent > 80 ? '[&>div]:bg-amber-500' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
