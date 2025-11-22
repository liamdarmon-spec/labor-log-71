/**
 * ResponsiveTable - Mobile-friendly table component
 * 
 * On desktop: Shows as a regular table
 * On mobile: Collapses into stacked cards with key fields
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface Column {
  key: string;
  label: string;
  render: (row: any) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  mobileOrder?: number; // Lower numbers appear first
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}

export function ResponsiveTable({ columns, data, onRowClick, emptyMessage = 'No data available' }: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    // Desktop: Regular table
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col.key} className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-3 text-sm">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile: Stacked cards
  const mobileColumns = columns
    .filter(col => !col.hideOnMobile)
    .sort((a, b) => (a.mobileOrder || 99) - (b.mobileOrder || 99));

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          {emptyMessage}
        </Card>
      ) : (
        data.map((row, idx) => (
          <Card 
            key={idx} 
            className={`p-4 space-y-2 ${onRowClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
            onClick={() => onRowClick?.(row)}
          >
            {mobileColumns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {col.mobileLabel || col.label}
                </span>
                <span className="text-sm font-medium text-right flex-1">
                  {col.render(row)}
                </span>
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );
}