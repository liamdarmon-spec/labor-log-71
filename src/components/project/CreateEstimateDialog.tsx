// src/components/project/CreateEstimateDialog.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/company/CompanyProvider";

interface CreateEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: (estimateId: string) => void;
}

export function CreateEstimateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateEstimateDialogProps) {
  const [title, setTitle] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("No active company selected");
      const { data, error } = await supabase
        .from("estimates")
        .insert({
          company_id: activeCompanyId,
          project_id: projectId,
          title: title || "New Estimate",
          status: "draft",
          subtotal_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          is_budget_source: false,
        })
        .select("id")
        .single<{ id: string }>();

      if (error) throw error;
      return data.id;
    },
    onSuccess: (newId) => {
      toast({
        title: "Estimate created",
        description: "You can now add scope blocks and cost items.",
      });
      onOpenChange(false);
      onSuccess?.(newId);
      navigate(`/estimates/${newId}`);
    },
    onError: (err: any) => {
      console.error("Failed to create estimate", err);
      toast({
        title: "Failed to create estimate",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Estimate</DialogTitle>
          <DialogDescription>
            Create a new estimate for this project. You can add line items in the builder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Estimate Title</label>
            <Input
              placeholder="Kitchen remodel, balcony repair..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create & Open Builder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
