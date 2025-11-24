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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
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
      bid_invitations: {
        Row: {
          bid_package_id: string
          id: string
          invited_at: string
          notes: string | null
          responded_at: string | null
          status: string | null
          sub_id: string
        }
        Insert: {
          bid_package_id: string
          id?: string
          invited_at?: string
          notes?: string | null
          responded_at?: string | null
          status?: string | null
          sub_id: string
        }
        Update: {
          bid_package_id?: string
          id?: string
          invited_at?: string
          notes?: string | null
          responded_at?: string | null
          status?: string | null
          sub_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_invitations_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "bid_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_invitations_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_packages: {
        Row: {
          attachments: Json | null
          bid_due_date: string | null
          cost_code_ids: string[] | null
          created_at: string
          desired_start_date: string | null
          id: string
          project_id: string
          scope_summary: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          bid_due_date?: string | null
          cost_code_ids?: string[] | null
          created_at?: string
          desired_start_date?: string | null
          id?: string
          project_id: string
          scope_summary?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          bid_due_date?: string | null
          cost_code_ids?: string[] | null
          created_at?: string
          desired_start_date?: string | null
          id?: string
          project_id?: string
          scope_summary?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          new_budget: number
          notes: string | null
          previous_budget: number | null
          project_id: string
          revision_amount: number
          revision_number: number
          revision_type: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          new_budget: number
          notes?: string | null
          previous_budget?: number | null
          project_id: string
          revision_amount: number
          revision_number: number
          revision_type: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          new_budget?: number
          notes?: string | null
          previous_budget?: number | null
          project_id?: string
          revision_amount?: number
          revision_number?: number
          revision_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      cost_codes: {
        Row: {
          category: string
          code: string
          created_at: string | null
          default_trade_id: string | null
          id: string
          is_active: boolean
          name: string
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          default_trade_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          default_trade_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_default_trade_id_fkey"
            columns: ["default_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_entries: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          invoice_number: string | null
          notes: string | null
          project_id: string
          quantity: number | null
          source_id: string | null
          source_type: string | null
          total_cost: number
          unit: string | null
          unit_cost: number | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date: string
          entry_type: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id: string
          quantity?: number | null
          source_id?: string | null
          source_type?: string | null
          total_cost: number
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id?: string
          quantity?: number | null
          source_id?: string | null
          source_type?: string | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "cost_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          category: string
          company_id: string | null
          cost_code_id: string | null
          created_at: string | null
          date_incurred: string
          description: string
          id: string
          notes: string | null
          payment_id: string | null
          project_id: string
          status: string
          updated_at: string | null
          vendor_id: string | null
          vendor_type: string | null
        }
        Insert: {
          amount?: number
          category: string
          company_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          date_incurred?: string
          description: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          project_id: string
          status?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_type?: string | null
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          date_incurred?: string
          description?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          project_id?: string
          status?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "costs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "costs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_labor_summary"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "costs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          applied_to_retention: number | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          project_id: string
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          applied_to_retention?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          project_id: string
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applied_to_retention?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          project_id?: string
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "customer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "customer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "customer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "customer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          hours_worked: number
          id: string
          last_synced_at: string | null
          notes: string | null
          paid_amount: number | null
          payment_id: string | null
          payment_status: string | null
          project_id: string
          schedule_id: string | null
          trade_id: string | null
          worker_id: string
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          hours_worked: number
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          project_id: string
          schedule_id?: string | null
          trade_id?: string | null
          worker_id: string
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          hours_worked?: number
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          project_id?: string
          schedule_id?: string | null
          trade_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "daily_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_labor_summary"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "daily_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
            referencedRelation: "work_schedules"
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
      day_card_jobs: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          day_card_id: string
          hours: number
          id: string
          notes: string | null
          project_id: string
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string | null
          day_card_id: string
          hours?: number
          id?: string
          notes?: string | null
          project_id: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string | null
          day_card_id?: string
          hours?: number
          id?: string
          notes?: string | null
          project_id?: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_card_jobs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "day_card_jobs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_card_jobs_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "day_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_card_jobs_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "day_cards_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_card_jobs_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "worker_day_summary"
            referencedColumns: ["day_card_id"]
          },
          {
            foreignKeyName: "day_card_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "day_card_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "day_card_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "day_card_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "day_card_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_card_jobs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      day_cards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          lifecycle_status: string | null
          locked: boolean | null
          logged_hours: number | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          pay_rate: number | null
          pay_status: string | null
          scheduled_hours: number | null
          status: string
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          lifecycle_status?: string | null
          locked?: boolean | null
          logged_hours?: number | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          pay_rate?: number | null
          pay_status?: string | null
          scheduled_hours?: number | null
          status?: string
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          lifecycle_status?: string | null
          locked?: boolean | null
          logged_hours?: number | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          pay_rate?: number | null
          pay_status?: string | null
          scheduled_hours?: number | null
          status?: string
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_counterparty_name: string | null
          ai_currency: string | null
          ai_doc_type: string | null
          ai_effective_date: string | null
          ai_expiration_date: string | null
          ai_extracted_data: Json | null
          ai_last_run_at: string | null
          ai_last_run_status: string | null
          ai_status: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          ai_title: string | null
          ai_total_amount: number | null
          amount: number | null
          auto_classified: boolean | null
          cost_code_id: string | null
          created_at: string | null
          description: string | null
          doc_type: string | null
          document_date: string | null
          document_type: string | null
          extracted_text: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          owner_id: string | null
          owner_type: string | null
          project_id: string | null
          size_bytes: number | null
          source: string | null
          status: string | null
          storage_path: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          vendor_name: string | null
        }
        Insert: {
          ai_counterparty_name?: string | null
          ai_currency?: string | null
          ai_doc_type?: string | null
          ai_effective_date?: string | null
          ai_expiration_date?: string | null
          ai_extracted_data?: Json | null
          ai_last_run_at?: string | null
          ai_last_run_status?: string | null
          ai_status?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          ai_title?: string | null
          ai_total_amount?: number | null
          amount?: number | null
          auto_classified?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string | null
          doc_type?: string | null
          document_date?: string | null
          document_type?: string | null
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          owner_id?: string | null
          owner_type?: string | null
          project_id?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          vendor_name?: string | null
        }
        Update: {
          ai_counterparty_name?: string | null
          ai_currency?: string | null
          ai_doc_type?: string | null
          ai_effective_date?: string | null
          ai_expiration_date?: string | null
          ai_extracted_data?: Json | null
          ai_last_run_at?: string | null
          ai_last_run_status?: string | null
          ai_status?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          ai_title?: string | null
          ai_total_amount?: number | null
          amount?: number | null
          auto_classified?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string | null
          doc_type?: string | null
          document_date?: string | null
          document_type?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          owner_id?: string | null
          owner_type?: string | null
          project_id?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "documents_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_change_log: {
        Row: {
          change_summary: string | null
          change_type: string
          changed_by: string | null
          changes: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          version: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          area_name: string | null
          category: string | null
          cost_code_id: string | null
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          is_allowance: boolean | null
          line_total: number
          planned_hours: number | null
          quantity: number
          scope_group: string | null
          trade_id: string | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          area_name?: string | null
          category?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          is_allowance?: boolean | null
          line_total?: number
          planned_hours?: number | null
          quantity?: number
          scope_group?: string | null
          trade_id?: string | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          area_name?: string | null
          category?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          is_allowance?: boolean | null
          line_total?: number
          planned_hours?: number | null
          quantity?: number
          scope_group?: string | null
          trade_id?: string | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "estimate_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_log: Json | null
          created_at: string | null
          id: string
          is_budget_source: boolean | null
          margin_percent: number | null
          parent_estimate_id: string | null
          project_id: string
          settings: Json | null
          status: string
          subtotal_amount: number | null
          tax_amount: number | null
          title: string
          total_amount: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_log?: Json | null
          created_at?: string | null
          id?: string
          is_budget_source?: boolean | null
          margin_percent?: number | null
          parent_estimate_id?: string | null
          project_id: string
          settings?: Json | null
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_log?: Json | null
          created_at?: string | null
          id?: string
          is_budget_source?: boolean | null
          margin_percent?: number | null
          parent_estimate_id?: string | null
          project_id?: string
          settings?: Json | null
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
          category: string | null
          cost_code_id: string | null
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
          category?: string | null
          cost_code_id?: string | null
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
          category?: string | null
          cost_code_id?: string | null
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
            foreignKeyName: "invoice_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "invoice_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
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
          balance_to_finish: number | null
          client_name: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_terms: string | null
          previously_invoiced: number | null
          project_id: string
          retention_amount: number | null
          retention_percent: number | null
          sov_based: boolean | null
          status: string
          subtotal_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          balance_to_finish?: number | null
          client_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          previously_invoiced?: number | null
          project_id: string
          retention_amount?: number | null
          retention_percent?: number | null
          sov_based?: boolean | null
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          balance_to_finish?: number | null
          client_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          previously_invoiced?: number | null
          project_id?: string
          retention_amount?: number | null
          retention_percent?: number | null
          sov_based?: boolean | null
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
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
      labor_pay_run_items: {
        Row: {
          amount: number
          created_at: string | null
          hours: number | null
          id: string
          pay_run_id: string
          rate: number | null
          time_log_id: string
          worker_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          hours?: number | null
          id?: string
          pay_run_id: string
          rate?: number | null
          time_log_id: string
          worker_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          hours?: number | null
          id?: string
          pay_run_id?: string
          rate?: number | null
          time_log_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "labor_pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_pay_run_items_time_log_id_fkey"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_pay_run_items_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_pay_run_items_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_pay_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_range_end: string
          date_range_start: string
          id: string
          notes: string | null
          payee_company_id: string | null
          payer_company_id: string | null
          payment_method: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_range_end: string
          date_range_start: string
          id?: string
          notes?: string | null
          payee_company_id?: string | null
          payer_company_id?: string | null
          payment_method?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_range_end?: string
          date_range_start?: string
          id?: string
          notes?: string | null
          payee_company_id?: string | null
          payer_company_id?: string | null
          payment_method?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_pay_runs_payee_company_id_fkey"
            columns: ["payee_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_pay_runs_payee_company_id_fkey"
            columns: ["payee_company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "labor_pay_runs_payer_company_id_fkey"
            columns: ["payer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_pay_runs_payer_company_id_fkey"
            columns: ["payer_company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      material_receipts: {
        Row: {
          auto_classified: boolean | null
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          linked_cost_id: string | null
          linked_document_id: string | null
          notes: string | null
          project_id: string
          receipt_date: string
          receipt_document_id: string | null
          shipping: number | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
          vendor: string
          vendor_id: string | null
        }
        Insert: {
          auto_classified?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          linked_cost_id?: string | null
          linked_document_id?: string | null
          notes?: string | null
          project_id: string
          receipt_date: string
          receipt_document_id?: string | null
          shipping?: number | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
          vendor: string
          vendor_id?: string | null
        }
        Update: {
          auto_classified?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          linked_cost_id?: string | null
          linked_document_id?: string | null
          notes?: string | null
          project_id?: string
          receipt_date?: string
          receipt_document_id?: string | null
          shipping?: number | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
          vendor?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "material_receipts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_linked_cost_id_fkey"
            columns: ["linked_cost_id"]
            isOneToOne: false
            referencedRelation: "costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "material_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      material_vendors: {
        Row: {
          active: boolean | null
          company_name: string | null
          created_at: string | null
          default_cost_code_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_name?: string | null
          created_at?: string | null
          default_cost_code_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_name?: string | null
          created_at?: string | null
          default_cost_code_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_vendors_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "material_vendors_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_vendors_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
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
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      project_budget_lines: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          budget_amount: number
          budget_hours: number | null
          category: string
          cost_code_id: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          forecast_at_completion: number | null
          id: string
          is_allowance: boolean | null
          percent_complete: number | null
          project_id: string
          source_estimate_id: string | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          budget_amount?: number
          budget_hours?: number | null
          category: string
          cost_code_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          forecast_at_completion?: number | null
          id?: string
          is_allowance?: boolean | null
          percent_complete?: number | null
          project_id: string
          source_estimate_id?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          budget_amount?: number
          budget_hours?: number | null
          category?: string
          cost_code_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          forecast_at_completion?: number | null
          id?: string
          is_allowance?: boolean | null
          percent_complete?: number | null
          project_id?: string
          source_estimate_id?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "project_budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_lines_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          baseline_estimate_id: string | null
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
          baseline_estimate_id?: string | null
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
          baseline_estimate_id?: string | null
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
            foreignKeyName: "project_budgets_baseline_estimate_id_fkey"
            columns: ["baseline_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
      project_financials_snapshot: {
        Row: {
          actual_cost_labor: number | null
          actual_cost_materials: number | null
          actual_cost_other: number | null
          actual_cost_subs: number | null
          actual_cost_total: number | null
          baseline_budget: number | null
          billed_to_date: number | null
          contract_amount: number | null
          created_at: string | null
          forecast_at_completion: number | null
          id: string
          last_calculated_at: string | null
          open_ap_labor: number | null
          open_ap_subs: number | null
          open_ar: number | null
          paid_to_date: number | null
          profit_amount: number | null
          profit_percent: number | null
          project_id: string
          retention_held: number | null
          revised_budget: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cost_labor?: number | null
          actual_cost_materials?: number | null
          actual_cost_other?: number | null
          actual_cost_subs?: number | null
          actual_cost_total?: number | null
          baseline_budget?: number | null
          billed_to_date?: number | null
          contract_amount?: number | null
          created_at?: string | null
          forecast_at_completion?: number | null
          id?: string
          last_calculated_at?: string | null
          open_ap_labor?: number | null
          open_ap_subs?: number | null
          open_ar?: number | null
          paid_to_date?: number | null
          profit_amount?: number | null
          profit_percent?: number | null
          project_id: string
          retention_held?: number | null
          revised_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cost_labor?: number | null
          actual_cost_materials?: number | null
          actual_cost_other?: number | null
          actual_cost_subs?: number | null
          actual_cost_total?: number | null
          baseline_budget?: number | null
          billed_to_date?: number | null
          contract_amount?: number | null
          created_at?: string | null
          forecast_at_completion?: number | null
          id?: string
          last_calculated_at?: string | null
          open_ap_labor?: number | null
          open_ap_subs?: number | null
          open_ar?: number | null
          paid_to_date?: number | null
          profit_amount?: number | null
          profit_percent?: number | null
          project_id?: string
          retention_held?: number | null
          revised_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_financials_snapshot_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financials_snapshot_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financials_snapshot_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financials_snapshot_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_financials_snapshot_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subcontracts: {
        Row: {
          approved_cos_amount: number | null
          contract_amount: number
          created_at: string
          id: string
          net_contract_value: number | null
          notes: string | null
          project_id: string
          retention_percent: number | null
          status: string | null
          sub_id: string
          updated_at: string
        }
        Insert: {
          approved_cos_amount?: number | null
          contract_amount?: number
          created_at?: string
          id?: string
          net_contract_value?: number | null
          notes?: string | null
          project_id: string
          retention_percent?: number | null
          status?: string | null
          sub_id: string
          updated_at?: string
        }
        Update: {
          approved_cos_amount?: number | null
          contract_amount?: number
          created_at?: string
          id?: string
          net_contract_value?: number | null
          notes?: string | null
          project_id?: string
          retention_percent?: number | null
          status?: string | null
          sub_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_subcontracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subcontracts_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
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
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_labor_summary"
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
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      proposal_estimate_settings: {
        Row: {
          ai_enabled: boolean | null
          ai_settings: Json | null
          branding_colors: Json | null
          branding_logo_url: string | null
          company_id: string | null
          created_at: string | null
          default_margin_percent: number | null
          default_markup_labor: number | null
          default_markup_materials: number | null
          default_markup_subs: number | null
          default_terms: string | null
          id: string
          setting_type: string
          template_config: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_settings?: Json | null
          branding_colors?: Json | null
          branding_logo_url?: string | null
          company_id?: string | null
          created_at?: string | null
          default_margin_percent?: number | null
          default_markup_labor?: number | null
          default_markup_materials?: number | null
          default_markup_subs?: number | null
          default_terms?: string | null
          id?: string
          setting_type: string
          template_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_settings?: Json | null
          branding_colors?: Json | null
          branding_logo_url?: string | null
          company_id?: string | null
          created_at?: string | null
          default_margin_percent?: number | null
          default_markup_labor?: number | null
          default_markup_materials?: number | null
          default_markup_subs?: number | null
          default_terms?: string | null
          id?: string
          setting_type?: string
          template_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_estimate_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_estimate_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          actor_email: string | null
          actor_ip: string | null
          actor_name: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          proposal_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_ip?: string | null
          actor_name?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          proposal_id: string
        }
        Update: {
          actor_email?: string | null
          actor_ip?: string | null
          actor_name?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_images: {
        Row: {
          caption: string | null
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          proposal_id: string
          section_id: string | null
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          proposal_id: string
          section_id?: string | null
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          proposal_id?: string
          section_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_images_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_images_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "proposal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_groups: {
        Row: {
          created_at: string
          display_name: string
          estimate_group_id: string | null
          estimate_id: string | null
          id: string
          markup_mode: string
          override_total_amount: number | null
          proposal_id: string
          show_group_total: boolean
          show_line_items: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_name: string
          estimate_group_id?: string | null
          estimate_id?: string | null
          id?: string
          markup_mode?: string
          override_total_amount?: number | null
          proposal_id: string
          show_group_total?: boolean
          show_line_items?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          estimate_group_id?: string | null
          estimate_id?: string | null
          id?: string
          markup_mode?: string
          override_total_amount?: number | null
          proposal_id?: string
          show_group_total?: boolean
          show_line_items?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_groups_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_groups_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_overrides: {
        Row: {
          created_at: string
          custom_description: string | null
          custom_label: string | null
          custom_quantity: number | null
          custom_unit: string | null
          custom_unit_price: number | null
          estimate_line_id: string
          id: string
          proposal_id: string
          show_to_client: boolean
        }
        Insert: {
          created_at?: string
          custom_description?: string | null
          custom_label?: string | null
          custom_quantity?: number | null
          custom_unit?: string | null
          custom_unit_price?: number | null
          estimate_line_id: string
          id?: string
          proposal_id: string
          show_to_client?: boolean
        }
        Update: {
          created_at?: string
          custom_description?: string | null
          custom_label?: string | null
          custom_quantity?: number | null
          custom_unit?: string | null
          custom_unit_price?: number | null
          estimate_line_id?: string
          id?: string
          proposal_id?: string
          show_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_overrides_estimate_line_id_fkey"
            columns: ["estimate_line_id"]
            isOneToOne: false
            referencedRelation: "estimate_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_overrides_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_section_items: {
        Row: {
          created_at: string
          display_description: string | null
          display_label: string | null
          display_notes: string | null
          display_quantity: number | null
          display_unit: string | null
          display_unit_price: number | null
          estimate_item_id: string
          id: string
          is_visible: boolean
          override_line_total: number | null
          override_quantity: number | null
          override_unit_price: number | null
          proposal_section_id: string
          show_line_item: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_description?: string | null
          display_label?: string | null
          display_notes?: string | null
          display_quantity?: number | null
          display_unit?: string | null
          display_unit_price?: number | null
          estimate_item_id: string
          id?: string
          is_visible?: boolean
          override_line_total?: number | null
          override_quantity?: number | null
          override_unit_price?: number | null
          proposal_section_id: string
          show_line_item?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_description?: string | null
          display_label?: string | null
          display_notes?: string | null
          display_quantity?: number | null
          display_unit?: string | null
          display_unit_price?: number | null
          estimate_item_id?: string
          id?: string
          is_visible?: boolean
          override_line_total?: number | null
          override_quantity?: number | null
          override_unit_price?: number | null
          proposal_section_id?: string
          show_line_item?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_section_items_estimate_item_id_fkey"
            columns: ["estimate_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_section_items_proposal_section_id_fkey"
            columns: ["proposal_section_id"]
            isOneToOne: false
            referencedRelation: "proposal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_sections: {
        Row: {
          config: Json | null
          content_richtext: string | null
          created_at: string
          group_type: string | null
          id: string
          is_lump_sum: boolean
          is_visible: boolean
          proposal_id: string
          show_section_total: boolean
          sort_order: number
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          content_richtext?: string | null
          created_at?: string
          group_type?: string | null
          id?: string
          is_lump_sum?: boolean
          is_visible?: boolean
          proposal_id: string
          show_section_total?: boolean
          sort_order?: number
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          content_richtext?: string | null
          created_at?: string
          group_type?: string | null
          id?: string
          is_lump_sum?: boolean
          is_visible?: boolean
          proposal_id?: string
          show_section_total?: boolean
          sort_order?: number
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sections_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          template_data: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          template_data?: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          template_data?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          acceptance_date: string | null
          acceptance_ip: string | null
          acceptance_method: string | null
          acceptance_notes: string | null
          acceptance_status: string | null
          accepted_at: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          branding: Json | null
          change_log: Json | null
          client_email: string | null
          client_name: string | null
          client_signature: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          notes_internal: string | null
          parent_proposal_id: string | null
          presentation_mode: string | null
          primary_estimate_id: string | null
          project_id: string
          proposal_date: string
          public_token: string | null
          rejected_at: string | null
          sent_at: string | null
          status: string
          subtotal_amount: number
          tax_amount: number
          template_settings: Json | null
          title: string
          token_expires_at: string | null
          total_amount: number
          updated_at: string
          validity_days: number
          version: number | null
          version_label: string | null
          viewed_at: string | null
        }
        Insert: {
          acceptance_date?: string | null
          acceptance_ip?: string | null
          acceptance_method?: string | null
          acceptance_notes?: string | null
          acceptance_status?: string | null
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          branding?: Json | null
          change_log?: Json | null
          client_email?: string | null
          client_name?: string | null
          client_signature?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes_internal?: string | null
          parent_proposal_id?: string | null
          presentation_mode?: string | null
          primary_estimate_id?: string | null
          project_id: string
          proposal_date?: string
          public_token?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal_amount?: number
          tax_amount?: number
          template_settings?: Json | null
          title: string
          token_expires_at?: string | null
          total_amount?: number
          updated_at?: string
          validity_days?: number
          version?: number | null
          version_label?: string | null
          viewed_at?: string | null
        }
        Update: {
          acceptance_date?: string | null
          acceptance_ip?: string | null
          acceptance_method?: string | null
          acceptance_notes?: string | null
          acceptance_status?: string | null
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          branding?: Json | null
          change_log?: Json | null
          client_email?: string | null
          client_name?: string | null
          client_signature?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes_internal?: string | null
          parent_proposal_id?: string | null
          presentation_mode?: string | null
          primary_estimate_id?: string | null
          project_id?: string
          proposal_date?: string
          public_token?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal_amount?: number
          tax_amount?: number
          template_settings?: Json | null
          title?: string
          token_expires_at?: string | null
          total_amount?: number
          updated_at?: string
          validity_days?: number
          version?: number | null
          version_label?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_parent_proposal_id_fkey"
            columns: ["parent_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_primary_estimate_id_fkey"
            columns: ["primary_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      schedule_of_values: {
        Row: {
          balance_to_finish: number | null
          cost_code_id: string | null
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          item_number: string | null
          materials_stored: number | null
          percent_complete: number | null
          previously_completed: number | null
          project_id: string
          retention_percent: number | null
          scheduled_value: number
          sort_order: number | null
          this_period_completed: number | null
          total_completed: number | null
          updated_at: string | null
        }
        Insert: {
          balance_to_finish?: number | null
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          item_number?: string | null
          materials_stored?: number | null
          percent_complete?: number | null
          previously_completed?: number | null
          project_id: string
          retention_percent?: number | null
          scheduled_value?: number
          sort_order?: number | null
          this_period_completed?: number | null
          total_completed?: number | null
          updated_at?: string | null
        }
        Update: {
          balance_to_finish?: number | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          item_number?: string | null
          materials_stored?: number | null
          percent_complete?: number | null
          previously_completed?: number | null
          project_id?: string
          retention_percent?: number | null
          scheduled_value?: number
          sort_order?: number | null
          this_period_completed?: number | null
          total_completed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "schedule_of_values_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_shifts: {
        Row: {
          converted_to_timelog: boolean | null
          cost_code_id: string | null
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
          cost_code_id?: string | null
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
          cost_code_id?: string | null
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
            foreignKeyName: "scheduled_shifts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "scheduled_shifts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
      scope_block_cost_items: {
        Row: {
          category: string
          cost_code_id: string | null
          created_at: string | null
          description: string
          id: string
          line_total: number
          margin_percent: number | null
          markup_percent: number | null
          notes: string | null
          quantity: number
          scope_block_id: string
          sort_order: number
          unit: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          line_total?: number
          margin_percent?: number | null
          markup_percent?: number | null
          notes?: string | null
          quantity?: number
          scope_block_id: string
          sort_order?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          line_total?: number
          margin_percent?: number | null
          markup_percent?: number | null
          notes?: string | null
          quantity?: number
          scope_block_id?: string
          sort_order?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scope_block_cost_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "scope_block_cost_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_block_cost_items_scope_block_id_fkey"
            columns: ["scope_block_id"]
            isOneToOne: false
            referencedRelation: "scope_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_blocks: {
        Row: {
          block_type: string
          content_richtext: string | null
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          image_url: string | null
          is_visible: boolean | null
          parent_id: string | null
          settings: Json | null
          sort_order: number
          title: string | null
          updated_at: string | null
        }
        Insert: {
          block_type: string
          content_richtext?: string | null
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          parent_id?: string | null
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          content_richtext?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          parent_id?: string | null
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scope_blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "scope_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_bids: {
        Row: {
          attachments: Json | null
          bid_amount: number
          bid_package_id: string
          created_at: string
          id: string
          notes: string | null
          sub_id: string
          submitted_at: string
        }
        Insert: {
          attachments?: Json | null
          bid_amount: number
          bid_package_id: string
          created_at?: string
          id?: string
          notes?: string | null
          sub_id: string
          submitted_at?: string
        }
        Update: {
          attachments?: Json | null
          bid_amount?: number
          bid_package_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          sub_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_bids_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "bid_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_bids_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_compliance_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_id: string | null
          effective_date: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          status: string | null
          sub_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          document_id?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          sub_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_id?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          sub_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_compliance_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_compliance_documents_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_contracts: {
        Row: {
          amount_billed: number | null
          amount_paid: number | null
          contract_value: number
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          linked_document_id: string | null
          payment_terms: string | null
          project_id: string
          retention_held: number | null
          retention_percentage: number | null
          start_date: string | null
          status: string | null
          sub_id: string
          updated_at: string | null
        }
        Insert: {
          amount_billed?: number | null
          amount_paid?: number | null
          contract_value?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          linked_document_id?: string | null
          payment_terms?: string | null
          project_id: string
          retention_held?: number | null
          retention_percentage?: number | null
          start_date?: string | null
          status?: string | null
          sub_id: string
          updated_at?: string | null
        }
        Update: {
          amount_billed?: number | null
          amount_paid?: number | null
          contract_value?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          linked_document_id?: string | null
          payment_terms?: string | null
          project_id?: string
          retention_held?: number | null
          retention_percentage?: number | null
          start_date?: string | null
          status?: string | null
          sub_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_contracts_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_contracts_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_invoices: {
        Row: {
          amount_paid: number | null
          auto_classified: boolean | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          linked_document_id: string | null
          notes: string | null
          payment_status: string | null
          project_id: string
          retention_amount: number | null
          sub_id: string
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          auto_classified?: boolean | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          linked_document_id?: string | null
          notes?: string | null
          payment_status?: string | null
          project_id: string
          retention_amount?: number | null
          sub_id: string
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          auto_classified?: boolean | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          linked_document_id?: string | null
          notes?: string | null
          payment_status?: string | null
          project_id?: string
          retention_amount?: number | null
          sub_id?: string
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sub_contract_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "sub_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sub_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_invoices_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_invoices_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_logs: {
        Row: {
          amount: number
          cost_code_id: string | null
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
          cost_code_id?: string | null
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
          cost_code_id?: string | null
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
            foreignKeyName: "sub_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "sub_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
      sub_payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_batch_id: string | null
          payment_date: string
          project_subcontract_id: string | null
          retention_released: number | null
          sub_invoice_id: string | null
        }
        Insert: {
          amount_paid?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_batch_id?: string | null
          payment_date?: string
          project_subcontract_id?: string | null
          retention_released?: number | null
          sub_invoice_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_batch_id?: string | null
          payment_date?: string
          project_subcontract_id?: string | null
          retention_released?: number | null
          sub_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_payments_payment_batch_id_fkey"
            columns: ["payment_batch_id"]
            isOneToOne: false
            referencedRelation: "payment_labor_summary"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "sub_payments_payment_batch_id_fkey"
            columns: ["payment_batch_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_payments_project_subcontract_id_fkey"
            columns: ["project_subcontract_id"]
            isOneToOne: false
            referencedRelation: "sub_contract_summary"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "sub_payments_project_subcontract_id_fkey"
            columns: ["project_subcontract_id"]
            isOneToOne: false
            referencedRelation: "sub_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_payments_sub_invoice_id_fkey"
            columns: ["sub_invoice_id"]
            isOneToOne: false
            referencedRelation: "sub_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_scheduled_shifts: {
        Row: {
          cost_code_id: string | null
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
          cost_code_id?: string | null
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
          cost_code_id?: string | null
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
            foreignKeyName: "sub_scheduled_shifts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "sub_scheduled_shifts_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_scheduled_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
          compliance_coi_expiration: string | null
          compliance_license_expiration: string | null
          compliance_notes: string | null
          compliance_w9_received: boolean | null
          created_at: string | null
          default_rate: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          trade: string | null
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_name?: string | null
          compliance_coi_expiration?: string | null
          compliance_license_expiration?: string | null
          compliance_notes?: string | null
          compliance_w9_received?: boolean | null
          created_at?: string | null
          default_rate?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          trade?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_name?: string | null
          compliance_coi_expiration?: string | null
          compliance_license_expiration?: string | null
          compliance_notes?: string | null
          compliance_w9_received?: boolean | null
          created_at?: string | null
          default_rate?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          trade?: string | null
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      time_log_allocations: {
        Row: {
          cost_code_id: string | null
          created_at: string | null
          day_card_id: string
          hours: number
          id: string
          notes: string | null
          project_id: string
          trade_id: string | null
          updated_at: string | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string | null
          day_card_id: string
          hours: number
          id?: string
          notes?: string | null
          project_id: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string | null
          day_card_id?: string
          hours?: number
          id?: string
          notes?: string | null
          project_id?: string
          trade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_log_allocations_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "time_log_allocations_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_log_allocations_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "day_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_log_allocations_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "day_cards_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_log_allocations_day_card_id_fkey"
            columns: ["day_card_id"]
            isOneToOne: false
            referencedRelation: "worker_day_summary"
            referencedColumns: ["day_card_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_log_allocations_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          company_id: string | null
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          hourly_rate: number | null
          hours_worked: number
          id: string
          labor_cost: number | null
          last_synced_at: string | null
          notes: string | null
          paid_amount: number | null
          payment_id: string | null
          payment_status: string | null
          project_id: string
          source_schedule_id: string | null
          trade_id: string | null
          worker_id: string
        }
        Insert: {
          company_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          hourly_rate?: number | null
          hours_worked: number
          id?: string
          labor_cost?: number | null
          last_synced_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          project_id: string
          source_schedule_id?: string | null
          trade_id?: string | null
          worker_id: string
        }
        Update: {
          company_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          hourly_rate?: number | null
          hours_worked?: number
          id?: string
          labor_cost?: number | null
          last_synced_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          project_id?: string
          source_schedule_id?: string | null
          trade_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "time_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "time_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_source_schedule_id_fkey"
            columns: ["source_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          default_labor_cost_code_id: string | null
          default_material_cost_code_id: string | null
          default_sub_cost_code_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          default_labor_cost_code_id?: string | null
          default_material_cost_code_id?: string | null
          default_sub_cost_code_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          default_labor_cost_code_id?: string | null
          default_material_cost_code_id?: string | null
          default_sub_cost_code_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_default_labor_cost_code_id_fkey"
            columns: ["default_labor_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "trades_default_labor_cost_code_id_fkey"
            columns: ["default_labor_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_default_material_cost_code_id_fkey"
            columns: ["default_material_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "trades_default_material_cost_code_id_fkey"
            columns: ["default_material_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_default_sub_cost_code_id_fkey"
            columns: ["default_sub_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "trades_default_sub_cost_code_id_fkey"
            columns: ["default_sub_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
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
      work_schedules: {
        Row: {
          company_id: string | null
          converted_to_timelog: boolean | null
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_synced_at: string | null
          notes: string | null
          project_id: string | null
          scheduled_date: string
          scheduled_hours: number
          source_schedule_id: string | null
          status: string | null
          trade_id: string | null
          type: string | null
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          company_id?: string | null
          converted_to_timelog?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_date: string
          scheduled_hours?: number
          source_schedule_id?: string | null
          status?: string | null
          trade_id?: string | null
          type?: string | null
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          company_id?: string | null
          converted_to_timelog?: boolean | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_date?: string
          scheduled_hours?: number
          source_schedule_id?: string | null
          status?: string | null
          trade_id?: string | null
          type?: string | null
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "work_schedules_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "work_schedules_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
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
      company_payroll_summary: {
        Row: {
          company_id: string | null
          company_name: string | null
          last_activity_date: string | null
          total_hours: number | null
          total_paid: number | null
          total_unpaid: number | null
          worker_count: number | null
        }
        Relationships: []
      }
      cost_code_actuals: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          category: string | null
          code: string | null
          cost_code_id: string | null
          cost_code_name: string | null
          project_id: string | null
          project_name: string | null
          worker_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_log_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      day_cards_with_details: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          id: string | null
          jobs: Json[] | null
          locked: boolean | null
          logged_hours: number | null
          metadata: Json | null
          notes: string | null
          pay_rate: number | null
          pay_status: string | null
          scheduled_hours: number | null
          status: string | null
          trade_name: string | null
          updated_at: string | null
          worker_default_rate: number | null
          worker_id: string | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_actuals_by_cost_code: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          cost_code: string | null
          cost_code_id: string | null
          cost_code_name: string | null
          project_id: string | null
          worker_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_code_actuals"
            referencedColumns: ["cost_code_id"]
          },
          {
            foreignKeyName: "daily_logs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_actuals_by_project: {
        Row: {
          company_id: string | null
          material_actual: number | null
          material_variance: number | null
          materials_budget: number | null
          project_id: string | null
          project_name: string | null
          receipt_count: number | null
          vendor_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
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
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
            referencedRelation: "work_schedules"
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
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      project_labor_summary: {
        Row: {
          last_activity_date: string | null
          paid_labor_cost: number | null
          project_id: string | null
          project_name: string | null
          total_hours_logged: number | null
          total_hours_scheduled: number | null
          total_labor_cost: number | null
          unpaid_labor_cost: number | null
          worker_count: number | null
        }
        Relationships: []
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
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
      sub_contract_summary: {
        Row: {
          company_name: string | null
          contract_id: string | null
          contract_value: number | null
          outstanding_balance: number | null
          project_id: string | null
          remaining_to_bill: number | null
          retention_percentage: number | null
          status: string | null
          sub_id: string | null
          sub_name: string | null
          total_billed: number | null
          total_paid: number | null
          total_retention_held: number | null
          total_retention_released: number | null
          trade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_costs_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_labor_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sub_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_contracts_sub_id_fkey"
            columns: ["sub_id"]
            isOneToOne: false
            referencedRelation: "subs"
            referencedColumns: ["id"]
          },
        ]
      }
      unpaid_labor_bills: {
        Row: {
          company_id: string | null
          company_name: string | null
          log_count: number | null
          period_end: string | null
          period_start: string | null
          project_id: string | null
          project_name: string | null
          total_amount: number | null
          total_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "material_actuals_by_project"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_labor_summary"
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
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
        ]
      }
      worker_day_summary: {
        Row: {
          allocations: Json | null
          company_id: string | null
          company_name: string | null
          date: string | null
          day_card_id: string | null
          lifecycle_status: string | null
          locked: boolean | null
          logged_hours: number | null
          pay_rate: number | null
          pay_status: string | null
          scheduled_hours: number | null
          total_cost: number | null
          unpaid_amount: number | null
          worker_id: string | null
          worker_name: string | null
          worker_rate: number | null
          worker_trade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_payroll_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_cards_worker_id_fkey"
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
      workforce_activity_feed: {
        Row: {
          amount: number | null
          company_id: string | null
          company_name: string | null
          event_at: string | null
          event_type: string | null
          hours: number | null
          id: string | null
          meta: Json | null
          project_id: string | null
          project_name: string | null
          worker_id: string | null
          worker_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_create_past_logs: { Args: never; Returns: undefined }
      delete_old_archived_logs: { Args: never; Returns: undefined }
      generate_proposal_public_token: { Args: never; Returns: string }
      get_material_actuals_by_cost_code: {
        Args: { p_cost_code_id: string; p_project_id: string }
        Returns: number
      }
      get_material_actuals_by_project: {
        Args: { p_project_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_proposal_event: {
        Args: {
          p_actor_email?: string
          p_actor_ip?: string
          p_actor_name?: string
          p_event_type: string
          p_metadata?: Json
          p_proposal_id: string
        }
        Returns: string
      }
      migrate_to_day_cards: { Args: never; Returns: undefined }
      split_schedule_for_multi_project: {
        Args: { p_original_schedule_id: string; p_time_log_entries: Json }
        Returns: {
          schedule_id: string
          time_log_id: string
        }[]
      }
      split_work_schedule_for_multi_project: {
        Args: { p_original_schedule_id: string; p_time_log_entries: Json }
        Returns: {
          schedule_id: string
          time_log_id: string
        }[]
      }
      sync_estimate_to_budget: {
        Args: { p_estimate_id: string }
        Returns: undefined
      }
      update_proposal_acceptance: {
        Args: {
          p_acceptance_ip?: string
          p_acceptance_notes?: string
          p_accepted_by_email?: string
          p_accepted_by_name: string
          p_client_signature?: string
          p_new_status: string
          p_proposal_id: string
        }
        Returns: Json
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
