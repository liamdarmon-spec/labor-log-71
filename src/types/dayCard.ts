/**
 * DayCard Type Definitions
 * 
 * DayCard is the universal object for workforce management.
 * ONE per worker per date.
 */

export type DayCardStatus = 'scheduled' | 'logged' | 'approved' | 'paid';
export type PayStatus = 'unpaid' | 'pending' | 'paid';

export interface DayCardJob {
  id: string;
  day_card_id: string;
  project_id: string;
  project_name?: string;
  trade_id: string | null;
  trade_name?: string;
  cost_code_id: string | null;
  cost_code?: string;
  hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayCard {
  id: string;
  worker_id: string;
  worker_name?: string;
  worker_default_rate?: number;
  trade_name?: string;
  date: string;
  scheduled_hours: number;
  logged_hours: number;
  status: DayCardStatus;
  pay_rate: number | null;
  pay_status: PayStatus;
  company_id: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  locked: boolean;
  jobs?: DayCardJob[];
}

export interface DayCardWithDetails extends DayCard {
  worker_name: string;
  worker_default_rate: number;
  trade_name: string | null;
  jobs: DayCardJob[];
}

export interface CreateDayCardInput {
  worker_id: string;
  date: string;
  scheduled_hours?: number;
  logged_hours?: number;
  status?: DayCardStatus;
  pay_rate?: number;
  company_id?: string;
  notes?: string;
  locked?: boolean;
  jobs?: Omit<DayCardJob, 'id' | 'day_card_id' | 'created_at' | 'updated_at'>[];
}

export interface UpdateDayCardInput {
  scheduled_hours?: number;
  logged_hours?: number;
  status?: DayCardStatus;
  pay_rate?: number;
  pay_status?: PayStatus;
  notes?: string;
  locked?: boolean;
  jobs?: Omit<DayCardJob, 'id' | 'day_card_id' | 'created_at' | 'updated_at'>[];
}

/**
 * Helper to calculate total cost for a DayCard
 */
export function calculateDayCardCost(dayCard: DayCard): number {
  const hours = dayCard.logged_hours || dayCard.scheduled_hours;
  const rate = dayCard.pay_rate || dayCard.worker_default_rate || 0;
  return hours * rate;
}

/**
 * Helper to check if DayCard is editable
 */
export function isDayCardEditable(dayCard: DayCard): boolean {
  return !dayCard.locked && dayCard.status !== 'paid';
}

/**
 * Helper to get status color
 */
export function getDayCardStatusColor(status: DayCardStatus): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'logged':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'approved':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'paid':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Helper to get pay status color
 */
export function getPayStatusColor(payStatus: PayStatus): string {
  switch (payStatus) {
    case 'unpaid':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
