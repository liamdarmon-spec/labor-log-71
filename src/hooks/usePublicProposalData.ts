// src/hooks/usePublicProposalData.ts
// Fetches proposal via public token - same data structure as useProposalData

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ProposalData, 
  ProposalSettings, 
  ScopeLineItem, 
  AreaSummary 
} from './useProposalData';

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

export function usePublicProposalData(token: string | undefined) {
  return useQuery({
    queryKey: ['public-proposal-data', token],
    queryFn: async (): Promise<ProposalData | null> => {
      if (!token) return null;

      // Fetch proposal by public_token with project
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (id, project_name, client_name, address)
        `)
        .eq('public_token', token)
        .maybeSingle();

      if (proposalError) throw proposalError;
      if (!proposal) return null;

      // Check token expiration
      if (proposal.token_expires_at && new Date(proposal.token_expires_at) < new Date()) {
        throw new Error('This proposal link has expired');
      }

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
    enabled: !!token,
    staleTime: 30000,
  });
}
