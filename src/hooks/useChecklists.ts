import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type ProjectType = 'kitchen_remodel' | 'bath_remodel' | 'full_home_remodel' | 'other';
export type ChecklistPhase = 'precon' | 'rough' | 'finish' | 'punch' | 'warranty';
export type ChecklistStatus = 'open' | 'in_progress' | 'done';

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  phase: ChecklistPhase;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  checklist_template_id: string;
  sort_order: number;
  label: string;
  default_assignee_role: string | null;
  required: boolean;
}

export interface ChecklistQuestion {
  id: string;
  project_type: string;
  code: string;
  label: string;
  help_text: string | null;
  input_type: 'boolean' | 'single_select' | 'multi_select' | 'text';
  options: string[] | null;
  sort_order: number;
  is_active: boolean;
}

export interface ChecklistQuestionAnswer {
  id: string;
  estimate_id: string;
  question_id: string;
  value_boolean: boolean | null;
  value_text: string | null;
  value_json: unknown | null;
}

export interface ProjectChecklist {
  id: string;
  project_id: string;
  estimate_id: string | null;
  scope_block_id: string | null;
  project_type: string | null;
  phase: ChecklistPhase;
  title: string;
  status: ChecklistStatus;
  progress_cached: number;
  created_at: string;
  updated_at: string;
  items?: ProjectChecklistItem[];
}

export interface ProjectChecklistItem {
  id: string;
  project_checklist_id: string;
  template_item_id: string | null;
  sort_order: number;
  label: string;
  assignee_user_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by_user_id: string | null;
  notes: string | null;
  required: boolean;
}

// Fetch checklist templates by project type
export function useChecklistTemplates(projectType?: string) {
  return useQuery({
    queryKey: ['checklist-templates', projectType],
    queryFn: async () => {
      let query = supabase
        .from('checklist_templates')
        .select('*, items:checklist_template_items(*)')
        .eq('is_active', true)
        .order('phase')
        .order('name');
      
      if (projectType && projectType !== 'other') {
        query = query.or(`project_type.eq.${projectType},project_type.eq.global`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ChecklistTemplate[];
    },
    enabled: !!projectType,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch checklist questions by project type
export function useChecklistQuestions(projectType?: string) {
  return useQuery({
    queryKey: ['checklist-questions', projectType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_questions')
        .select('*')
        .eq('project_type', projectType!)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as ChecklistQuestion[];
    },
    enabled: !!projectType && projectType !== 'other',
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch question answers for an estimate
export function useChecklistAnswers(estimateId?: string) {
  return useQuery({
    queryKey: ['checklist-answers', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_question_answers')
        .select('*')
        .eq('estimate_id', estimateId!);
      
      if (error) throw error;
      return data as ChecklistQuestionAnswer[];
    },
    enabled: !!estimateId,
    staleTime: 30000,
  });
}

// Save/update question answers
export function useSaveChecklistAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      estimateId, 
      answers 
    }: { 
      estimateId: string; 
      answers: { questionId: string; valueBoolean?: boolean; valueText?: string; valueJson?: string[] }[] 
    }) => {
      const upserts = answers.map(a => ({
        estimate_id: estimateId,
        question_id: a.questionId,
        value_boolean: a.valueBoolean ?? null,
        value_text: a.valueText ?? null,
        value_json: (a.valueJson as unknown) ?? null,
      }));
      
      const { error } = await supabase
        .from('checklist_question_answers')
        .upsert(upserts as any, { onConflict: 'estimate_id,question_id' });
      
      if (error) throw error;
    },
    onSuccess: (_, { estimateId }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-answers', estimateId] });
    },
    onError: (error) => {
      console.error('Failed to save answers:', error);
      toast.error('Failed to save answers');
    },
  });
}

// Fetch project checklists
export function useProjectChecklists(projectId?: string) {
  return useQuery({
    queryKey: ['project-checklists', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_checklists')
        .select('*')
        .eq('project_id', projectId!)
        .order('phase')
        .order('title');
      
      if (error) throw error;
      return data as ProjectChecklist[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

// Fetch single checklist with items
export function useProjectChecklist(checklistId?: string) {
  return useQuery({
    queryKey: ['project-checklist', checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_checklists')
        .select('*, items:project_checklist_items(*)')
        .eq('id', checklistId!)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) {
        throw new Error('Checklist not found');
      }
      return data as ProjectChecklist;
    },
    enabled: !!checklistId,
    staleTime: 30000,
  });
}

// Generate checklists from templates
export function useGenerateChecklists() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      projectId,
      estimateId,
      projectType,
      templateIds,
      scopeBlockId,
    }: {
      projectId: string;
      estimateId: string;
      projectType: string;
      templateIds: string[];
      scopeBlockId?: string;
    }) => {
      // Fetch templates with items
      const { data: templates, error: templateError } = await supabase
        .from('checklist_templates')
        .select('*, items:checklist_template_items(*)')
        .in('id', templateIds);
      
      if (templateError) throw templateError;
      
      const createdChecklists: string[] = [];
      
      for (const template of templates || []) {
        // Check if checklist already exists
        const { data: existing } = await supabase
          .from('project_checklists')
          .select('id')
          .eq('project_id', projectId)
          .eq('phase', template.phase)
          .eq('project_type', projectType)
          .eq('title', template.name)
          .maybeSingle();
        
        if (existing) {
          continue; // Skip duplicates
        }
        
        // Create checklist
        const { data: checklist, error: checklistError } = await supabase
          .from('project_checklists')
          .insert({
            project_id: projectId,
            estimate_id: estimateId,
            scope_block_id: scopeBlockId,
            project_type: projectType,
            phase: template.phase,
            title: template.name,
            status: 'open',
            progress_cached: 0,
          })
          .select()
          .maybeSingle();
        
        if (checklistError) throw checklistError;
        if (!checklist) {
          throw new Error('Failed to create checklist');
        }
        
        // Create checklist items
        const items = (template.items || []).map((item: ChecklistTemplateItem) => ({
          project_checklist_id: checklist.id,
          template_item_id: item.id,
          sort_order: item.sort_order,
          label: item.label,
          required: item.required,
        }));
        
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from('project_checklist_items')
            .insert(items);
          
          if (itemsError) throw itemsError;
        }
        
        createdChecklists.push(checklist.id);
      }
      
      return createdChecklists;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-checklists', projectId] });
      toast.success('Checklists generated successfully');
    },
    onError: (error) => {
      console.error('Failed to generate checklists:', error);
      toast.error('Failed to generate checklists');
    },
  });
}

// Toggle checklist item completion
export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('project_checklist_items')
        .update({
          completed_at: completed ? new Date().toISOString() : null,
          completed_by_user_id: null, // Could add user ID if auth is available
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['project-checklists'] });
    },
  });
}

