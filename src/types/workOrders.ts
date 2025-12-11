// src/types/workOrders.ts

export type WorkOrderStatus =
  | 'draft'
  | 'issued'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrder {
  id: string;
  project_id: string;
  sub_company_id: string | null;
  budget_item_id: string | null;
  title: string;
  scope_summary: string | null;
  original_amount: number | null;
  approved_amount: number | null;
  retained_amount: number | null;
  status: WorkOrderStatus;
  due_date: string | null;         // ISO date string: 'yyyy-MM-dd'
  scheduled_start: string | null;  // ISO date string
  scheduled_end: string | null;    // ISO date string
  notes: string | null;
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp
}