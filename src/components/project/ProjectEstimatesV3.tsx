// src/components/project/ProjectEstimatesV3.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Star, Zap, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreateEstimateDialog } from "./CreateEstimateDialog";
import { useNavigate } from "react-router-dom";
import { SyncEstimateDialog } from "@/components/estimates/SyncEstimateDialog";
import { useProjectEstimatesSyncStatus } from "@/hooks/useEstimateSyncStatus";

interface ProjectEstimatesV3Props {
  projectId: string;
}

export function ProjectEstimatesV3({ projectId }: ProjectEstimatesV3Props) {
  // Guard against missing projectId
  if (!projectId) {
    console.error('[ProjectEstimatesV3] Missing projectId prop');
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Project ID is required to view estimates.</p>
        </CardContent>
      </Card>
    );
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(
    null,
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: estimates, isLoading, refetch } = useQuery({
    queryKey: ["estimates", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: syncStatusMap = {} } = useProjectEstimatesSyncStatus(projectId);

  const handleSyncClick = (estimateId: string) => {
    if (!projectId) {
      console.error('[ProjectEstimatesV3] Cannot sync: projectId is missing', { estimateId });
      toast({
        title: 'Error',
        description: 'Project ID is missing. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedEstimateId(estimateId);
    setSyncDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      sent: "bg-blue-100 text-blue-800 border-blue-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || colors.draft;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasEstimates = (estimates || []).length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estimates
              </CardTitle>
              <CardDescription>
                Manage project estimates and sync to budget.
              </CardDescription>
            </div>
            {hasEstimates && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasEstimates ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Budget Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate: any) => (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-medium">
                      {estimate.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusBadge(estimate.status)}
                        variant="outline"
                      >
                        {estimate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${(estimate.subtotal_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(estimate.tax_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(estimate.total_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {estimate.created_at
                        ? format(
                            new Date(estimate.created_at),
                            "MMM d, yyyy",
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const syncStatus = syncStatusMap[estimate.id];
                        if (syncStatus?.status === 'synced') {
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="default" className="gap-1">
                                <Star className="h-3 w-3" />
                                Contributes ({syncStatus.lineCount} lines)
                              </Badge>
                              {syncStatus.syncedAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(syncStatus.syncedAt), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not synced
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncClick(estimate.id)}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {syncStatusMap[estimate.id]?.status === 'synced' ? 'Re-sync' : 'Sync to Budget'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/estimates/${estimate.id}`)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No estimates yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Create First Estimate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEstimateDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) refetch();
        }}
        projectId={projectId}
        onSuccess={(estimateId) => {
          refetch();
          // Navigate directly to builder
          navigate(`/estimates/${estimateId}`);
        }}
      />

      {selectedEstimateId && projectId && (
        <SyncEstimateDialog
          open={syncDialogOpen}
          onOpenChange={(open) => {
            setSyncDialogOpen(open);
            if (!open) {
              setSelectedEstimateId(null);
            }
          }}
          projectId={projectId}
          estimateId={selectedEstimateId}
          estimateTitle={estimates?.find((e: any) => e.id === selectedEstimateId)?.title}
        />
      )}
    </>
  );
}
