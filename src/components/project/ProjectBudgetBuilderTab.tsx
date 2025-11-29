import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectBudgetStructure } from '@/hooks/useProjectBudgetStructure';

interface ProjectBudgetBuilderTabProps {
  projectId: string;
}

export function ProjectBudgetBuilderTab({ projectId }: ProjectBudgetBuilderTabProps) {
  const { data, isLoading, error, refetch } = useProjectBudgetStructure(projectId);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    console.error(error);
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-600 mb-2">
            Failed to load budget.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No budget found for this project yet.
        </CardContent>
      </Card>
    );
  }

  const { budget, groups, lines } = data as any; // keep loose for now

  // Map lines by group_id so we can render sections
  const linesByGroup: Record<string, any[]> = {};
  (lines || []).forEach((line: any) => {
    const key = line.group_id || 'ungrouped';
    if (!linesByGroup[key]) linesByGroup[key] = [];
    linesByGroup[key].push(line);
  });

  const ungroupedLines = linesByGroup['ungrouped'] || [];

  return (
    <div className="space-y-6">
      {/* Header / summary */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {budget?.name || 'Project Budget'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Canonical budget structure – groups & lines. This will later drive proposals and cost tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {budget?.status && (
            <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
              {budget.status}
            </Badge>
          )}
          {/* future: “Edit header”, “New group”, etc. */}
        </div>
      </div>

      {/* Groups + lines */}
      <ScrollArea className="h-[520px] border rounded-md">
        <div className="p-4 space-y-4">
          {/* Render groups in sort_order */}
          {(groups || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((group: any) => {
            const groupLines = linesByGroup[group.id] || [];
            return (
              <Card key={group.id} className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <p className="text-xs text-muted-foreground">
                          {group.description}
                        </p>
                      )}
                    </div>
                    {!group.client_visible && (
                      <Badge variant="outline" className="text-xs">
                        Internal only
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {groupLines.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No lines in this section yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {groupLines
                        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((line: any) => (
                          <div
                            key={line.id}
                            className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {line.description_client || line.description_internal || line.description || 'Untitled line'}
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                                {line.cost_codes?.code && (
                                  <span>{line.cost_codes.code}</span>
                                )}
                                {line.unit && line.qty && (
                                  <span>
                                    {line.qty} {line.unit} @ {Number(line.unit_cost || 0).toLocaleString()}
                                  </span>
                                )}
                                {line.line_type && (
                                  <span className="capitalize">{line.line_type}</span>
                                )}
                                {line.scope_type !== 'base' && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {line.scope_type}
                                  </Badge>
                                )}
                                {line.is_optional && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    Optional
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm font-semibold">
                              ${Number(line.budget_amount || line.qty * line.unit_cost || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Ungrouped lines */}
          {ungroupedLines.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ungrouped</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {ungroupedLines
                    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((line: any) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {line.description_client || line.description_internal || line.description || 'Untitled line'}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                            {line.cost_codes?.code && (
                              <span>{line.cost_codes.code}</span>
                            )}
                            {line.unit && line.qty && (
                              <span>
                                {line.qty} {line.unit} @ {Number(line.unit_cost || 0).toLocaleString()}
                              </span>
                            )}
                            {line.line_type && (
                              <span className="capitalize">{line.line_type}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          ${Number(line.budget_amount || line.qty * line.unit_cost || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
