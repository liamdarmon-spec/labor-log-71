/**
 * Canonical Field Operations Helper
 * 
 * This module provides the single source of truth for all field operations data access.
 * All scheduling and time logging UI MUST use these functions instead of writing
 * direct Supabase queries.
 * 
 * CANONICAL TABLES:
 * - work_schedules: Planned work (schedule)
 * - time_logs: Actual work (labor actuals)
 * 
 * LEGACY TABLES (DO NOT USE):
 * - scheduled_shifts
 * - daily_logs
 * - day_cards
 * - day_card_jobs
 */

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface WorkSchedule {
  id: string;
  worker_id: string;
  project_id: string;
  company_id: string | null;
  trade_id: string | null;
  cost_code_id: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  status: string;
  converted_to_timelog: boolean;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  worker_id: string;
  project_id: string;
  company_id: string | null;
  trade_id: string | null;
  cost_code_id: string | null;
  date: string;
  hours_worked: number;
  hourly_rate: number | null;
  labor_cost: number | null;
  notes: string | null;
  payment_status: string | null;
  paid_amount: number | null;
  source_schedule_id: string | null;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScheduleFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  workerId?: string;
  companyId?: string;
}

export interface CreateScheduleInput {
  worker_id: string;
  project_id: string;
  trade_id?: string | null;
  cost_code_id?: string | null;
  scheduled_date: Date;
  scheduled_hours: number;
  notes?: string | null;
  created_by?: string;
}

export interface UpdateScheduleInput {
  worker_id?: string;
  project_id?: string;
  trade_id?: string | null;
  cost_code_id?: string | null;
  scheduled_date?: Date;
  scheduled_hours?: number;
  notes?: string | null;
}

/**
 * Fetch project schedules with optional filters
 * Joins workers, projects, trades, and cost_codes for rich display
 */
export async function fetchProjectSchedule(filters: ScheduleFilters = {}) {
  let query = supabase
    .from('work_schedules')
    .select(`
      *,
      worker:workers(id, name, trade, hourly_rate, trade_id),
      project:projects(id, project_name, client_name, status, company_id),
      trade:trades(id, name),
      cost_code:cost_codes(id, code, name, category)
    `)
    .order('scheduled_date')
    .order('worker_id');

  if (filters.startDate) {
    query = query.gte('scheduled_date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('scheduled_date', filters.endDate);
  }
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Apply company filter post-fetch if needed
  let filteredData = data || [];
  if (filters.companyId && filters.companyId !== 'all') {
    filteredData = filteredData.filter((schedule: any) => 
      schedule.project?.company_id === filters.companyId
    );
  }

  return filteredData;
}

/**
 * Create a new schedule shift
 * Writes to work_schedules (canonical table)
 * Triggers will auto-populate company_id and cost_code_id
 */
export async function createScheduleShift(input: CreateScheduleInput) {
  const { data, error } = await supabase
    .from('work_schedules')
    .insert({
      worker_id: input.worker_id,
      project_id: input.project_id,
      trade_id: input.trade_id || null,
      cost_code_id: input.cost_code_id || null,
      scheduled_date: format(input.scheduled_date, 'yyyy-MM-dd'),
      scheduled_hours: input.scheduled_hours,
      notes: input.notes || null,
      created_by: input.created_by || null
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Failed to create schedule shift');
  }
  return data;
}

/**
 * Update an existing schedule shift
 * Updates work_schedules (canonical table)
 * Triggers will sync to time_logs if date has passed
 */
export async function updateScheduleShift(scheduleId: string, patch: UpdateScheduleInput) {
  const updateData: any = {};

  if (patch.worker_id !== undefined) updateData.worker_id = patch.worker_id;
  if (patch.project_id !== undefined) updateData.project_id = patch.project_id;
  if (patch.trade_id !== undefined) updateData.trade_id = patch.trade_id;
  if (patch.cost_code_id !== undefined) updateData.cost_code_id = patch.cost_code_id;
  if (patch.scheduled_date !== undefined) {
    updateData.scheduled_date = format(patch.scheduled_date, 'yyyy-MM-dd');
  }
  if (patch.scheduled_hours !== undefined) updateData.scheduled_hours = patch.scheduled_hours;
  if (patch.notes !== undefined) updateData.notes = patch.notes;

  const { data, error } = await supabase
    .from('work_schedules')
    .update(updateData)
    .eq('id', scheduleId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Schedule shift not found');
  }
  return data;
}

/**
 * Delete a schedule shift
 * Deletes from work_schedules (canonical table)
 */
export async function deleteScheduleShift(scheduleId: string) {
  const { error } = await supabase
    .from('work_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) throw error;
}

/**
 * Check if a schedule has a linked time log
 * Queries time_logs for source_schedule_id match
 */
export async function hasLinkedTimeLog(scheduleId: string): Promise<{ hasTimeLog: boolean; timeLogId: string | null }> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('id')
    .eq('source_schedule_id', scheduleId)
    .maybeSingle();

  if (error) {
    console.error('Error checking for time log:', error);
    return { hasTimeLog: false, timeLogId: null };
  }

  return {
    hasTimeLog: !!data,
    timeLogId: data?.id || null
  };
}

/**
 * Get time logs for a schedule ID
 * Returns all time_logs linked to a schedule
 */
export async function getTimeLogsForSchedule(scheduleId: string) {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .eq('source_schedule_id', scheduleId);

  if (error) throw error;
  return data || [];
}

/**
 * Unlink time logs from a schedule
 * Sets source_schedule_id to null on time_logs
 */
export async function unlinkTimeLogsFromSchedule(timeLogIds: string[]) {
  if (timeLogIds.length === 0) return;

  const { error } = await supabase
    .from('time_logs')
    .update({ source_schedule_id: null })
    .in('id', timeLogIds);

  if (error) throw error;
}

/**
 * Delete time logs by IDs
 * Deletes from time_logs (canonical table)
 */
export async function deleteTimeLogs(timeLogIds: string[]) {
  if (timeLogIds.length === 0) return;

  const { error } = await supabase
    .from('time_logs')
    .delete()
    .in('id', timeLogIds);

  if (error) throw error;
}

/**
 * Convert schedules to time logs
 * Sets converted_to_timelog = true, triggers will create time_logs
 */
export async function convertSchedulesToTimeLogs(scheduleIds: string[]) {
  if (scheduleIds.length === 0) return;

  const { error } = await supabase
    .from('work_schedules')
    .update({ converted_to_timelog: true })
    .in('id', scheduleIds);

  if (error) throw error;
}
