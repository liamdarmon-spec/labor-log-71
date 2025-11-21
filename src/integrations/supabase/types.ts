export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      archived_daily_logs: {
        Row: {
          archived_at: string
          archived_by: string | null
          created_at: string | null
          created_by: string | null
          date: string
          hours_worked: number
          id: string
          notes: string | null
          original_id: string
          project_id: string
          trade_id: string | null
          worker_id: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          hours_worked: number
          id?: string
          notes?: string | null
          original_id: string
          project_id: string
          trade_id?: string | null
          worker_id: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          hours_worked?: number
          id?: string
          notes?: string | null
          original_id?: string
          project_id?: string
          trade_id?: string | null
          worker_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          hours_worked: number
          id: string
          last_synced_at: string | null
          notes: string | null
          project_id: string
          schedule_id: string | null
          trade_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          hours_worked: number
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id: string
          schedule_id?: string | null
          trade_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          hours_worked?: number
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id?: string
          schedule_id?: string | null
          trade_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          line_total: number
          quantity: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          line_total?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          line_total?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string | null
          id: string
          is_budget_source: boolean | null
          project_id: string
          status: string
          subtotal_amount: number | null
          tax_amount: number | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_budget_source?: boolean | null
          project_id: string
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_budget_source?: boolean | null
          project_id?: string
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          project_id: string
          status: string
          subtotal_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          project_id: string
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          project_id?: string
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          paid_by: string
          paid_via: string | null
          payment_date: string
          reimbursement_date: string | null
          reimbursement_status: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          paid_by: string
          paid_via?: string | null
          payment_date?: string
          reimbursement_date?: string | null
          reimbursement_status?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          paid_by?: string
          paid_via?: string | null
          payment_date?: string
          reimbursement_date?: string | null
          reimbursement_status?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          created_at: string | null
          id: string
          labor_budget: number | null
          materials_budget: number | null
          other_budget: number | null
          project_id: string
          subs_budget: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          labor_budget?: number | null
          materials_budget?: number | null
          other_budget?: number | null
          project_id: string
          subs_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          labor_budget?: number | null
          materials_budget?: number | null
          other_budget?: number | null
          project_id?: string
          subs_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_todos: {
        Row: {
          assigned_worker_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_worker_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_worker_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_todos_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_todos_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          client_name: string
          company_id: string | null
          created_at: string | null
          id: string
          project_manager: string | null
          project_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_name: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          project_manager?: string | null
          project_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_name?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          project_manager?: string | null
          project_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_modifications: {
        Row: {
          id: string
          metadata: Json | null
          modification_type: string
          modified_at: string
          modified_by: string | null
          new_schedule_id: string | null
          notes: string | null
          original_schedule_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          modification_type: string
          modified_at?: string
          modified_by?: string | null
          new_schedule_id?: string | null
          notes?: string | null
          original_schedule_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          modification_type?: string
          modified_at?: string
          modified_by?: string | null
          new_schedule_id?: string | null
          notes?: string | null
          original_schedule_id?: string
        }
        Relationships: []
      }
      scheduled_shifts: {
        Row: {
          converted_to_timelog: boolean | null
          created_at: string
          created_by: string | null
          id: string
          last_synced_at: string | null
          notes: string | null
          project_id: string
          scheduled_date: string
          scheduled_hours: number
          status: string | null
          trade_id: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          converted_to_timelog?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id: string
          scheduled_date: string
          scheduled_hours: number
          status?: string | null
          trade_id?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          converted_to_timelog?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id?: string
          scheduled_date?: string
          scheduled_hours?: number
          status?: string | null
          trade_id?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_logs: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          project_id: string
          sub_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          project_id: string
          sub_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          project_id?: string
          sub_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_logs_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_scheduled_shifts: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          project_id: string
          scheduled_date: string
          scheduled_hours: number | null
          status: string | null
          sub_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id: string
          scheduled_date: string
          scheduled_hours?: number | null
          status?: string | null
          sub_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          scheduled_date?: string
          scheduled_hours?: number | null
          status?: string | null
          sub_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_scheduled_shifts_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      subs: {
        Row: {
          active: boolean | null
          company_name: string | null
          created_at: string | null
          default_rate: number | null
          email: string | null
          id: string
          name: string
          phone: string | null
          trade: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_name?: string | null
          created_at?: string | null
          default_rate?: number | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_name?: string | null
          created_at?: string | null
          default_rate?: number | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          active: boolean
          created_at: string | null
          hourly_rate: number
          id: string
          name: string
          phone: string | null
          trade: string
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          hourly_rate: number
          id?: string
          name: string
          phone?: string | null
          trade: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          phone?: string | null
          trade?: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payment_labor_summary: {
        Row: {
          end_date: string | null
          labor_cost: number | null
          paid_by: string | null
          payment_date: string | null
          payment_id: string | null
          project_id: string | null
          project_name: string | null
          start_date: string | null
          total_hours: number | null
          worker_id: string | null
          worker_name: string | null
          worker_trade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_view: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string | null
          hours_worked: number | null
          log_id: string | null
          notes: string | null
          project_id: string | null
          project_name: string | null
          schedule_id: string | null
          trade_id: string | null
          worker_id: string | null
          worker_name: string | null
          worker_trade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_schedule_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_costs_view: {
        Row: {
          client_name: string | null
          labor_budget: number | null
          labor_budget_remaining: number | null
          labor_budget_variance: number | null
          labor_paid_cost: number | null
          labor_paid_hours: number | null
          labor_total_cost: number | null
          labor_total_hours: number | null
          labor_unpaid_cost: number | null
          labor_unpaid_hours: number | null
          last_paid_at: string | null
          materials_budget: number | null
          other_budget: number | null
          project_id: string | null
          project_name: string | null
          status: string | null
          subs_budget: number | null
        }
        Relationships: []
      }
      project_dashboard_view: {
        Row: {
          address: string | null
          client_name: string | null
          company_id: string | null
          last_activity: string | null
          project_id: string | null
          project_manager: string | null
          project_name: string | null
          status: string | null
          total_cost: number | null
          total_hours: number | null
          worker_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_view: {
        Row: {
          converted_to_timelog: boolean | null
          created_at: string | null
          id: string | null
          notes: string | null
          project_id: string | null
          scheduled_date: string | null
          scheduled_hours: number | null
          status: string | null
          trade_id: string | null
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          converted_to_timelog?: boolean | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          scheduled_hours?: number | null
          status?: string | null
          trade_id?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          converted_to_timelog?: boolean | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          scheduled_hours?: number | null
          status?: string | null
          trade_id?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      workers_public: {
        Row: {
          active: boolean | null
          created_at: string | null
          hourly_rate: number | null
          id: string | null
          name: string | null
          phone: string | null
          trade: string | null
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          name?: string | null
          phone?: never
          trade?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          name?: string | null
          phone?: never
          trade?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_old_archived_logs: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      split_schedule_for_multi_project: {
        Args: { p_original_schedule_id: string; p_time_log_entries: Json }
        Returns: {
          schedule_id: string
          time_log_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "field_user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "field_user"],
    },
  },
} as const