// Update checklist status
export function useUpdateChecklistStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklistId, status }: { checklistId: string; status: ChecklistStatus }) => {
      const { error } = await supabase
        .from('project_checklists')
        .update({ status })
        .eq('id', checklistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['project-checklists'] });
    },
  });
}

// Add manual checklist item
export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      checklistId, 
      label,
      required = false,
    }: { 
      checklistId: string; 
      label: string;
      required?: boolean;
    }) => {
      // Get current max sort_order
      const { data: existing } = await supabase
        .from('project_checklist_items')
        .select('sort_order')
        .eq('project_checklist_id', checklistId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const nextOrder = (existing?.sort_order ?? 0) + 1;
      
      const { data, error } = await supabase
        .from('project_checklist_items')
        .insert({
          project_checklist_id: checklistId,
          sort_order: nextOrder,
          label,
          required,
        })
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create checklist item');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-checklist'] });
    },
  });
}

// Delete checklist item
export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('project_checklist_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-checklist'] });
    },
  });
}

// Update estimate project_type
export function useUpdateEstimateProjectType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ estimateId, projectType }: { estimateId: string; projectType: ProjectType }) => {
      const { error } = await supabase
        .from('estimates')
        .update({ project_type: projectType })
        .eq('id', estimateId);
      
      if (error) throw error;
    },
    onSuccess: (_, { estimateId }) => {
      queryClient.invalidateQueries({ queryKey: ['estimates-v2'] });
      queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
      toast.success('Project type updated');
    },
    onError: (error) => {
      console.error('Failed to update project type:', error);
      toast.error('Failed to update project type');
    },
  });
}
