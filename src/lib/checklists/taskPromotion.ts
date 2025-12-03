// Task Promotion from Checklist Items
// Creates tasks in project_todos table

import { supabase } from '@/integrations/supabase/client';

export interface ChecklistTaskPayload {
  projectId: string;
  checklistItemId: string;
  title: string;
  areaKey?: string;
  trade?: string;
  phase?: string;
  tags?: string[];
  defaultAssigneeRole?: string;
  dueDate?: string;
  assigneeId?: string;
  notes?: string;
}

export interface CreateTasksResult {
  success: boolean;
  taskIds: string[];
  error?: string;
}

/**
 * Create tasks from checklist items
 * Uses existing project_todos table
 */
export async function createTasksFromChecklistItems(input: {
  projectId: string;
  items: ChecklistTaskPayload[];
}): Promise<CreateTasksResult> {
  const { projectId, items } = input;
  
  if (!items.length) {
    return { success: true, taskIds: [] };
  }
  
  try {
    // Build task records
    const taskRecords = items.map(item => ({
      project_id: projectId,
      title: item.title,
      description: buildTaskDescription(item),
      status: 'open',
      priority: determinePriority(item),
      task_type: 'checklist_item',
      due_date: item.dueDate || null,
      assigned_worker_id: item.assigneeId || null,
    }));
    
    // Insert all tasks
    const { data, error } = await supabase
      .from('project_todos')
      .insert(taskRecords)
      .select('id');
    
    if (error) {
      console.error('Error creating tasks from checklist items:', error);
      return { success: false, taskIds: [], error: error.message };
    }
    
    const taskIds = (data || []).map(t => t.id);
    
    // Update checklist items to mark them as having tasks
    // Note: This would require adding a linked_task_id column to project_checklist_items
    // For now, we'll track this separately or via metadata
    
    return { success: true, taskIds };
  } catch (err) {
    console.error('Error in createTasksFromChecklistItems:', err);
    return { 
      success: false, 
      taskIds: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Build task description from checklist item metadata
 */
function buildTaskDescription(item: ChecklistTaskPayload): string {
  const parts: string[] = [];
  
  if (item.areaKey) {
    parts.push(`Area: ${item.areaKey}`);
  }
  if (item.trade) {
    parts.push(`Trade: ${item.trade}`);
  }
  if (item.phase) {
    parts.push(`Phase: ${item.phase}`);
  }
  if (item.tags?.length) {
    parts.push(`Tags: ${item.tags.join(', ')}`);
  }
  if (item.notes) {
    parts.push(`\n${item.notes}`);
  }
  
  parts.push(`\nCreated from checklist item.`);
  
  return parts.join('\n');
}

/**
 * Determine task priority based on checklist item metadata
 */
function determinePriority(item: ChecklistTaskPayload): string {
  // High-risk tags get high priority
  const highRiskTags = ['critical', 'waterproofing', 'structural', 'safety'];
  if (item.tags?.some(tag => highRiskTags.includes(tag.toLowerCase()))) {
    return 'high';
  }
  
  // Precon and rough phase items are typically more time-sensitive
  if (item.phase === 'precon' || item.phase === 'rough') {
    return 'medium';
  }
  
  return 'medium';
}

/**
 * Create a single task from a checklist item
 */
export async function createSingleTaskFromChecklist(
  payload: ChecklistTaskPayload
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const result = await createTasksFromChecklistItems({
    projectId: payload.projectId,
    items: [payload],
  });
  
  return {
    success: result.success,
    taskId: result.taskIds[0],
    error: result.error,
  };
}
