import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

/** Generate a deterministic color from name for avatar */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

function WorkerAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const bgColor = getAvatarColor(name);
  
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
      bgColor
    )}>
      {initial}
    </div>
  );
}

export function WorkforceMiniTable({ rows, onViewAll }: WorkforceMiniTableProps) {
  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Workforce (Last 7 Days)
          </CardTitle>
          {onViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {rows.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground text-[10px] uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Worker</th>
                    <th className="text-left py-2 font-medium">Trade</th>
                    <th className="text-right py-2 font-medium">Hours</th>
                    <th className="text-right py-2 font-medium">Unpaid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr 
                      key={row.id} 
                      className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <WorkerAvatar name={row.name} />
                          <span className="font-semibold text-sm">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        {row.trade ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                            {row.trade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {row.hours != null ? `${row.hours.toFixed(1)}h` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {row.unpaidAmount != null && row.unpaidAmount > 0 ? (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 tabular-nums"
                          >
                            ${row.unpaidAmount.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
                <div 
                  key={row.id} 
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <WorkerAvatar name={row.name} />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block truncate">{row.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{row.trade || 'No trade'}</span>
                          <span>•</span>
                          <span className="font-medium">{row.hours != null ? `${row.hours.toFixed(1)}h` : '—'}</span>
                        </div>
                      </div>
                    </div>
                    {row.unpaidAmount != null && row.unpaidAmount > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 shrink-0"
                      >
                        ${row.unpaidAmount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent labor activity
          </p>
        )}
      </CardContent>
    </Card>
  );
}
