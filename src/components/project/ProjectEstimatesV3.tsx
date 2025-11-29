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
import { FileText, Eye, Star, Zap } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreateEstimateDialog } from "./CreateEstimateDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EstimateDetailsSheet } from "./EstimateDetailsSheet";

interface ProjectEstimatesV3Props {
  projectId: string;
}

export function ProjectEstimatesV3({ projectId }: ProjectEstimatesV3Props) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(
    null,
  );
  const [viewEstimateId, setViewEstimateId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleSyncToBudget = async () => {
    if (!selectedEstimateId) return;

    try {
      const { error } = await supabase.rpc("sync_estimate_to_budget", {
        p_estimate_id: selectedEstimateId,
      });

      if (error) throw error;

      // notify budget views to refetch
      window.dispatchEvent(new Event("budget-updated"));

      toast({
        title: "Success",
        description: "Estimate synced to budget successfully",
      });

      refetch();
      setSyncDialogOpen(false);
      setSelectedEstimateId(null);
    } catch (error) {
      console.error("Error syncing estimate to budget:", error);
      toast({
        title: "Error",
        description: "Failed to sync estimate to budget",
        variant: "destructive",
      });
    }
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estimates
              </CardTitle>
              <CardDescription>
                Manage project estimates and sync to budget
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              New Estimate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimates && estimates.length > 0 ? (
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
                      {estimate.is_budget_source ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />
                          Budget Baseline
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!estimate.is_budget_source &&
                          estimate.status === "accepted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEstimateId(estimate.id);
                                setSyncDialogOpen(true);
                              }}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Sync to Budget
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewEstimateId(estimate.id)}
                        >
                          <Eye className="h-4 w-4" />
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
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Estimate to Budget?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Mark this estimate as the budget baseline</li>
                <li>Create budget lines for each estimate item</li>
                <li>Replace any existing budget for this project</li>
              </ul>
              <p className="mt-4 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncToBudget}>
              <Zap className="h-4 w-4 mr-2" />
              Sync to Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EstimateDetailsSheet
        estimateId={viewEstimateId}
        open={!!viewEstimateId}
        onOpenChange={(open) => {
          if (!open) setViewEstimateId(null);
        }}
      />
    </>
  );
}
