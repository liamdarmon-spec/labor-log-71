// src/hooks/useCompanySettings.ts
// Read-only company identity settings (name, license, contact info)
// NOTE: This hook will work once company_settings table is created via migration

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

// Default fallback settings when table doesn't exist yet
const DEFAULT_SETTINGS: CompanySettings = {
  id: '',
  name: 'FORMA Homes',
  legal_name: null,
  license_number: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  logo_url: null,
  brand_color_primary: '#111827',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      // Return defaults until company_settings table is created via migration
      // Once the table exists and types are regenerated, this can query the actual table
      return DEFAULT_SETTINGS;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
