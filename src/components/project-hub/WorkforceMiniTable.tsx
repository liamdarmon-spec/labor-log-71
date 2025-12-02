import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';

export interface WorkforceRow {
  id: string;
  name: string;
  trade?: string | null;
  hours?: number | null;
  unpaidAmount?: number | null;
}

export interface WorkforceMiniTableProps {
  rows: WorkforceRow[];
  onViewAll?: () => void;
}

export function WorkforceMiniTable({ rows, onViewAll }: WorkforceMiniTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Workforce (Last 7 Days)
          </CardTitle>
          {onViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              View All
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Worker</th>
                    <th className="text-left py-2 font-medium">Trade</th>
                    <th className="text-right py-2 font-medium">Hours</th>
                    <th className="text-right py-2 font-medium">Unpaid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{row.name}</td>
                      <td className="py-2.5 text-muted-foreground">{row.trade || '—'}</td>
                      <td className="py-2.5 text-right">
                        {row.hours != null ? `${row.hours.toFixed(1)}h` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {row.unpaidAmount != null && row.unpaidAmount > 0 ? (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                          >
                            ${row.unpaidAmount.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{row.name}</span>
                    {row.unpaidAmount != null && row.unpaidAmount > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                      >
                        ${row.unpaidAmount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{row.trade || 'No trade'}</span>
                    <span>•</span>
                    <span>{row.hours != null ? `${row.hours.toFixed(1)}h` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent labor activity
          </p>
        )}
      </CardContent>
    </Card>
  );
}
