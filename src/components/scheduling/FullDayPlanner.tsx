/**
 * FullDayPlanner - Canonical day-level schedule editor
 * 
 * This is THE universal component for editing schedules for a specific day.
 * All schedule entry points (Global Schedule, Workforce Scheduler, Project Schedule, Subs Schedule)
 * MUST use this component instead of creating their own dialogs.
 * 
 * Props:
 * - date: The date to edit
 * - projectId: Optional filter to show only schedules for a specific project
 * - workerId: Optional filter to show only schedules for a specific worker
 * - subId: Optional filter to show only schedules for a specific sub
 * - companyId: Optional filter to show only schedules for a specific company
 * - scheduleType: Optional filter for 'labor', 'sub', 'meeting', or 'all'
 */

import { UniversalDayDetailDialog } from './UniversalDayDetailDialog';

export { UniversalDayDetailDialog as FullDayPlanner };
