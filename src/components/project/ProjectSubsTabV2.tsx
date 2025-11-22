import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Hammer } from 'lucide-react';

interface ProjectSubsTabV2Props {
  projectId: string;
}

export function ProjectSubsTabV2({ projectId }: ProjectSubsTabV2Props) {
  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Subs on Project</p>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Contract Value</p>
            <p className="text-2xl font-bold">$0</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Paid to Subs</p>
            <p className="text-2xl font-bold">$0</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Retention Held</p>
            <p className="text-2xl font-bold">$0</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Subs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Subcontractors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Subcontractor tracking coming soon</p>
            <p className="text-sm text-muted-foreground">
              This section will include contract management, invoicing, and payment tracking for subs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
