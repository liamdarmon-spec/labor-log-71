/**
 * CreateCostCodeDialog - Inline cost code creation during estimating
 * 
 * Allows users to create new cost codes on-the-fly while building estimates.
 * Auto-generates code using canonical suffix pattern based on category and trade.
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTradesSimple } from '@/hooks/useTrades';
import { addToRecentlyUsed } from './CostCodeSelect';

const costCodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['labor', 'subs', 'materials', 'equipment', 'other']),
  trade_id: z.string().optional().or(z.undefined()),
});

type CostCodeFormValues = z.infer<typeof costCodeSchema>;

interface CreateCostCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (costCodeId: string) => void;
  defaultCategory?: 'labor' | 'subs' | 'materials' | 'equipment' | 'other';
}

/**
 * Generate cost code based on trade and category
 * Follows canonical suffix pattern: ${TRADE-NAME}-${SUFFIX}
 * - labor → -L
 * - subs → -S
 * - materials → -M
 * - other → no suffix
 */
function generateCostCode(
  tradeName: string | null,
  category: 'labor' | 'subs' | 'materials' | 'equipment' | 'other'
): string {
  const suffixMap: Record<string, string> = {
    labor: '-L',
    subs: '-S',
    materials: '-M',
    equipment: '-M', // Equipment uses materials suffix
    other: '',
  };

  const suffix = suffixMap[category] || '';
  
  if (tradeName) {
    // Use first 3-5 chars of trade name, uppercase
    const prefix = tradeName.substring(0, 5).toUpperCase().replace(/\s+/g, '');
    return `${prefix}${suffix}`;
  }
  
  // No trade: use CUSTOM prefix
  return `CUSTOM${suffix}`;
}

export function CreateCostCodeDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory = 'materials',
}: CreateCostCodeDialogProps) {
  const queryClient = useQueryClient();
  const { data: trades = [] } = useTradesSimple();
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const form = useForm<CostCodeFormValues>({
    resolver: zodResolver(costCodeSchema),
    defaultValues: {
      name: '',
      category: defaultCategory,
      trade_id: undefined,
    },
  });

  const createCostCodeMutation = useMutation({
    mutationFn: async (data: CostCodeFormValues) => {
      // Get trade name if trade_id provided
      const trade = data.trade_id ? trades.find((t) => t.id === data.trade_id) : null;
      const tradeName = trade?.name || null;

      // Generate code
      const code = generateCostCode(tradeName, data.category);

      // Check if code already exists
      setIsCheckingCode(true);
      const { data: existing } = await supabase
        .from('cost_codes')
        .select('id, code')
        .eq('code', code)
        .maybeSingle();

      if (existing) {
        // Code exists - append number
        let finalCode = code;
        let counter = 1;
        while (true) {
          const { data: check } = await supabase
            .from('cost_codes')
            .select('id')
            .eq('code', finalCode)
            .maybeSingle();
          
          if (!check) break;
          counter++;
          finalCode = `${code}-${counter}`;
        }
        
        // Insert with unique code
        const { data: newCode, error } = await supabase
          .from('cost_codes')
          .insert({
            code: finalCode,
            name: data.name,
            category: data.category,
            trade_id: data.trade_id ?? null,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return newCode;
      } else {
        // Code doesn't exist - use generated code
        const { data: newCode, error } = await supabase
          .from('cost_codes')
          .insert({
            code,
            name: data.name,
            category: data.category,
            trade_id: data.trade_id ?? null,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return newCode;
      }
    },
    onSuccess: (data) => {
      // Invalidate cost codes queries
      queryClient.invalidateQueries({ queryKey: ['cost_codes'] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-select'] });
      queryClient.invalidateQueries({ queryKey: ['trade-cost-codes'] });

      // Add to recently used
      addToRecentlyUsed(data.id);

      toast.success(`Cost code ${data.code} created`);
      
      // Call onSuccess callback with new cost code ID
      onSuccess?.(data.id);
      
      // Reset form and close
      form.reset();
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

  // Preview generated code
  const selectedTrade = form.watch('trade_id');
  const selectedCategory = form.watch('category');
  const trade = selectedTrade ? trades.find((t) => t.id === selectedTrade) : null;
  const previewCode = generateCostCode(trade?.name || null, selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Cost Code</DialogTitle>
          <DialogDescription>
            Create a new cost code that will be available immediately in your estimate.
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
                      placeholder="e.g., Painting Labor, Drywall Materials"
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
                      // Handle empty value by setting to undefined
                      field.onChange(value === "__none__" ? undefined : value);
                    }}
                    value={field.value ?? undefined}
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
                    Selecting a trade will auto-generate the code prefix from the trade name.
                  </p>
                </FormItem>
              )}
            />

            {/* Code Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Generated Code</Label>
              <p className="text-sm font-mono font-semibold mt-1">{previewCode}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Code will be auto-generated based on trade and category.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
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
                  ? 'Creating...'
                  : 'Create Cost Code'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
