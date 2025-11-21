/**
 * Scheduler Engine Types
 * Shared types for all schedule views (Daily, Weekly, Monthly, Project-level)
 */

export type SchedulerViewMode = "day" | "week" | "month";

export type SchedulerFilterMode = "workers" | "subs" | "meetings" | "all";

export interface SchedulerDaySummary {
  date: string; // YYYY-MM-DD format
  totalWorkers: number;
  totalSubs: number;
  totalMeetings: number;
  totalHours: number;
  hasConflicts: boolean;
}

export interface SchedulerAssignmentPreview {
  id: string;
  type: "worker" | "sub" | "meeting";
  label: string; // e.g., "Emmanuel" or "City Inspection"
  secondaryLabel?: string; // e.g., project name
  totalHours?: number;
  projectCount?: number;
  status?: "planned" | "synced" | "split_modified" | "split_created";
}

export interface SchedulerDataParams {
  viewMode: SchedulerViewMode;
  filter: SchedulerFilterMode;
  startDate: Date;
  endDate: Date;
  projectId?: string;
}

export interface SchedulerDataResult {
  days: SchedulerDaySummary[];
  assignmentsByDay: Record<string, SchedulerAssignmentPreview[]>;
  loading: boolean;
  error: Error | null;
}
