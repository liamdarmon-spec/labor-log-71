import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, Package, Wrench, ArrowRight, AlertCircle } from 'lucide-react';
import { useProjectBudgetLedger } from '@/hooks/useProjectBudgetLedger';
import { Skeleton } from '@/components/ui/skeleton';

interface CostByCategoryTabProps {
  projectId: string;
  onViewDetails?: (category: string) => void;
}

export function CostByCategoryTab({ projectId, onViewDetails }: CostByCategoryTabProps) {
  const { summary, isLoading } = useProjectBudgetLedger(projectId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const categories = [
    {
      key: 'labor' as const,
      label: 'Labor',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      key: 'subs' as const,
      label: 'Subcontractors',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      key: 'materials' as const,
      label: 'Materials',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      key: 'misc' as const,
      label: 'Miscellaneous',
      icon: Wrench,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Cost by Category</h3>
        <p className="text-muted-foreground">
          Budget vs. actual breakdown by major cost categories
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const categoryKey = category.key === 'misc' ? 'other' : category.key;
          const catData = {
            budget: summary[`${categoryKey}_budget` as keyof typeof summary] as number || 0,
            actual: summary[`${categoryKey}_actual` as keyof typeof summary] as number || 0,
            variance: summary[`${categoryKey}_variance` as keyof typeof summary] as number || 0,
          };
          const percentUsed = catData.budget > 0 ? (catData.actual / catData.budget) * 100 : 0;
          const isAlert = percentUsed > 90 && catData.budget > 0;
          const isOver = percentUsed > 100;
          const Icon = category.icon;

          return (
            <Card 
              key={category.key} 
              className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${
                isAlert ? `${category.borderColor} border-2` : ''
              }`}
            >
              <CardHeader className={`${category.bgColor} border-b`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <Icon className={`h-5 w-5 ${category.color}`} />
                    </div>
                    <span>{category.label}</span>
                  </div>
                  {isAlert && (
                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Alert
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Budget vs Actual */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Budget</span>
                      <span className="text-2xl font-bold">
                        ${catData.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Actual</span>
                      <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : category.color}`}>
                        ${catData.actual.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-3 border-t">
                      <span className="text-sm text-muted-foreground">Variance</span>
                      <span className={`text-xl font-bold ${catData.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(catData.variance).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {catData.budget > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Consumed</span>
                        <span className={`font-semibold ${isOver ? 'text-red-600' : isAlert ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {percentUsed.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            isOver ? 'bg-red-500' : isAlert ? 'bg-orange-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => onViewDetails?.(category.key)}
                  >
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
