/**
 * GroupedTimeLogsTable - Unified time log display component
 * 
 * CANONICAL: Used by both Workforce Time Logs and ViewLogs pages
 * Shows one row per worker per day, with multiple project badges
 */

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Edit2, Split, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { GroupedTimeLog } from '@/lib/timeLogGrouping';

interface GroupedTimeLogsTableProps {
  groups: GroupedTimeLog[];
  selectedLogs: Set<string>;
  onSelectLog: (logId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectGroup: (group: GroupedTimeLog) => void;
  onEditGroup: (group: GroupedTimeLog) => void;
  onSplitGroup: (group: GroupedTimeLog) => void;
  showSelection?: boolean;
  showActions?: boolean;
}

export function GroupedTimeLogsTable({
  groups,
  selectedLogs,
  onSelectLog,
  onSelectAll,
  onSelectGroup,
  onEditGroup,
  onSplitGroup,
  showSelection = true,
  showActions = true,
}: GroupedTimeLogsTableProps) {
  
  const isGroupSelected = (group: GroupedTimeLog) => {
    return group.log_ids.every(id => selectedLogs.has(id));
  };

  const isGroupPartiallySelected = (group: GroupedTimeLog) => {
    const selectedCount = group.log_ids.filter(id => selectedLogs.has(id)).length;
    return selectedCount > 0 && selectedCount < group.log_ids.length;
  };

  const getPaymentStatusIcon = (status: 'paid' | 'unpaid' | 'partial') => {
    switch (status) {
      case 'paid':
        return (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Paid</span>
          </div>
        );
      case 'partial':
        return (
          <div className="flex items-center gap-1.5 text-amber-600">
            <Circle className="h-4 w-4" />
            <span className="text-sm font-medium">Partial</span>
          </div>
        );
      case 'unpaid':
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-4 w-4" />
            <span className="text-sm font-medium">Unpaid</span>
          </div>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {showSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLogs.size > 0 && groups.every(g => isGroupSelected(g))}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Worker</TableHead>
            <TableHead className="font-semibold">Trade</TableHead>
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Projects & Hours</TableHead>
            <TableHead className="font-semibold text-right">Total Hours</TableHead>
            <TableHead className="font-semibold text-right">Total Cost</TableHead>
            <TableHead className="font-semibold">Payment</TableHead>
            {showActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showSelection ? 10 : 9} className="text-center py-12 text-muted-foreground">
                No time logs found
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={`${group.date}_${group.worker_id}`} className="hover:bg-muted/30 transition-colors">
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={isGroupSelected(group)}
                      onCheckedChange={() => onSelectGroup(group)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {format(new Date(group.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="font-medium">{group.worker_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {group.worker_trade || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {group.company_name || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      // Display projects in pairs
                      const pairs = [];
                      for (let i = 0; i < group.projects.length; i += 2) {
                        pairs.push(group.projects.slice(i, i + 2));
                      }
                      return pairs.map((pair, pairIdx) => (
                        <div key={pairIdx} className="flex gap-2">
                          {pair.map((project) => (
                            <div 
                              key={project.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-accent/50 border border-border whitespace-nowrap"
                            >
                              <span className="font-medium">{project.project_name}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-semibold text-primary">{project.hours}h</span>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {group.total_hours.toFixed(1)}h
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-primary">
                  ${group.total_cost.toFixed(2)}
                </TableCell>
                <TableCell>
                  {getPaymentStatusIcon(group.payment_status)}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {group.projects.length === 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSplitGroup(group)}
                          title="Split into multiple projects"
                        >
                          <Split className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditGroup(group)}
                        title="Edit time entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
