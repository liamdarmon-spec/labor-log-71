// src/components/cost-codes/CreateCostCodeDialog.tsx

/**
 * CreateCostCodeDialog - Inline cost code creation during estimating
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTradesSimple } from "@/hooks/useTrades";
import { addToRecentlyUsed } from "./CostCodeSelect";

const costCodeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["labor", "subs", "materials", "equipment", "other"]),
  trade_id: z.string().optional().or(z.undefined()),
});

type CostCodeFormValues = z.infer<typeof costCodeSchema>;

interface CreateCostCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (costCodeId: string) => void;
  defaultCategory?: "labor" | "subs" | "materials" | "equipment" | "other";
  presetMode?: "fee" | "default";
}

/**
 * Generate cost code based on trade and category
 */
function generateCostCode(
  tradeName: string | null,
  category: "labor" | "subs" | "materials" | "equipment" | "other"
): string {
  const suffixMap: Record<string, string> = {
    labor: "-L",
    subs: "-S",
    materials: "-M",
    equipment: "-EQ",
    other: "",
  };

  const suffix = suffixMap[category] || "";

  if (tradeName) {
    const prefix = tradeName.toUpperCase().replace(/\s+/g, "");
    return `${prefix}${suffix}`;
  }

  if (category === "other") {
    return "FEE";
  }

  return `CUSTOM${suffix}`;
}

export function CreateCostCodeDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory = "materials",
  presetMode = "default",
}: CreateCostCodeDialogProps) {
  const queryClient = useQueryClient();
  const { data: trades = [] } = useTradesSimple();
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const effectiveCategory =
    presetMode === "fee" ? "other" : defaultCategory;

  const form = useForm<CostCodeFormValues>({
    resolver: zodResolver(costCodeSchema),
    defaultValues: {
      name: "",
      category: effectiveCategory,
      trade_id: undefined,
    },
  });

  const createCostCodeMutation = useMutation({
    mutationFn: async (data: CostCodeFormValues) => {
      const trade = data.trade_id ? trades.find((t) => t.id === data.trade_id) : null;
      const tradeName = trade?.name || null;

      const code = generateCostCode(tradeName, data.category);

      setIsCheckingCode(true);
      const { data: existing } = await supabase
        .from("cost_codes")
        .select("id, code")
        .eq("code", code)
        .maybeSingle();

      let finalCode = code;

      if (existing) {
        let counter = 1;
        while (true) {
          const candidate = `${code}-${counter}`;
          const { data: check } = await supabase
            .from("cost_codes")
            .select("id")
            .eq("code", candidate)
            .maybeSingle();
          if (!check) {
            finalCode = candidate;
            break;
          }
          counter++;
        }
      }

      const { data: newCode, error } = await supabase
        .from("cost_codes")
        .insert({
          code: finalCode,
          name: data.name,
          category: data.category,
          trade_id: data.trade_id ?? null,
          is_active: true,
        })
        .select()
        .single();

      if (error || !newCode) {
        throw new Error(error?.message ?? "Failed to create cost code");
      }

      return newCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cost_codes"] });
      queryClient.invalidateQueries({ queryKey: ["cost-codes-select"] });
      queryClient.invalidateQueries({ queryKey: ["trade-cost-codes"] });

      addToRecentlyUsed(data.id);

      toast.success(`Cost code ${data.code} created`);

      onSuccess?.(data.id);

      form.reset({
        name: "",
        category: effectiveCategory,
        trade_id: undefined,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cost code: ${error.message}`);
    },
    onSettled: () => {
      setIsCheckingCode(false);
    },
  });

  const onSubmit = (data: CostCodeFormValues) => {
    createCostCodeMutation.mutate(data);
  };

  const selectedTrade = form.watch("trade_id");
  const selectedCategory = form.watch("category");
  const trade = selectedTrade ? trades.find((t) => t.id === selectedTrade) : null;
  const previewCode = generateCostCode(trade?.name || null, selectedCategory);

  const title =
    presetMode === "fee" ? "Create Fee / Non-Trade Cost Code" : "Create New Cost Code";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {presetMode === "fee"
              ? "Create a non-trade fee code (office, misc, personal, etc.)."
              : "Create a new cost code that will be available immediately in your estimate."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        presetMode === "fee"
                          ? "e.g., Office & Admin, Misc Job Expense"
                          : "e.g., Painting Labor, Drywall Materials"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="subs">Subcontractors</SelectItem>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trade_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? undefined : value);
                    }}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {trades.map((trade) => (
                        <SelectItem key={trade.id} value={trade.id}>
                          {trade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Selecting a trade will auto-generate the code prefix from the trade
                    name. For fees, you can leave this blank.
                  </p>
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">
                Generated Code
              </Label>
              <p className="text-sm font-mono font-semibold mt-1">{previewCode}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Code is auto-generated from trade and category. For fees, generic
                prefixes are used.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    category: effectiveCategory,
                    trade_id: undefined,
                  });
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCostCodeMutation.isPending || isCheckingCode}
              >
                {createCostCodeMutation.isPending || isCheckingCode
                  ? "Creating..."
                  : "Create Cost Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}