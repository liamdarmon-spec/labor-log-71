// src/hooks/useProposalData.ts
// Fetches proposal with all related data: project, estimate, scope blocks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposalSettings {
  show_project_info: boolean;
  show_client_info: boolean;
  show_address: boolean;
  show_scope_summary: boolean;
  show_line_items: boolean;
  show_line_item_totals: boolean;
  group_line_items_by_area: boolean;
  show_allowances: boolean;
  show_exclusions: boolean;
  show_payment_schedule: boolean;
  show_terms: boolean;
  show_signature_block: boolean;
  payment_schedule: PaymentScheduleItem[];
  terms_text: string;
  exclusions_text: string;
  allowances_text: string;
}

export interface PaymentScheduleItem {
  id: string;
  label: string;
  percentage?: number;
  amount?: number;
  due_on?: string;
}

export interface ScopeLineItem {
  id: string;
  area_label: string | null;
  group_label: string | null;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  cost_code_id: string | null;
  cost_code?: {
    code: string;
    name: string;
  } | null;
}

export interface AreaSummary {
  area_label: string;
  subtotal: number;
  items: ScopeLineItem[];
}

export interface ProposalData {
  id: string;
  project_id: string;
  primary_estimate_id: string | null;
  title: string;
  status: string;
  intro_text: string | null;
  settings: ProposalSettings;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  proposal_date: string;
  validity_days: number;
  client_name: string | null;
  client_email: string | null;
  acceptance_status: string;
  public_token: string | null;
  created_at: string;
  updated_at: string;
  
  // Related data
  project: {
    id: string;
    project_name: string;
    client_name: string;
    address: string | null;
  } | null;
  
  estimate: {
    id: string;
    title: string;
    total_amount: number;
    subtotal_amount: number;
    tax_amount: number;
    updated_at: string;
  } | null;
  
  // Scope data from estimate
  scopeByArea: AreaSummary[];
  allItems: ScopeLineItem[];
}

const defaultSettings: ProposalSettings = {
  show_project_info: true,
  show_client_info: true,
  show_address: true,
  show_scope_summary: true,
  show_line_items: true,
  show_line_item_totals: true,
  group_line_items_by_area: true,
  show_allowances: true,
  show_exclusions: true,
  show_payment_schedule: false,
  show_terms: true,
  show_signature_block: true,
  payment_schedule: [],
  terms_text: '',
  exclusions_text: '',
  allowances_text: '',
};

export function useProposalData(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['proposal-data', proposalId],
    queryFn: async (): Promise<ProposalData | null> => {
      if (!proposalId) return null;

      // Fetch proposal with project
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (id, project_name, client_name, address)
        `)
        .eq('id', proposalId)
        .maybeSingle();

      if (proposalError) throw proposalError;
      if (!proposal) return null;

      // Fetch estimate if linked
      let estimate = null;
      if (proposal.primary_estimate_id) {
        const { data: estData } = await supabase
          .from('estimates')
          .select('id, title, total_amount, subtotal_amount, tax_amount, updated_at')
          .eq('id', proposal.primary_estimate_id)
          .maybeSingle();
        estimate = estData;
      }

      // Fetch scope items from estimate's scope_blocks
      let allItems: ScopeLineItem[] = [];
      if (proposal.primary_estimate_id) {
        const { data: blocks } = await supabase
          .from('scope_blocks')
          .select(`
            id,
            scope_block_cost_items (
              id, area_label, group_label, category,
              description, quantity, unit, unit_price,
              markup_percent, line_total, cost_code_id,
              cost_codes (code, name)
            )
          `)
          .eq('entity_type', 'estimate')
          .eq('entity_id', proposal.primary_estimate_id)
          .eq('block_type', 'cost_items');

        if (blocks) {
          allItems = blocks.flatMap((block: any) =>
            (block.scope_block_cost_items || []).map((item: any) => ({
              id: item.id,
              area_label: item.area_label,
              group_label: item.group_label,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              markup_percent: item.markup_percent,
              line_total: item.line_total,
              cost_code_id: item.cost_code_id,
              cost_code: item.cost_codes,
            }))
          );
        }
      }

      // Group items by area
      const areaMap = new Map<string, ScopeLineItem[]>();
      allItems.forEach((item) => {
        const areaKey = item.area_label || 'General';
        if (!areaMap.has(areaKey)) {
          areaMap.set(areaKey, []);
        }
        areaMap.get(areaKey)!.push(item);
      });

      const scopeByArea: AreaSummary[] = Array.from(areaMap.entries()).map(
        ([area_label, items]) => ({
          area_label,
          subtotal: items.reduce((sum, item) => sum + (item.line_total || 0), 0),
          items,
        })
      );

      // Parse settings with defaults
      const rawSettings = (proposal.settings && typeof proposal.settings === 'object') 
        ? proposal.settings as Record<string, unknown>
        : {};
      const settings: ProposalSettings = {
        ...defaultSettings,
        ...(rawSettings as Partial<ProposalSettings>),
      };

      return {
        id: proposal.id,
        project_id: proposal.project_id,
        primary_estimate_id: proposal.primary_estimate_id,
        title: proposal.title,
        status: proposal.status,
        intro_text: proposal.intro_text,
        settings,
        subtotal_amount: proposal.subtotal_amount,
        tax_amount: proposal.tax_amount,
        total_amount: proposal.total_amount,
        proposal_date: proposal.proposal_date,
        validity_days: proposal.validity_days,
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        acceptance_status: proposal.acceptance_status,
        public_token: proposal.public_token,
        created_at: proposal.created_at,
        updated_at: proposal.updated_at,
        project: proposal.projects,
        estimate,
        scopeByArea,
        allItems,
      };
    },
    enabled: !!proposalId,
    staleTime: 30000,
  });
}

export function useUpdateProposalField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: string;
      value: any;
    }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Proposal not found');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-data', data.id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });
}

export function useUpdateProposalSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      settings,
    }: {
      id: string;
      settings: Partial<ProposalSettings>;
    }) => {
      // First get current settings
      const { data: current } = await supabase
        .from('proposals')
        .select('settings')
        .eq('id', id)
        .maybeSingle();

      const currentSettings = (current?.settings && typeof current.settings === 'object') 
        ? current.settings as Record<string, unknown>
        : {};

      const mergedSettings = {
        ...defaultSettings,
        ...currentSettings,
        ...settings,
      };

      const { data, error } = await supabase
        .from('proposals')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ settings: mergedSettings as any, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Proposal not found');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-data', data.id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}

export function useRefreshProposalFromEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      // Get proposal's linked estimate
      const { data: proposal } = await supabase
        .from('proposals')
        .select('primary_estimate_id')
        .eq('id', proposalId)
        .maybeSingle();

      if (!proposal?.primary_estimate_id) {
        throw new Error('No estimate linked to this proposal');
      }

      // Get latest estimate totals
      const { data: estimate } = await supabase
        .from('estimates')
        .select('subtotal_amount, tax_amount, total_amount')
        .eq('id', proposal.primary_estimate_id)
        .maybeSingle();

      if (!estimate) {
        throw new Error('Estimate not found');
      }

      // Update proposal with new totals
      const { data, error } = await supabase
        .from('proposals')
        .update({
          subtotal_amount: estimate.subtotal_amount,
          tax_amount: estimate.tax_amount,
          total_amount: estimate.total_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Proposal not found');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-data', data.id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal updated from estimate');
    },
    onError: (error: Error) => {
      toast.error('Failed to refresh: ' + error.message);
    },
  });
}
