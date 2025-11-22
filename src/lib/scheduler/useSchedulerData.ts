/**
 * Scheduler Engine Data Hook
 * Centralized data fetching for all schedule views
 * 
 * IMPORTANT: This hook only fetches and processes data.
 * It does NOT modify any UI or change existing behavior.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import type {
  SchedulerDataParams,
  SchedulerDataResult,
  SchedulerDaySummary,
  SchedulerAssignmentPreview,
} from './types';

export function useSchedulerData(params: SchedulerDataParams): SchedulerDataResult {
  const { viewMode, filter, startDate, endDate, projectId, refreshTrigger } = params;
  const [days, setDays] = useState<SchedulerDaySummary[]>([]);
  const [assignmentsByDay, setAssignmentsByDay] = useState<Record<string, SchedulerAssignmentPreview[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize date strings to prevent infinite re-renders
  const startDateStr = useMemo(() => format(startDate, 'yyyy-MM-dd'), [startDate.getTime()]);
  const endDateStr = useMemo(() => format(endDate, 'yyyy-MM-dd'), [endDate.getTime()]);

  const fetchSchedulerData = useCallback(async () => {

    try {
      setLoading(true);
      setError(null);

      // Initialize all days in range
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const dayMap = new Map<string, SchedulerDaySummary>();
      const assignmentsMap = new Map<string, SchedulerAssignmentPreview[]>();

      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        dayMap.set(dateStr, {
          date: dateStr,
          totalWorkers: 0,
          totalSubs: 0,
          totalMeetings: 0,
          totalHours: 0,
          hasConflicts: false,
        });
        assignmentsMap.set(dateStr, []);
      });

      // Fetch workers if needed
      if (filter === 'workers' || filter === 'all') {
        await fetchWorkerSchedules(startDateStr, endDateStr, projectId, dayMap, assignmentsMap);
      }

      // Fetch subs if needed
      if (filter === 'subs' || filter === 'all') {
        await fetchSubSchedules(startDateStr, endDateStr, projectId, dayMap, assignmentsMap);
      }

      // Fetch meetings if needed
      if (filter === 'meetings' || filter === 'all') {
        await fetchMeetings(startDateStr, endDateStr, projectId, dayMap, assignmentsMap);
      }

      // Check for conflicts (multiple schedules for same worker on same day)
      await detectConflicts(startDateStr, endDateStr, projectId, dayMap);

      setDays(Array.from(dayMap.values()));
      setAssignmentsByDay(Object.fromEntries(assignmentsMap));
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching scheduler data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, filter, projectId, refreshTrigger]);

  useEffect(() => {
    fetchSchedulerData();
  }, [fetchSchedulerData]);

  return { days, assignmentsByDay, loading, error };
}

async function fetchWorkerSchedules(
  startDate: string,
  endDate: string,
  projectId: string | undefined,
  dayMap: Map<string, SchedulerDaySummary>,
  assignmentsMap: Map<string, SchedulerAssignmentPreview[]>
) {
  let query = supabase
    .from('work_schedules')
    .select(`
      id,
      worker_id,
      project_id,
      scheduled_date,
      scheduled_hours,
      status,
      workers (name, trade),
      projects (project_name)
    `)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return;

  // Group by worker and date to detect multi-project assignments
  const workerDateMap = new Map<string, Map<string, any[]>>();

  data.forEach((shift: any) => {
    const dateStr = shift.scheduled_date;
    const workerKey = shift.worker_id;

    if (!workerDateMap.has(workerKey)) {
      workerDateMap.set(workerKey, new Map());
    }
    const workerDates = workerDateMap.get(workerKey)!;
    if (!workerDates.has(dateStr)) {
      workerDates.set(dateStr, []);
    }
    workerDates.get(dateStr)!.push(shift);
  });

  // Process each worker's schedules
  workerDateMap.forEach((dates, workerId) => {
    dates.forEach((shifts, dateStr) => {
      const day = dayMap.get(dateStr);
      if (!day) return;

      const workerName = shifts[0]?.workers?.name || 'Unknown Worker';
      const totalHours = shifts.reduce((sum: number, s: any) => sum + Number(s.scheduled_hours), 0);
      const projectCount = shifts.length;

      // Update day summary
      day.totalWorkers++;
      day.totalHours += totalHours;

      // Add assignment preview
      const assignments = assignmentsMap.get(dateStr) || [];
      assignments.push({
        id: shifts[0].id,
        type: 'worker',
        label: workerName,
        secondaryLabel: projectCount > 1 
          ? `${projectCount} projects` 
          : shifts[0]?.projects?.project_name,
        totalHours,
        projectCount,
        status: shifts[0].status || 'planned',
      });
      assignmentsMap.set(dateStr, assignments);
    });
  });
}

async function fetchSubSchedules(
  startDate: string,
  endDate: string,
  projectId: string | undefined,
  dayMap: Map<string, SchedulerDaySummary>,
  assignmentsMap: Map<string, SchedulerAssignmentPreview[]>
) {
  let query = supabase
    .from('sub_scheduled_shifts')
    .select(`
      id,
      sub_id,
      scheduled_date,
      scheduled_hours,
      subs (name, company_name),
      projects (project_name)
    `)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return;

  data.forEach((shift: any) => {
    const dateStr = shift.scheduled_date;
    const day = dayMap.get(dateStr);
    if (!day) return;

    const subName = shift.subs?.name || 'Unknown Sub';
    const hours = Number(shift.scheduled_hours || 8);

    // Update day summary
    day.totalSubs++;
    day.totalHours += hours;

    // Add assignment preview
    const assignments = assignmentsMap.get(dateStr) || [];
    assignments.push({
      id: shift.id,
      type: 'sub',
      label: subName,
      secondaryLabel: shift.projects?.project_name,
      totalHours: hours,
      projectCount: 1,
      status: 'planned',
    });
    assignmentsMap.set(dateStr, assignments);
  });
}

async function fetchMeetings(
  startDate: string,
  endDate: string,
  projectId: string | undefined,
  dayMap: Map<string, SchedulerDaySummary>,
  assignmentsMap: Map<string, SchedulerAssignmentPreview[]>
) {
  let query = supabase
    .from('project_todos')
    .select(`
      id,
      title,
      task_type,
      due_date,
      projects (project_name)
    `)
    .in('task_type', ['meeting', 'inspection', 'milestone'])
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return;

  data.forEach((meeting: any) => {
    const dateStr = meeting.due_date;
    const day = dayMap.get(dateStr);
    if (!day) return;

    // Update day summary
    day.totalMeetings++;

    // Add assignment preview
    const assignments = assignmentsMap.get(dateStr) || [];
    assignments.push({
      id: meeting.id,
      type: 'meeting',
      label: meeting.title,
      secondaryLabel: meeting.projects?.project_name,
      status: 'planned',
    });
    assignmentsMap.set(dateStr, assignments);
  });
}

async function detectConflicts(
  startDate: string,
  endDate: string,
  projectId: string | undefined,
  dayMap: Map<string, SchedulerDaySummary>
) {
  // Detect conflicts: same worker scheduled on multiple projects on same day
  let query = supabase
    .from('work_schedules')
    .select('worker_id, scheduled_date, id')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) return;
  if (!data) return;

  const conflicts = new Set<string>();
  const workerDates = new Map<string, Set<string>>();

  data.forEach((shift: any) => {
    const key = `${shift.worker_id}-${shift.scheduled_date}`;
    if (!workerDates.has(key)) {
      workerDates.set(key, new Set());
    }
    workerDates.get(key)!.add(shift.id);
  });

  workerDates.forEach((shiftIds, key) => {
    if (shiftIds.size > 1) {
      const date = key.split('-').slice(1).join('-');
      conflicts.add(date);
    }
  });

  conflicts.forEach(dateStr => {
    const day = dayMap.get(dateStr);
    if (day) {
      day.hasConflicts = true;
    }
  });
}
