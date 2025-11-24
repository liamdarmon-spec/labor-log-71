/**
 * Time Log Grouping Utilities
 * 
 * CANONICAL: All time log UIs must use these utilities for consistency
 * 
 * Structure:
 * - Database: One row per worker/day/project combination in time_logs
 * - UI: Grouped by worker_id + date, showing multiple projects as badges
 */

export interface TimeLogEntry {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  cost_code_id: string | null;
  date: string;
  hours_worked: number;
  hourly_rate: number | null;
  notes: string | null;
  payment_status: string | null;
  paid_amount: number | null;
  source_schedule_id: string | null;
  workers?: {
    id: string;
    name: string;
    trade: string | null;
    hourly_rate: number;
  };
  projects?: {
    id: string;
    project_name: string;
    client_name: string | null;
    company_id: string | null;
    companies?: {
      name: string;
    };
  };
  trades?: {
    name: string;
  };
  cost_codes?: {
    code: string;
    name: string;
  };
}

export interface ProjectSplit {
  id: string;
  project_id: string;
  project_name: string;
  hours: number;
  cost: number;
  notes: string | null;
  trade_id: string | null;
  trade_name: string | null;
  cost_code_id: string | null;
  cost_code: string | null;
  source_schedule_id: string | null; // FK to work_schedules (or NULL for manual entries)
}

export interface GroupedTimeLog {
  date: string;
  worker_id: string;
  worker_name: string;
  worker_trade: string | null;
  company_id: string | null;
  company_name: string | null;
  total_hours: number;
  total_cost: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  projects: ProjectSplit[];
  log_ids: string[];
  earliest_log_id: string;
}

/**
 * Groups time logs by worker_id and date
 * Multiple projects on same day = single grouped entry with project badges
 */
export function groupTimeLogsByWorkerAndDate(logs: TimeLogEntry[]): GroupedTimeLog[] {
  const grouped = new Map<string, GroupedTimeLog>();

  logs.forEach((log) => {
    const key = `${log.date}-${log.worker_id}`;
    const rate = log.hourly_rate || log.workers?.hourly_rate || 0;
    const cost = log.hours_worked * rate;

    if (!grouped.has(key)) {
      grouped.set(key, {
        date: log.date,
        worker_id: log.worker_id,
        worker_name: log.workers?.name || 'Unknown',
        worker_trade: log.workers?.trade || log.trades?.name || null,
        company_id: log.projects?.company_id || null,
        company_name: log.projects?.companies?.name || null,
        total_hours: 0,
        total_cost: 0,
        payment_status: 'unpaid',
        projects: [],
        log_ids: [],
        earliest_log_id: log.id,
      });
    }

    const group = grouped.get(key)!;
    
    // Add project split
    group.projects.push({
      id: log.id,
      project_id: log.project_id,
      project_name: log.projects?.project_name || 'Unknown Project',
      hours: log.hours_worked,
      cost: cost,
      notes: log.notes,
      trade_id: log.trade_id,
      trade_name: log.trades?.name || log.workers?.trade || null,
      cost_code_id: log.cost_code_id,
      cost_code: log.cost_codes ? `${log.cost_codes.code}` : null,
      source_schedule_id: log.source_schedule_id
    });

    group.total_hours += log.hours_worked;
    group.total_cost += cost;
    group.log_ids.push(log.id);

    // Determine payment status
    const paidCount = group.log_ids.filter((id) => {
      const logEntry = logs.find(l => l.id === id);
      return logEntry?.payment_status === 'paid';
    }).length;

    if (paidCount === 0) {
      group.payment_status = 'unpaid';
    } else if (paidCount === group.log_ids.length) {
      group.payment_status = 'paid';
    } else {
      group.payment_status = 'partial';
    }
  });

  return Array.from(grouped.values());
}

/**
 * Formats grouped time logs for display
 */
export function formatGroupedTimeLog(group: GroupedTimeLog): string {
  const projectSummary = group.projects
    .map(p => `${p.project_name} (${p.hours}h)`)
    .join(', ');
  
  return `${group.worker_name} • ${group.total_hours}h • ${projectSummary}`;
}

/**
 * Checks if a grouped entry can be split (only single-project entries)
 */
export function canSplitGroup(group: GroupedTimeLog): boolean {
  return group.projects.length === 1;
}

/**
 * Gets the single time log for splitting (if applicable)
 */
export function getSplittableLog(group: GroupedTimeLog): TimeLogEntry | null {
  if (group.projects.length !== 1) return null;
  return null; // Caller should look up by earliest_log_id
}
