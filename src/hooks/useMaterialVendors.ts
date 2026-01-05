import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/company/CompanyProvider';

export interface MaterialVendor {
  id: string;
  name: string;
  company_name: string | null;
  trade_id: string | null;
  default_cost_code_id: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  trades?: {
    id: string;
    name: string;
  };
  cost_codes?: {
    id: string;
    code: string;
    name: string;
  };
}

/** Convert empty string to null for UUID fields */
function emptyToNull(val: string | undefined | null): string | null {
  return val && val.trim() !== '' ? val : null;
}

export function useMaterialVendors(activeOnly = false) {
  return useQuery({
    queryKey: ['material-vendors', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('material_vendors')
        .select(`
          *,
          trades (id, name),
          cost_codes (id, code, name)
        `)
        .order('name');

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialVendor[];
    },
  });
}

export function useCreateMaterialVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (vendor: Omit<MaterialVendor, 'id' | 'created_at' | 'updated_at' | 'trades' | 'cost_codes' | 'company_id'>) => {
      if (!activeCompanyId) {
        throw new Error('No company selected. Please select or create a company first.');
      }

      // Clean up empty strings to null for uuid columns
      const cleanedVendor = {
        ...vendor,
        trade_id: emptyToNull(vendor.trade_id),
        default_cost_code_id: emptyToNull(vendor.default_cost_code_id),
        company_name: emptyToNull(vendor.company_name),
        phone: emptyToNull(vendor.phone),
        email: emptyToNull(vendor.email),
        notes: emptyToNull(vendor.notes),
        company_id: activeCompanyId,
      };

      const { data, error } = await supabase
        .from('material_vendors')
        .insert([cleanedVendor])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-vendors'] });
      toast({
        title: 'Success',
        description: 'Material vendor created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMaterialVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaterialVendor> }) => {
      // Clean up empty strings to null for uuid columns
      const cleanedUpdates = {
        ...updates,
        trade_id: emptyToNull(updates.trade_id),
        default_cost_code_id: emptyToNull(updates.default_cost_code_id),
        company_name: emptyToNull(updates.company_name),
        phone: emptyToNull(updates.phone),
        email: emptyToNull(updates.email),
        notes: emptyToNull(updates.notes),
      };

      const { data, error } = await supabase
        .from('material_vendors')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-vendors'] });
      toast({
        title: 'Success',
        description: 'Material vendor updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMaterialVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-vendors'] });
      toast({
        title: 'Success',
        description: 'Material vendor deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
