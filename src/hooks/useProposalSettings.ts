import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposalEstimateSettings {
  id: string;
  company_id: string | null;
  setting_type: 'proposal' | 'estimate' | 'global';
  default_terms: string | null;
  default_markup_labor: number;
  default_markup_materials: number;
  default_markup_subs: number;
  default_margin_percent: number;
  branding_logo_url: string | null;
  branding_colors: any;
  template_config: any;
  ai_enabled: boolean;
  ai_settings: any;
  created_at: string;
  updated_at: string;
}

export function useProposalSettings(companyId?: string, settingType: 'proposal' | 'estimate' | 'global' = 'global') {
  return useQuery({
    queryKey: ['proposal-settings', companyId, settingType],
    queryFn: async () => {
      let query = supabase
        .from('proposal_estimate_settings')
        .select('*')
        .eq('setting_type', settingType);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as ProposalEstimateSettings | null;
    },
  });
}

export function useUpsertProposalSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<ProposalEstimateSettings> & { setting_type: 'proposal' | 'estimate' | 'global' }) => {
      const { data, error } = await supabase
        .from('proposal_estimate_settings')
        .upsert([settings as any], {
          onConflict: 'company_id,setting_type',
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to save settings');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    },
  });
}
