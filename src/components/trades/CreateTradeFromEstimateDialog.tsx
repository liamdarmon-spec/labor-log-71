/**
 * CreateTradeFromEstimateDialog - Create a new trade from estimate builder
 * 
 * Creates a trade with its 3 default cost codes (L/M/S) and returns the appropriate
 * cost code ID based on the defaultCategory prop.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { createTradeWithDefaultCostCodes } from '@/lib/trades';
import { useQueryClient } from '@tanstack/react-query';

const tradeNameSchema = z.object({
  name: z.string().trim().min(1, 'Trade name is required').max(100),
});

type TradeNameFormValues = z.infer<typeof tradeNameSchema>;

interface CreateTradeFromEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory: 'labor' | 'subs' | 'materials' | 'equipment' | 'other';
  onCreated: (payload: {
    tradeId: string;
    name: string;
    defaultLaborCostCodeId: string | null;
    defaultSubCostCodeId: string | null;
    defaultMaterialCostCodeId: string | null;
  }) => void;
}

export function CreateTradeFromEstimateDialog({
  open,
  onOpenChange,
  defaultCategory,
  onCreated,
}: CreateTradeFromEstimateDialogProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<TradeNameFormValues>({
    resolver: zodResolver(tradeNameSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: TradeNameFormValues) => {
    try {
      setIsCreating(true);

      const result = await createTradeWithDefaultCostCodes(data.name);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['cost_codes'] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-select'] });
      queryClient.invalidateQueries({ queryKey: ['trade-cost-codes'] });

      toast.success(`Trade "${result.trade.name}" created with cost codes`);

      // Call onCreated callback
      onCreated({
        tradeId: result.trade.id,
        name: result.trade.name,
        defaultLaborCostCodeId: result.defaultLaborCostCodeId,
        defaultSubCostCodeId: result.defaultSubCostCodeId,
        defaultMaterialCostCodeId: result.defaultMaterialCostCodeId,
      });

      // Reset form and close
      form.reset();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trade';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Trade</DialogTitle>
          <DialogDescription>
            Create a new trade (e.g., Aluminum, Stucco, Roofing). This will automatically
            create 3 cost codes: {defaultCategory === 'labor' ? 'Labor' : defaultCategory === 'subs' ? 'Sub-Contractor' : 'Materials'} will be selected automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Aluminum, Stucco, Roofing"
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Examples: Aluminum, Stucco, Roofing
                  </p>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Trade'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
