/**
 * PaymentDrawer - Unified payment creation component for AP costs
 * 
 * Supports both single and batch payment modes:
 * - Single mode: Pay one cost
 * - Batch mode: Pay multiple costs (one payment, multiple payment_items)
 * 
 * Always creates vendor_payments + vendor_payment_items records.
 * Never directly updates costs.status - relies on database trigger.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useSubs } from '@/hooks/useSubs';

const paymentSchema = z.object({
  payment_date: z.string().min(1, 'Payment date is required'),
  vendor_type: z.enum(['sub', 'supplier', 'other']),
  vendor_id: z.string().min(1, 'Vendor is required'),
  method: z.enum(['ach', 'check', 'card', 'cash', 'other']),
  reference: z.string().optional(),
  memo: z.string().optional(),
  // For batch mode, this is the total payment amount
  total_amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface CostItem {
  id: string;
  amount: number;
  paid_amount: number;
  retention_amount?: number | null;
  description: string;
  project_id?: string;
  projects?: { project_name?: string };
  subs?: { name?: string; company_name?: string };
  vendor_id?: string | null;
  vendor_type?: string | null;
}

interface PaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'batch';
  costs: CostItem[];
  defaultVendorId?: string;
  defaultVendorType?: 'sub' | 'supplier' | 'other';
}

export function PaymentDrawer({
  open,
  onOpenChange,
  mode,
  costs,
  defaultVendorId,
  defaultVendorType,
}: PaymentDrawerProps) {
  const queryClient = useQueryClient();
  const [appliedAmounts, setAppliedAmounts] = useState<Record<string, number>>({});
  const { data: subs } = useSubs(); // For vendor selector when vendor_type = 'sub'

  // Initialize applied amounts for batch mode
  useEffect(() => {
    if (mode === 'batch' && costs.length > 0) {
      const initialAmounts: Record<string, number> = {};
      costs.forEach((cost) => {
        const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
        // For subs, subtract retention from payable amount
        const payableAmount = cost.retention_amount
          ? unpaidAmount - (cost.retention_amount || 0)
          : unpaidAmount;
        initialAmounts[cost.id] = Math.max(0, payableAmount);
      });
      setAppliedAmounts(initialAmounts);
    } else if (mode === 'single' && costs.length === 1) {
      const cost = costs[0];
      const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
      const payableAmount = cost.retention_amount
        ? unpaidAmount - (cost.retention_amount || 0)
        : unpaidAmount;
      setAppliedAmounts({ [cost.id]: Math.max(0, payableAmount) });
    }
  }, [mode, costs]);

  // Get vendor info from first cost if not provided
  const firstCost = costs[0];
  const vendorId = defaultVendorId || firstCost?.vendor_id || '';
  const vendorType = defaultVendorType || (firstCost?.vendor_type as 'sub' | 'supplier' | 'other') || 'other';

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      vendor_type: vendorType,
      vendor_id: vendorId,
      method: 'ach',
      reference: '',
      memo: '',
      total_amount: 0, // Will be set by useEffect
    },
  });

  // Update form when costs or appliedAmounts change
  useEffect(() => {
    if (mode === 'batch') {
      const total = Object.values(appliedAmounts).reduce((sum, amt) => sum + amt, 0);
      form.setValue('total_amount', total);
    } else if (mode === 'single' && costs.length === 1) {
      const cost = costs[0];
      const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
      const payableAmount = cost.retention_amount
        ? unpaidAmount - (cost.retention_amount || 0)
        : unpaidAmount;
      form.setValue('total_amount', Math.max(0, payableAmount));
    }
  }, [appliedAmounts, mode, costs, form]);

  // Initialize vendor_id and vendor_type when drawer opens or costs change
  useEffect(() => {
    if (open && costs.length > 0) {
      const firstCost = costs[0];
      const vendorId = defaultVendorId || firstCost?.vendor_id || '';
      const vendorType = defaultVendorType || (firstCost?.vendor_type as 'sub' | 'supplier' | 'other') || 'other';
      
      form.setValue('vendor_id', vendorId);
      form.setValue('vendor_type', vendorType);
    }
  }, [open, costs, defaultVendorId, defaultVendorType, form]);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      // Validate applied amounts match total
      const totalApplied = Object.values(appliedAmounts).reduce((sum, amt) => sum + amt, 0);
      if (Math.abs(totalApplied - data.total_amount) > 0.01) {
        throw new Error(`Applied amounts (${totalApplied.toFixed(2)}) must equal total payment (${data.total_amount.toFixed(2)})`);
      }

      // Create vendor_payment record
      const { data: payment, error: paymentError } = await supabase
        .from('vendor_payments')
        .insert({
          company_id: null, // Can be derived from project if needed
          vendor_type: data.vendor_type,
          vendor_id: data.vendor_id,
          payment_date: data.payment_date,
          amount: data.total_amount,
          method: data.method,
          reference: data.reference || null,
          notes: data.memo || null,
          status: 'recorded',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;
      if (!payment) throw new Error('Failed to create payment');

      // Create vendor_payment_items records
      const paymentItems = costs.map((cost) => ({
        payment_id: payment.id,
        cost_id: cost.id,
        applied_amount: appliedAmounts[cost.id] || 0,
      })).filter(item => item.applied_amount > 0); // Only include items with amount > 0

      if (paymentItems.length === 0) {
        throw new Error('At least one cost must have an applied amount > 0');
      }

      const { error: itemsError } = await supabase
        .from('vendor_payment_items')
        .insert(paymentItems as any); // Type assertion until Supabase types are regenerated

      if (itemsError) throw itemsError;

      return { payment, paymentItems };
    },
    onSuccess: () => {
      toast.success(
        mode === 'batch'
          ? `Payment created for ${costs.length} cost(s)`
          : 'Payment created successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['costs'] });
      queryClient.invalidateQueries({ queryKey: ['costs-summary'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-sub-costs'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['unified-project-budget'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payment: ${error.message}`);
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    createPaymentMutation.mutate(data);
  };

  const totalApplied = Object.values(appliedAmounts).reduce((sum, amt) => sum + amt, 0);
  const totalUnpaid = costs.reduce((sum, cost) => {
    const unpaid = (cost.amount || 0) - (cost.paid_amount || 0);
    return sum + unpaid;
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === 'batch' ? 'Create Batch Payment' : 'Apply Payment'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'batch'
              ? `Create a single payment for ${costs.length} selected cost(s)`
              : 'Record payment for this cost'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* Payment Details */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendor_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Type *</FormLabel>
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
                          <SelectItem value="sub">Subcontractor</SelectItem>
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
                      <FormLabel>Vendor *</FormLabel>
                      {form.watch('vendor_type') === 'sub' && subs ? (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!defaultVendorId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcontractor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subs.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name || sub.company_name || sub.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input
                            placeholder={defaultVendorId ? "Vendor ID (pre-filled)" : "Enter vendor UUID"}
                            {...field}
                            readOnly={!!defaultVendorId}
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                      {defaultVendorId && (
                        <p className="text-xs text-muted-foreground">
                          Pre-filled from selected cost(s)
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method *</FormLabel>
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
                          <SelectItem value="ach">ACH</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="card">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference / Check #</FormLabel>
                      <FormControl>
                        <Input placeholder="Check #, transaction ID, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Payment notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Costs List (Batch Mode) */}
            {mode === 'batch' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Costs to Pay</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Unpaid</TableHead>
                        <TableHead className="text-right">Apply Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map((cost) => {
                        const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
                        const payableAmount = cost.retention_amount
                          ? unpaidAmount - (cost.retention_amount || 0)
                          : unpaidAmount;
                        const maxAmount = Math.max(0, payableAmount);

                        return (
                          <TableRow key={cost.id}>
                            <TableCell className="font-medium">
                              {cost.description || '-'}
                            </TableCell>
                            <TableCell>
                              {cost.projects?.project_name || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              ${(cost.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${(cost.paid_amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${unpaidAmount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={maxAmount}
                                value={appliedAmounts[cost.id] || 0}
                                onChange={(e) => {
                                  const newAmount = parseFloat(e.target.value) || 0;
                                  setAppliedAmounts((prev) => ({
                                    ...prev,
                                    [cost.id]: Math.min(maxAmount, Math.max(0, newAmount)),
                                  }));
                                }}
                                className="text-right"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Total Applied:</span>
                  <span className="text-lg font-bold">${totalApplied.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Single Mode Amount */}
            {mode === 'single' && costs.length === 1 && (
              <div className="space-y-2">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cost:</span>
                    <span className="font-medium">{costs[0].description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount:</span>
                    <span>${(costs[0].amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Already Paid:</span>
                    <span>${(costs[0].paid_amount || 0).toFixed(2)}</span>
                  </div>
                  {costs[0].retention_amount && (
                    <div className="flex justify-between text-amber-600">
                      <span className="text-sm">Retention Held:</span>
                      <span>${(costs[0].retention_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Unpaid Amount:</span>
                    <span>${totalUnpaid.toFixed(2)}</span>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalUnpaid}
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            setAppliedAmounts({ [costs[0].id]: value });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Maximum: ${totalUnpaid.toFixed(2)}
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Validation Message */}
            {mode === 'batch' && Math.abs(totalApplied - form.watch('total_amount')) > 0.01 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Applied amounts (${totalApplied.toFixed(2)}) must equal total payment amount (${form.watch('total_amount').toFixed(2)})
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createPaymentMutation.isPending ||
                  (mode === 'batch' && Math.abs(totalApplied - form.watch('total_amount')) > 0.01)
                }
              >
                {createPaymentMutation.isPending ? 'Creating...' : 'Create Payment'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
