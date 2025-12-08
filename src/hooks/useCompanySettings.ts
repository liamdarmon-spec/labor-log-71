// src/hooks/useCompanySettings.ts
// Read-only company identity settings (name, license, contact info)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  name: string;
  legal_name: string | null;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  brand_color_primary: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      // If table is empty, treat as null – frontend will fall back to defaults
      if (error) {
        // If PostgREST "no rows" error, just return null
        if ((error as any).code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as CompanySettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
