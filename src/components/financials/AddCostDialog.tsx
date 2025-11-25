import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useSubs } from '@/hooks/useSubs';
import { useCostCodes } from '@/hooks/useCostCodes';
import { useCreateCost } from '@/hooks/useCosts';
import { toast } from 'sonner';

const costSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  company_id: z.string().optional(),
  vendor_type: z.enum(['sub', 'supplier', 'other']).optional(),
  vendor_id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  category: z.enum(['subs', 'materials', 'misc']),
  date_incurred: z.string(),
  status: z.enum(['unpaid', 'paid']),
  cost_code_id: z.string().optional(),
  notes: z.string().optional(),
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
  const { data: costCodes } = useCostCodes();
  const createCost = useCreateCost();

  const form = useForm<CostFormValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      date_incurred: new Date().toISOString().split('T')[0],
      status: 'unpaid',
      category: 'misc',
      amount: 0,
    },
  });

  const onSubmit = async (data: CostFormValues) => {
    try {
      await createCost.mutateAsync({
        project_id: data.project_id,
        company_id: data.company_id || null,
        vendor_type: data.vendor_type || null,
        vendor_id: data.vendor_id || null,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date_incurred: data.date_incurred,
        status: data.status,
        cost_code_id: data.cost_code_id || null,
        notes: data.notes || null,
        payment_id: null,
      });
      toast.success('Cost added successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add cost');
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="subs">Subcontractors</SelectItem>
                        <SelectItem value="materials">Materials</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Cost Code</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cost code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costCodes?.map((code) => (
                          <SelectItem key={code.id} value={code.id}>
                            {code.code} - {code.name}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cost description" {...field} />
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
                    <Textarea placeholder="Additional notes (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCost.isPending}>
                {createCost.isPending ? 'Adding...' : 'Add Cost'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
