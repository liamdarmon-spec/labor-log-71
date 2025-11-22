import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  entity_type: 'schedule' | 'log' | 'payment' | 'project' | 'worker' | 'sub' | 'document';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'paid' | 'archived';
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Fetch activity log entries
 */
export function useActivityLog(entityType?: string, entityId?: string, limit = 50) {
  return useQuery({
    queryKey: ['activity-log', entityType, entityId, limit],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
  });
}

/**
 * Fetch recent activity across all entities
 */
export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['activity-log', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
  });
}
