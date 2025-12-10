// src/components/financials/AddCostDialog.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useProjects } from "@/hooks/useProjects";
import { useCompanies } from "@/hooks/useCompanies";
import { useSubs } from "@/hooks/useSubs";
import { useCreateCost } from "@/hooks/useCosts";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const costSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  company_id: z.string().optional(),
  vendor_type: z.enum(["sub", "supplier", "other"]).optional(),
  vendor_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  category: z.enum(["subs", "materials", "misc", "equipment"]),
  date_incurred: z.string(),
  status: z.enum(["unpaid", "paid", "partially_paid"]).optional(),
  cost_code_id: z.string().min(1, "Cost code is required"),
  notes: z.string().optional(),
  paid_immediately: z.boolean().optional(),
  payment_method: z.enum(["card", "cash", "check", "ach"]).optional(),
  retention_amount: z.coerce.number().min(0).optional(),
});

type CostFormValues = z.infer<typeof costSchema>;

interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCostDialog({ open, onOpenChange }: AddCostDialogProps) {
  const { data: projects } = useProjects();
  const { data: companies } = useCompanies();
  const { data: subs } = useSubs();
  const createCost = useCreateCost();

  const form = useForm<CostFormValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      date_incurred: new Date().toISOString().split("T")[0],
      status: "unpaid",
      category: "misc",
      amount: 0,
      cost_code_id: "",
      paid_immediately: false,
      payment_method: "card",
      retention_amount: 0,
    },
  });

  const category = form.watch("category");
  const paidImmediately = form.watch("paid_immediately");
  const costCodeCategory =
    category === "subs"
      ? "subs"
      : category === "materials"
      ? "materials"
      : "other";

  const onSubmit = async (data: CostFormValues) => {
    try {
      // Create cost record
      const costData = {
        project_id: data.project_id,
        company_id: data.company_id || null,
        vendor_type: data.vendor_type || null,
        vendor_id: data.vendor_id || null,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date_incurred: data.date_incurred,
        status: data.paid_immediately ? "paid" : "unpaid",
        paid_amount: data.paid_immediately ? data.amount : 0,
        retention_amount: data.retention_amount || 0,
        cost_code_id: data.cost_code_id,
        notes: data.notes || null,
        payment_id: null, // Legacy field, will be replaced by vendor_payment_items
      };

      const { data: newCost, error: costError } = await supabase
        .from("costs")
        .insert(costData)
        .select()
        .single();

      if (costError) throw costError;

      // If "paid immediately" is checked (typically for materials), create payment record
      // NOTE: Setting status='paid' here is OK because we immediately create vendor_payment + vendor_payment_items.
      // The trigger will also update status, but setting it here provides immediate UI feedback.
      if (data.paid_immediately && newCost && data.vendor_id && data.vendor_type) {
        // Create vendor_payment record
        const { data: payment, error: paymentError } = await supabase
          .from("vendor_payments")
          .insert({
            company_id: data.company_id || null,
            vendor_type: data.vendor_type,
            vendor_id: data.vendor_id,
            payment_date: data.date_incurred,
            amount: data.amount,
            method: data.payment_method || "card",
            reference: `Auto-paid: ${data.description}`,
            notes: `Auto-created payment for cost: ${data.description}`,
            status: "recorded",
          })
          .select()
          .single();

        if (paymentError) {
          console.error("Failed to create payment:", paymentError);
          toast.warning("Cost created but payment record failed. Please create payment manually.");
        } else if (payment && newCost) {
          // Create vendor_payment_items link
          // After migration runs, column will be 'applied_amount'
          const { error: linkError } = await supabase
            .from("vendor_payment_items")
            .insert({
              payment_id: payment.id,
              cost_id: newCost.id,
              applied_amount: data.amount,
            } as any); // Type assertion needed until Supabase types are regenerated

          if (linkError) {
            console.error("Failed to create payment link:", linkError);
            toast.warning("Cost and payment created but link failed. Please verify manually.");
          }
        }
      }

      toast.success(
        data.paid_immediately
          ? "Cost added and marked as paid"
          : "Cost added successfully"
      );
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add cost");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cost</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="subs">Subcontractors</SelectItem>
                        <SelectItem value="materials">Materials</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="misc">Misc</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sub">Sub</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subs?.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_code_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Code *</FormLabel>
                    <FormControl>
                      <CostCodeSelect
                        value={field.value || null}
                        required
                        onChange={(val) =>
                          field.onChange(val ?? "")
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_incurred"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Incurred *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {category === "subs" && (
                <FormField
                  control={form.control}
                  name="retention_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retention Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Paid Immediately Toggle (for materials/equipment) */}
            {(category === "materials" || category === "equipment") && (
              <div className="space-y-4 border rounded-lg p-4">
                <FormField
                  control={form.control}
                  name="paid_immediately"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Paid Immediately (Card/Cash)</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check this if this cost was already paid (e.g., Home Depot card charge).
                          A payment record will be created automatically.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                {paidImmediately && (
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="ach">ACH</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter cost description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCost.isPending}>
                {createCost.isPending ? "Adding..." : "Add Cost"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
