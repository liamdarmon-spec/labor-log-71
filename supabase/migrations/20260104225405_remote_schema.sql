create type "public"."billing_milestone_status" as enum ('draft', 'active', 'locked', 'archived');

create type "public"."invoice_source_type" as enum ('freestanding', 'proposal', 'payment_schedule');

create type "public"."payment_method_type" as enum ('ach', 'check', 'credit_card', 'wire', 'cash', 'other');

create type "public"."work_order_status" as enum ('draft', 'issued', 'scheduled', 'in_progress', 'complete', 'billed', 'paid', 'cancelled');

create sequence "public"."change_order_number_seq";

create sequence "public"."invoice_number_seq";

drop trigger if exists "set_company_id_from_document" on "public"."document_tags";

drop trigger if exists "set_company_id_from_invoice" on "public"."invoice_items";

drop trigger if exists "set_company_id_from_project" on "public"."sub_logs";

alter table "public"."activity_log" drop constraint "activity_log_company_id_not_null";

alter table "public"."archived_daily_logs" drop constraint "archived_daily_logs_company_id_not_null";

alter table "public"."bid_invitations" drop constraint "bid_invitations_company_id_not_null";

alter table "public"."bid_packages" drop constraint "bid_packages_company_id_not_null";

alter table "public"."budget_revisions" drop constraint "budget_revisions_company_id_not_null";

alter table "public"."company_invites" drop constraint "company_invites_company_id_not_null";

alter table "public"."company_members" drop constraint "company_members_company_id_not_null";

alter table "public"."company_users" drop constraint "company_users_company_id_not_null";

alter table "public"."cost_codes" drop constraint "cost_codes_company_id_not_null";

alter table "public"."cost_entries" drop constraint "cost_entries_company_id_not_null";

alter table "public"."costs" drop constraint "costs_company_id_not_null";

alter table "public"."customer_payments" drop constraint "customer_payments_company_id_not_null";

alter table "public"."daily_logs" drop constraint "daily_logs_company_id_not_null";

alter table "public"."day_card_jobs" drop constraint "day_card_jobs_company_id_not_null";

alter table "public"."day_cards" drop constraint "day_cards_company_id_not_null";

alter table "public"."document_tags" drop constraint "document_tags_company_id_not_null";

alter table "public"."documents" drop constraint "documents_company_id_not_null";

alter table "public"."entity_change_log" drop constraint "entity_change_log_change_type_check";

alter table "public"."entity_change_log" drop constraint "entity_change_log_company_id_not_null";

alter table "public"."entity_change_log" drop constraint "entity_change_log_entity_type_check";

alter table "public"."estimate_items" drop constraint "estimate_items_company_id_not_null";

alter table "public"."estimates" drop constraint "estimates_company_id_not_null";

alter table "public"."invitations" drop constraint "invitations_company_id_not_null";

alter table "public"."invoice_items" drop constraint "invoice_items_category_check";

alter table "public"."invoice_items" drop constraint "invoice_items_company_id_not_null";

alter table "public"."invoices" drop constraint "invoices_company_id_not_null";

alter table "public"."labor_pay_run_items" drop constraint "labor_pay_run_items_company_id_not_null";

alter table "public"."labor_pay_runs" drop constraint "labor_pay_runs_company_id_not_null";

alter table "public"."material_receipts" drop constraint "material_receipts_company_id_not_null";

alter table "public"."material_receipts" drop constraint "material_receipts_receipt_document_id_fkey";

alter table "public"."material_vendors" drop constraint "material_vendors_company_id_not_null";

alter table "public"."measurement_units" drop constraint "measurement_units_company_id_not_null";

alter table "public"."payments" drop constraint "payments_company_id_not_null";

alter table "public"."project_budget_groups" drop constraint "project_budget_groups_company_id_not_null";

alter table "public"."project_budget_lines" drop constraint "project_budget_lines_company_id_not_null";

alter table "public"."project_budgets" drop constraint "project_budgets_company_id_not_null";

alter table "public"."project_checklist_items" drop constraint "project_checklist_items_project_checklist_id_fkey";

alter table "public"."project_checklist_items" drop constraint "project_checklist_items_template_item_id_fkey";

alter table "public"."project_checklists" drop constraint "project_checklists_estimate_id_fkey";

alter table "public"."project_checklists" drop constraint "project_checklists_scope_block_id_fkey";

alter table "public"."project_todos" drop constraint "project_todos_company_id_not_null";

alter table "public"."projects" drop constraint "projects_company_id_not_null";

alter table "public"."proposal_estimate_settings" drop constraint "proposal_estimate_settings_company_id_fkey";

alter table "public"."proposal_estimate_settings" drop constraint "proposal_estimate_settings_company_id_not_null";

alter table "public"."proposal_estimate_settings" drop constraint "proposal_estimate_settings_company_id_setting_type_key";

alter table "public"."proposal_estimate_settings" drop constraint "proposal_estimate_settings_setting_type_check";

alter table "public"."proposal_events" drop constraint "proposal_events_company_id_not_null";

alter table "public"."proposal_images" drop constraint "proposal_images_company_id_not_null";

alter table "public"."proposal_images" drop constraint "proposal_images_section_id_fkey";

alter table "public"."proposal_section_items" drop constraint "proposal_section_items_company_id_not_null";

alter table "public"."proposal_sections" drop constraint "proposal_sections_company_id_not_null";

alter table "public"."proposal_settings" drop constraint "proposal_settings_company_id_not_null";

alter table "public"."proposal_templates" drop constraint "proposal_templates_company_id_not_null";

alter table "public"."proposals" drop constraint "proposals_acceptance_status_check";

alter table "public"."proposals" drop constraint "proposals_company_id_not_null";

alter table "public"."proposals" drop constraint "proposals_parent_proposal_id_fkey";

alter table "public"."proposals" drop constraint "proposals_presentation_mode_check";

alter table "public"."schedule_modifications" drop constraint "schedule_modifications_company_id_not_null";

alter table "public"."schedule_of_values" drop constraint "schedule_of_values_company_id_not_null";

alter table "public"."scheduled_shifts" drop constraint "scheduled_shifts_company_id_not_null";

alter table "public"."scope_block_cost_items" drop constraint "scope_block_cost_items_company_id_not_null";

alter table "public"."scope_blocks" drop constraint "scope_blocks_company_id_not_null";

alter table "public"."sub_bids" drop constraint "sub_bids_company_id_not_null";

alter table "public"."sub_compliance_documents" drop constraint "sub_compliance_documents_company_id_not_null";

alter table "public"."sub_contracts" drop constraint "sub_contracts_company_id_not_null";

alter table "public"."sub_invoices" drop constraint "sub_invoices_company_id_not_null";

alter table "public"."sub_logs" drop constraint "sub_logs_company_id_not_null";

alter table "public"."sub_payments" drop constraint "sub_payments_company_id_not_null";

alter table "public"."sub_scheduled_shifts" drop constraint "sub_scheduled_shifts_company_id_not_null";

alter table "public"."subs" drop constraint "subs_company_id_not_null";

alter table "public"."time_log_allocations" drop constraint "time_log_allocations_company_id_not_null";

alter table "public"."time_logs" drop constraint "time_logs_company_id_not_null";

alter table "public"."trades" drop constraint "trades_company_id_not_null";

alter table "public"."vendor_payments" drop constraint "vendor_payments_company_id_not_null";

alter table "public"."work_schedules" drop constraint "work_schedules_company_id_not_null";

alter table "public"."workers" drop constraint "workers_company_id_not_null";

alter table "public"."checklist_question_answers" drop constraint "checklist_question_answers_question_id_fkey";

alter table "public"."costs" drop constraint "costs_cost_code_id_fkey";

alter table "public"."customer_payments" drop constraint "customer_payments_invoice_id_fkey";

alter table "public"."customer_payments" drop constraint "customer_payments_project_id_fkey";

alter table "public"."estimate_items" drop constraint "estimate_items_cost_code_id_fkey";

alter table "public"."estimates" drop constraint "estimates_project_id_fkey";

alter table "public"."invoice_items" drop constraint "invoice_items_cost_code_id_fkey";

alter table "public"."invoice_items" drop constraint "invoice_items_invoice_id_fkey";

alter table "public"."invoices" drop constraint "invoices_project_id_fkey";

alter table "public"."material_receipts" drop constraint "material_receipts_vendor_id_fkey";

alter table "public"."project_budget_lines" drop constraint "project_budget_lines_cost_code_id_fkey";

alter table "public"."project_budget_lines" drop constraint "project_budget_lines_project_budget_id_fkey";

alter table "public"."project_budget_lines" drop constraint "project_budget_lines_project_id_fkey";

alter table "public"."project_budgets" drop constraint "project_budgets_project_id_fkey";

alter table "public"."project_checklists" drop constraint "project_checklists_project_id_fkey";

alter table "public"."project_financials_snapshot" drop constraint "project_financials_snapshot_project_id_fkey";

alter table "public"."scope_block_cost_items" drop constraint "scope_block_cost_items_cost_code_id_fkey";

alter table "public"."time_logs" drop constraint "time_logs_cost_code_id_fkey";

alter table "public"."time_logs" drop constraint "time_logs_project_id_fkey";

alter table "public"."time_logs" drop constraint "time_logs_worker_id_fkey";

alter table "public"."vendor_payment_items" drop constraint "vendor_payment_items_cost_id_fkey";

alter table "public"."workers" drop constraint "workers_trade_id_fkey";

drop function if exists "public"."tg_set_company_id_from_document"();

drop function if exists "public"."tg_set_company_id_from_invoice"();

drop function if exists "public"."tg_set_company_id_from_time_log"();

drop view if exists "public"."company_payroll_summary";

drop view if exists "public"."cost_code_actuals";

drop view if exists "public"."day_cards_with_details";

drop view if exists "public"."global_financial_summary_view";

drop view if exists "public"."labor_actuals_by_cost_code";

drop view if exists "public"."material_actuals_by_project";

drop view if exists "public"."monthly_costs_view";

drop view if exists "public"."monthly_labor_costs_view";

drop view if exists "public"."payment_labor_summary";

drop view if exists "public"."project_activity_view";

drop view if exists "public"."project_budget_ledger_view";

drop view if exists "public"."project_budget_vs_actual_view";

drop view if exists "public"."project_cost_summary_view";

drop view if exists "public"."project_costs_view";

drop view if exists "public"."project_dashboard_view";

drop view if exists "public"."project_labor_costs_view";

drop view if exists "public"."project_labor_summary";

drop view if exists "public"."project_labor_summary_view";

drop view if exists "public"."project_revenue_summary_view";

drop view if exists "public"."project_schedule_view";

drop view if exists "public"."sub_contract_summary";

drop view if exists "public"."time_logs_with_meta_view";

drop view if exists "public"."unpaid_labor_bills";

drop view if exists "public"."unpaid_time_logs_available_for_pay_run";

drop view if exists "public"."work_schedule_grid_view";

drop view if exists "public"."worker_day_summary";

drop view if exists "public"."workers_public";

drop view if exists "public"."workforce_activity_feed";

drop index if exists "public"."idx_project_checklists_estimate";

drop index if exists "public"."idx_proposal_images_section_id";

drop index if exists "public"."idx_proposal_templates_created_by";

drop index if exists "public"."proposal_estimate_settings_company_id_setting_type_key";

drop index if exists "public"."idx_labor_pay_runs_created_at";

drop index if exists "public"."idx_project_checklist_items_checklist";

drop index if exists "public"."idx_sub_scheduled_shifts_project";

drop index if exists "public"."idx_sub_scheduled_shifts_sub";

drop index if exists "public"."idx_time_logs_source_schedule";

drop index if exists "public"."idx_time_logs_unpaid_company";

drop index if exists "public"."idx_work_schedules_worker_status";


  create table "public"."change_order_items" (
    "id" uuid not null default gen_random_uuid(),
    "change_order_id" uuid not null,
    "description" text not null,
    "quantity" numeric not null default 1,
    "unit" text not null default 'ea'::text,
    "unit_price" numeric not null default 0,
    "line_total" numeric not null default 0,
    "cost_code_id" uuid,
    "display_group" text,
    "reference_type" text,
    "reference_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."change_orders" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "change_order_number" text,
    "title" text not null default 'Change Order'::text,
    "description" text,
    "status" text not null default 'draft'::text,
    "approved_at" timestamp with time zone,
    "subtotal_amount" numeric not null default 0,
    "tax_amount" numeric not null default 0,
    "total_amount" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."generated_documents" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "project_id" uuid,
    "doc_type" text not null,
    "entity_id" uuid not null,
    "version" integer not null default 1,
    "status" text not null default 'draft'::text,
    "template_key" text not null default 'default'::text,
    "renderer" text not null default 'playwright'::text,
    "locale" text not null default 'en-US'::text,
    "currency" text not null default 'USD'::text,
    "snapshot" jsonb not null default '{}'::jsonb,
    "snapshot_hash" text not null,
    "render_hash" text not null,
    "storage_bucket" text not null default 'generated'::text,
    "storage_path" text,
    "file_name" text,
    "mime_type" text not null default 'application/pdf'::text,
    "file_size_bytes" bigint,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "finalized_at" timestamp with time zone
      );



  create table "public"."invoice_payments" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "received_on" date not null default CURRENT_DATE,
    "amount" numeric not null default 0,
    "method" public.payment_method_type not null default 'other'::public.payment_method_type,
    "reference" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "paid_on" date not null default CURRENT_DATE
      );



  create table "public"."payment_schedule_allocations" (
    "id" uuid not null default gen_random_uuid(),
    "payment_schedule_item_id" uuid not null,
    "sov_item_id" uuid not null,
    "percent_of_sov" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."payment_schedule_items" (
    "id" uuid not null default gen_random_uuid(),
    "payment_schedule_id" uuid not null,
    "title" text not null,
    "due_on" date,
    "percent_of_contract" numeric,
    "fixed_amount" numeric,
    "scheduled_amount" numeric not null default 0,
    "sort_order" integer not null default 0,
    "is_archived" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."payment_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "proposal_id" uuid,
    "name" text not null default 'Payment Schedule'::text,
    "status" public.billing_milestone_status not null default 'draft'::public.billing_milestone_status,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."pdf_render_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "generated_document_id" uuid not null,
    "status" text not null default 'queued'::text,
    "attempt_count" integer not null default 0,
    "max_attempts" integer not null default 5,
    "locked_at" timestamp with time zone,
    "locked_by" text,
    "error_message" text,
    "error_details" jsonb,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "priority" integer not null default 100,
    "worker_id" text
      );



  create table "public"."sov_items" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "proposal_id" uuid,
    "change_order_id" uuid,
    "cost_code_id" uuid,
    "area_label" text,
    "trade" text,
    "description" text not null,
    "scheduled_value" numeric not null default 0,
    "sort_order" integer not null default 0,
    "is_archived" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."work_orders" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "sub_company_id" uuid,
    "budget_item_id" uuid,
    "title" text not null,
    "scope_summary" text,
    "original_amount" numeric(12,2),
    "approved_amount" numeric(12,2),
    "retained_amount" numeric(12,2) default 0,
    "status" public.work_order_status not null default 'draft'::public.work_order_status,
    "due_date" date,
    "scheduled_start" date,
    "scheduled_end" date,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."bid_invitations" drop column "created_by";

alter table "public"."bid_packages" drop column "created_by";

alter table "public"."budget_revisions" drop column "updated_at";

alter table "public"."budget_revisions" add column "approved_at" timestamp with time zone;

alter table "public"."budget_revisions" add column "approved_by" uuid;

alter table "public"."budget_revisions" add column "created_by" uuid;

alter table "public"."budget_revisions" add column "new_budget" numeric not null;

alter table "public"."budget_revisions" add column "notes" text;

alter table "public"."budget_revisions" add column "previous_budget" numeric;

alter table "public"."budget_revisions" add column "revision_amount" numeric not null;

alter table "public"."budget_revisions" add column "revision_type" text not null;

alter table "public"."budget_revisions" add column "status" text default 'pending'::text;

alter table "public"."budget_revisions" alter column "project_id" set not null;

alter table "public"."budget_revisions" alter column "revision_number" set not null;

alter table "public"."companies" drop column "updated_at";

alter table "public"."companies" alter column "created_at" drop not null;

alter table "public"."cost_codes" drop column "created_by";

alter table "public"."cost_entries" drop column "amount";

alter table "public"."cost_entries" drop column "date";

alter table "public"."cost_entries" add column "created_by" uuid;

alter table "public"."cost_entries" add column "invoice_number" text;

alter table "public"."cost_entries" add column "notes" text;

alter table "public"."cost_entries" add column "quantity" numeric;

alter table "public"."cost_entries" add column "source_id" uuid;

alter table "public"."cost_entries" add column "source_type" text;

alter table "public"."cost_entries" add column "total_cost" numeric not null;

alter table "public"."cost_entries" add column "unit" text;

alter table "public"."cost_entries" add column "unit_cost" numeric;

alter table "public"."cost_entries" add column "vendor_name" text;

alter table "public"."cost_entries" alter column "entry_date" set not null;

alter table "public"."cost_entries" alter column "entry_type" set not null;

alter table "public"."cost_entries" alter column "project_id" set not null;

alter table "public"."costs" drop column "date";

alter table "public"."costs" drop column "payment_status";

alter table "public"."costs" drop column "vendor_name";

alter table "public"."costs" add column "paid_amount" numeric(12,2) not null default 0;

alter table "public"."costs" add column "retention_amount" numeric(12,2) default 0;

alter table "public"."costs" add column "sub_id" uuid;

alter table "public"."costs" add column "work_order_id" uuid;

alter table "public"."costs" alter column "amount" set default 0;

alter table "public"."costs" alter column "amount" set not null;

alter table "public"."costs" alter column "category" set not null;

alter table "public"."costs" alter column "date_incurred" set default CURRENT_DATE;

alter table "public"."costs" alter column "date_incurred" set not null;

alter table "public"."costs" alter column "description" set not null;

alter table "public"."costs" alter column "project_id" set not null;

alter table "public"."costs" alter column "quantity" set data type numeric using "quantity"::numeric;

alter table "public"."costs" alter column "status" set not null;

alter table "public"."costs" alter column "unit_cost" set data type numeric using "unit_cost"::numeric;

alter table "public"."customer_payments" drop column "date";

alter table "public"."customer_payments" add column "applied_to_retention" numeric default 0;

alter table "public"."customer_payments" add column "created_by" uuid;

alter table "public"."customer_payments" add column "payment_date" date not null default CURRENT_DATE;

alter table "public"."customer_payments" alter column "amount" set not null;

alter table "public"."customer_payments" alter column "project_id" set not null;

alter table "public"."daily_logs" alter column "hours_worked" set data type numeric using "hours_worked"::numeric;

alter table "public"."day_card_jobs" drop column "created_by";

alter table "public"."document_tags" alter column "created_at" set not null;

alter table "public"."document_tags" alter column "document_id" set not null;

alter table "public"."documents" drop column "created_by";

alter table "public"."documents" alter column "is_archived" set default false;

alter table "public"."documents" alter column "is_archived" set not null;

alter table "public"."estimate_items" alter column "line_total" set data type numeric using "line_total"::numeric;

alter table "public"."estimate_items" alter column "quantity" set data type numeric using "quantity"::numeric;

alter table "public"."estimate_items" alter column "unit_price" set data type numeric using "unit_price"::numeric;

alter table "public"."estimates" alter column "subtotal_amount" set data type numeric using "subtotal_amount"::numeric;

alter table "public"."estimates" alter column "tax_amount" set data type numeric using "tax_amount"::numeric;

alter table "public"."estimates" alter column "total_amount" set data type numeric using "total_amount"::numeric;

alter table "public"."invoice_items" add column "change_order_id" uuid;

alter table "public"."invoice_items" add column "display_group" text;

alter table "public"."invoice_items" add column "reference_id" uuid;

alter table "public"."invoice_items" add column "reference_type" text;

alter table "public"."invoice_items" add column "sov_item_id" uuid;

alter table "public"."invoice_items" alter column "line_total" set data type numeric using "line_total"::numeric;

alter table "public"."invoice_items" alter column "quantity" set data type numeric using "quantity"::numeric;

alter table "public"."invoice_items" alter column "unit_price" set data type numeric using "unit_price"::numeric;

alter table "public"."invoices" add column "payment_schedule_id" uuid;

alter table "public"."invoices" add column "payment_schedule_item_id" uuid;

alter table "public"."invoices" add column "proposal_id" uuid;

alter table "public"."invoices" add column "sent_at" timestamp with time zone;

alter table "public"."invoices" add column "source_id" uuid;

alter table "public"."invoices" add column "source_type" text;

alter table "public"."invoices" alter column "subtotal_amount" set not null;

alter table "public"."invoices" alter column "subtotal_amount" set data type numeric using "subtotal_amount"::numeric;

alter table "public"."invoices" alter column "tax_amount" set data type numeric using "tax_amount"::numeric;

alter table "public"."invoices" alter column "total_amount" set not null;

alter table "public"."invoices" alter column "total_amount" set data type numeric using "total_amount"::numeric;

alter table "public"."labor_pay_run_items" drop column "updated_at";

alter table "public"."labor_pay_run_items" alter column "amount" set not null;

alter table "public"."labor_pay_run_items" alter column "pay_run_id" set not null;

alter table "public"."labor_pay_run_items" alter column "time_log_id" set not null;

alter table "public"."labor_pay_runs" drop column "pay_period_end";

alter table "public"."labor_pay_runs" drop column "pay_period_start";

alter table "public"."labor_pay_runs" add column "created_by" uuid;

alter table "public"."labor_pay_runs" add column "date_range_end" date not null;

alter table "public"."labor_pay_runs" add column "date_range_start" date not null;

alter table "public"."labor_pay_runs" add column "notes" text;

alter table "public"."labor_pay_runs" add column "payee_company_id" uuid;

alter table "public"."labor_pay_runs" add column "payment_method" text;

alter table "public"."material_vendors" drop column "contact_email";

alter table "public"."material_vendors" drop column "contact_name";

alter table "public"."material_vendors" drop column "contact_phone";

alter table "public"."material_vendors" drop column "vendor_name";

alter table "public"."material_vendors" alter column "active" set default true;

alter table "public"."material_vendors" alter column "name" set not null;

alter table "public"."measurement_units" enable row level security;

alter table "public"."project_budget_lines" drop column "description";

alter table "public"."project_budget_lines" add column "area_label" text;

alter table "public"."project_budget_lines" add column "group_label" text;

alter table "public"."project_budget_lines" alter column "client_visible" drop not null;

alter table "public"."project_budget_lines" alter column "is_optional" drop not null;

alter table "public"."project_budget_lines" alter column "qty" drop default;

alter table "public"."project_budget_lines" alter column "qty" drop not null;

alter table "public"."project_budget_lines" alter column "scope_type" drop not null;

alter table "public"."project_budget_lines" alter column "sort_order" set default 0;

alter table "public"."project_budget_lines" alter column "unit_cost" drop default;

alter table "public"."project_budget_lines" alter column "unit_cost" drop not null;

alter table "public"."project_budgets" drop column "created_by";

alter table "public"."project_budgets" alter column "labor_budget" set data type numeric using "labor_budget"::numeric;

alter table "public"."project_budgets" alter column "materials_budget" set data type numeric using "materials_budget"::numeric;

alter table "public"."project_budgets" alter column "name" drop not null;

alter table "public"."project_budgets" alter column "other_budget" set data type numeric using "other_budget"::numeric;

alter table "public"."project_budgets" alter column "status" set default 'active'::text;

alter table "public"."project_budgets" alter column "status" drop not null;

alter table "public"."project_budgets" alter column "subs_budget" set data type numeric using "subs_budget"::numeric;

alter table "public"."project_checklist_items" drop column "assignee_user_id";

alter table "public"."project_checklist_items" drop column "completed_by_user_id";

alter table "public"."project_checklist_items" drop column "due_date";

alter table "public"."project_checklist_items" drop column "project_checklist_id";

alter table "public"."project_checklist_items" drop column "required";

alter table "public"."project_checklist_items" drop column "template_item_id";

alter table "public"."project_checklist_items" add column "checklist_id" uuid not null;

alter table "public"."project_checklist_items" add column "completed_by" uuid;

alter table "public"."project_checklist_items" add column "is_completed" boolean default false;

alter table "public"."project_checklist_items" alter column "sort_order" drop not null;

alter table "public"."project_checklists" drop column "estimate_id";

alter table "public"."project_checklists" drop column "progress_cached";

alter table "public"."project_checklists" drop column "project_type";

alter table "public"."project_checklists" drop column "scope_block_id";

alter table "public"."project_checklists" drop column "title";

alter table "public"."project_checklists" add column "name" text not null;

alter table "public"."project_checklists" add column "template_id" uuid;

alter table "public"."project_checklists" alter column "phase" drop not null;

alter table "public"."project_checklists" alter column "status" set default 'active'::text;

alter table "public"."project_financials_snapshot" drop column "actual_cost_labor";

alter table "public"."project_financials_snapshot" drop column "actual_cost_materials";

alter table "public"."project_financials_snapshot" drop column "actual_cost_other";

alter table "public"."project_financials_snapshot" drop column "actual_cost_subs";

alter table "public"."project_financials_snapshot" drop column "actual_cost_total";

alter table "public"."project_financials_snapshot" drop column "baseline_budget";

alter table "public"."project_financials_snapshot" drop column "billed_to_date";

alter table "public"."project_financials_snapshot" drop column "contract_amount";

alter table "public"."project_financials_snapshot" drop column "forecast_at_completion";

alter table "public"."project_financials_snapshot" drop column "last_calculated_at";

alter table "public"."project_financials_snapshot" drop column "open_ap_labor";

alter table "public"."project_financials_snapshot" drop column "open_ap_subs";

alter table "public"."project_financials_snapshot" drop column "open_ar";

alter table "public"."project_financials_snapshot" drop column "paid_to_date";

alter table "public"."project_financials_snapshot" drop column "profit_amount";

alter table "public"."project_financials_snapshot" drop column "profit_percent";

alter table "public"."project_financials_snapshot" drop column "revised_budget";

alter table "public"."project_financials_snapshot" add column "labor_actual" numeric default 0;

alter table "public"."project_financials_snapshot" add column "labor_budget" numeric default 0;

alter table "public"."project_financials_snapshot" add column "last_refreshed_at" timestamp with time zone default now();

alter table "public"."project_financials_snapshot" add column "materials_actual" numeric default 0;

alter table "public"."project_financials_snapshot" add column "materials_budget" numeric default 0;

alter table "public"."project_financials_snapshot" add column "other_actual" numeric default 0;

alter table "public"."project_financials_snapshot" add column "other_budget" numeric default 0;

alter table "public"."project_financials_snapshot" add column "subs_actual" numeric default 0;

alter table "public"."project_financials_snapshot" add column "subs_budget" numeric default 0;

alter table "public"."project_financials_snapshot" add column "total_actual" numeric default 0;

alter table "public"."project_financials_snapshot" add column "total_budget" numeric default 0;

alter table "public"."project_financials_snapshot" add column "total_invoiced" numeric default 0;

alter table "public"."project_financials_snapshot" add column "total_paid" numeric default 0;

-- Fix: drop net_contract_value FIRST (it's a generated column that depends on approved_cos_amount)
-- Also use idempotent pattern in case prereq migration already dropped it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_subcontracts' AND column_name = 'net_contract_value') THEN
    EXECUTE 'ALTER TABLE public.project_subcontracts DROP COLUMN net_contract_value';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_subcontracts' AND column_name = 'approved_cos_amount') THEN
    EXECUTE 'ALTER TABLE public.project_subcontracts DROP COLUMN approved_cos_amount';
  END IF;
END
$$;

alter table "public"."project_subcontracts" drop column "notes";

alter table "public"."project_subcontracts" drop column "retention_percent";

alter table "public"."project_subcontracts" add column "scope_description" text;

alter table "public"."project_subcontracts" alter column "contract_amount" drop default;

alter table "public"."project_subcontracts" alter column "contract_amount" drop not null;

alter table "public"."project_subcontracts" alter column "created_at" drop not null;

alter table "public"."project_subcontracts" alter column "updated_at" drop not null;

alter table "public"."project_subcontracts" enable row level security;

alter table "public"."project_todos" add column "assignee_id" uuid;

alter table "public"."project_todos" add column "assignee_name" text;

alter table "public"."project_todos" add column "checklist_item_id" uuid;

alter table "public"."project_todos" add column "cost_code_id" uuid;

alter table "public"."project_todos" alter column "created_at" drop not null;

alter table "public"."project_todos" alter column "priority" drop not null;

alter table "public"."project_todos" alter column "status" drop not null;

alter table "public"."project_todos" alter column "task_type" set default 'task'::text;

alter table "public"."project_todos" alter column "task_type" drop not null;

alter table "public"."project_todos" alter column "updated_at" drop not null;

alter table "public"."projects" drop column "created_by";

alter table "public"."projects" drop column "updated_by";

alter table "public"."projects" add column "city" text;

alter table "public"."projects" add column "client_email" text;

alter table "public"."projects" add column "client_phone" text;

alter table "public"."projects" add column "description" text;

alter table "public"."projects" add column "end_date" date;

alter table "public"."projects" add column "notes" text;

alter table "public"."projects" add column "project_number" text;

alter table "public"."projects" add column "start_date" date;

alter table "public"."projects" add column "state" text;

alter table "public"."projects" add column "street_address" text;

alter table "public"."projects" add column "zip_code" text;

alter table "public"."projects" alter column "client_name" drop not null;

alter table "public"."projects" alter column "status" set default 'active'::text;

alter table "public"."projects" alter column "status" drop not null;

alter table "public"."proposal_estimate_settings" drop column "ai_enabled";

alter table "public"."proposal_estimate_settings" drop column "ai_settings";

alter table "public"."proposal_estimate_settings" drop column "branding_colors";

alter table "public"."proposal_estimate_settings" drop column "branding_logo_url";

alter table "public"."proposal_estimate_settings" drop column "company_id";

alter table "public"."proposal_estimate_settings" drop column "default_margin_percent";

alter table "public"."proposal_estimate_settings" drop column "default_markup_labor";

alter table "public"."proposal_estimate_settings" drop column "default_markup_materials";

alter table "public"."proposal_estimate_settings" drop column "default_markup_subs";

alter table "public"."proposal_estimate_settings" drop column "default_terms";

alter table "public"."proposal_estimate_settings" drop column "setting_type";

alter table "public"."proposal_estimate_settings" drop column "template_config";

alter table "public"."proposal_estimate_settings" add column "estimate_id" uuid;

alter table "public"."proposal_estimate_settings" add column "proposal_id" uuid not null;

alter table "public"."proposal_estimate_settings" add column "settings" jsonb default '{}'::jsonb;

alter table "public"."proposal_events" drop column "created_by";

alter table "public"."proposal_events" drop column "event_payload";

alter table "public"."proposal_events" drop column "updated_at";

alter table "public"."proposal_events" add column "actor_email" text;

alter table "public"."proposal_events" add column "actor_ip" text;

alter table "public"."proposal_events" add column "actor_name" text;

alter table "public"."proposal_events" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."proposal_events" alter column "event_type" set not null;

alter table "public"."proposal_events" alter column "proposal_id" set not null;

alter table "public"."proposal_images" drop column "file_name";

alter table "public"."proposal_images" drop column "file_url";

alter table "public"."proposal_images" drop column "section_id";

alter table "public"."proposal_images" add column "image_url" text not null;

alter table "public"."proposal_images" alter column "sort_order" drop not null;

alter table "public"."proposal_line_groups" drop column "display_name";

alter table "public"."proposal_line_groups" drop column "estimate_group_id";

alter table "public"."proposal_line_groups" drop column "estimate_id";

alter table "public"."proposal_line_groups" drop column "markup_mode";

alter table "public"."proposal_line_groups" drop column "override_total_amount";

alter table "public"."proposal_line_groups" drop column "show_group_total";

alter table "public"."proposal_line_groups" drop column "show_line_items";

alter table "public"."proposal_line_groups" add column "group_name" text not null;

alter table "public"."proposal_line_groups" alter column "created_at" drop not null;

alter table "public"."proposal_line_groups" alter column "sort_order" drop not null;

alter table "public"."proposal_line_groups" enable row level security;

alter table "public"."proposal_line_overrides" drop column "custom_description";

alter table "public"."proposal_line_overrides" drop column "custom_label";

alter table "public"."proposal_line_overrides" drop column "custom_quantity";

alter table "public"."proposal_line_overrides" drop column "custom_unit";

alter table "public"."proposal_line_overrides" drop column "custom_unit_price";

alter table "public"."proposal_line_overrides" drop column "estimate_line_id";

alter table "public"."proposal_line_overrides" drop column "show_to_client";

alter table "public"."proposal_line_overrides" add column "display_description" text;

alter table "public"."proposal_line_overrides" add column "estimate_item_id" uuid;

alter table "public"."proposal_line_overrides" add column "is_hidden" boolean default false;

alter table "public"."proposal_line_overrides" alter column "created_at" drop not null;

alter table "public"."proposal_line_overrides" enable row level security;

alter table "public"."proposal_section_items" drop column "company_id";

alter table "public"."proposal_section_items" drop column "created_by";

alter table "public"."proposal_section_items" drop column "display_description";

alter table "public"."proposal_section_items" drop column "display_quantity";

alter table "public"."proposal_section_items" drop column "display_unit";

alter table "public"."proposal_section_items" drop column "display_unit_price";

alter table "public"."proposal_section_items" drop column "estimate_item_id";

alter table "public"."proposal_section_items" drop column "proposal_section_id";

alter table "public"."proposal_section_items" drop column "show_line_item";

alter table "public"."proposal_section_items" add column "content" jsonb default '{}'::jsonb;

alter table "public"."proposal_section_items" add column "item_type" text not null;

alter table "public"."proposal_section_items" add column "section_id" uuid not null;

alter table "public"."proposal_section_items" alter column "created_at" drop not null;

alter table "public"."proposal_section_items" alter column "sort_order" drop not null;

alter table "public"."proposal_section_items" enable row level security;

alter table "public"."proposal_sections" drop column "config";

alter table "public"."proposal_sections" drop column "content_richtext";

alter table "public"."proposal_sections" drop column "created_by";

alter table "public"."proposal_sections" drop column "is_lump_sum";

alter table "public"."proposal_sections" drop column "type";

alter table "public"."proposal_sections" add column "content" jsonb default '{}'::jsonb;

alter table "public"."proposal_sections" add column "section_type" text not null;

alter table "public"."proposal_sections" alter column "created_at" drop not null;

alter table "public"."proposal_sections" alter column "is_visible" drop not null;

alter table "public"."proposal_sections" alter column "title" drop not null;

alter table "public"."proposal_sections" alter column "updated_at" drop not null;

alter table "public"."proposal_templates" drop column "created_by";

alter table "public"."proposal_templates" drop column "template_json";

alter table "public"."proposal_templates" add column "is_default" boolean default false;

alter table "public"."proposal_templates" add column "sections" jsonb default '[]'::jsonb;

alter table "public"."proposal_templates" alter column "name" set not null;

alter table "public"."proposals" drop column "acceptance_method";

alter table "public"."proposals" drop column "accepted_at";

alter table "public"."proposals" drop column "client_email";

alter table "public"."proposals" drop column "client_name";

alter table "public"."proposals" drop column "metadata";

alter table "public"."proposals" drop column "notes_internal";

alter table "public"."proposals" drop column "rejected_at";

alter table "public"."proposals" drop column "sent_at";

alter table "public"."proposals" drop column "version_label";

alter table "public"."proposals" add column "cover_content" jsonb default '{}'::jsonb;

alter table "public"."proposals" add column "payment_terms" text;

alter table "public"."proposals" add column "proposal_kind" text not null default 'proposal'::text;

alter table "public"."proposals" add column "proposal_number" text;

alter table "public"."proposals" add column "subtotal" numeric default 0;

alter table "public"."proposals" add column "tax_percent" numeric default 0;

alter table "public"."proposals" add column "valid_until" date;

alter table "public"."proposals" add column "viewed_count" integer default 0;

alter table "public"."proposals" alter column "created_at" drop not null;

alter table "public"."proposals" alter column "presentation_mode" set default 'detailed'::text;

alter table "public"."proposals" alter column "proposal_date" set default now();

alter table "public"."proposals" alter column "proposal_date" drop not null;

alter table "public"."proposals" alter column "settings" set default '{}'::jsonb;

alter table "public"."proposals" alter column "status" drop not null;

alter table "public"."proposals" alter column "subtotal_amount" set data type numeric(12,2) using "subtotal_amount"::numeric(12,2);

alter table "public"."proposals" alter column "tax_amount" drop not null;

alter table "public"."proposals" alter column "total_amount" drop not null;

alter table "public"."proposals" alter column "updated_at" drop not null;

alter table "public"."proposals" alter column "validity_days" drop not null;

alter table "public"."schedule_of_values" drop column "completed_value";

alter table "public"."schedule_of_values" drop column "line_item";

alter table "public"."schedule_of_values" add column "cost_code_id" uuid;

alter table "public"."schedule_of_values" add column "current_billed" numeric default 0;

alter table "public"."schedule_of_values" add column "description" text not null;

alter table "public"."schedule_of_values" add column "percent_complete" numeric default 0;

alter table "public"."schedule_of_values" add column "previous_billed" numeric default 0;

alter table "public"."schedule_of_values" add column "retention_amount" numeric default 0;

alter table "public"."schedule_of_values" add column "retention_percent" numeric default 10;

alter table "public"."schedule_of_values" add column "sort_order" integer default 0;

alter table "public"."schedule_of_values" add column "total_billed" numeric default 0;

alter table "public"."schedule_of_values" alter column "project_id" set not null;

alter table "public"."schedule_of_values" alter column "scheduled_value" set default 0;

alter table "public"."schedule_of_values" alter column "scheduled_value" set not null;

alter table "public"."scheduled_shifts" alter column "created_at" drop not null;

alter table "public"."scheduled_shifts" alter column "scheduled_hours" set default 8;

alter table "public"."scheduled_shifts" alter column "updated_at" drop not null;

alter table "public"."scope_block_cost_items" drop column "total_price";

alter table "public"."scope_block_cost_items" add column "category" text;

alter table "public"."scope_block_cost_items" add column "line_total" numeric default 0;

alter table "public"."scope_block_cost_items" add column "markup_percent" numeric default 0;

alter table "public"."scope_block_cost_items" add column "notes" text;

alter table "public"."scope_block_cost_items" add column "sort_order" integer default 0;

alter table "public"."scope_block_cost_items" add column "unit" text default 'ea'::text;

alter table "public"."scope_block_cost_items" alter column "description" set not null;

alter table "public"."scope_block_cost_items" alter column "quantity" set default 1;

alter table "public"."scope_block_cost_items" alter column "scope_block_id" set not null;

alter table "public"."scope_block_cost_items" alter column "unit_price" set default 0;

alter table "public"."scope_blocks" add column "area_label" text;

alter table "public"."scope_blocks" add column "block_type" text;

alter table "public"."scope_blocks" add column "is_visible" boolean default true;

alter table "public"."scope_blocks" add column "section_name" text;

alter table "public"."scope_blocks" alter column "entity_id" set not null;

alter table "public"."scope_blocks" alter column "entity_type" set default 'estimate'::text;

alter table "public"."scope_blocks" alter column "entity_type" set not null;

alter table "public"."scope_blocks" alter column "sort_order" set not null;

alter table "public"."sub_bids" drop column "bid_amount";

alter table "public"."sub_bids" drop column "company_id";

alter table "public"."sub_bids" drop column "created_by";

alter table "public"."sub_bids" add column "amount" numeric not null;

alter table "public"."sub_bids" add column "status" text default 'submitted'::text;

alter table "public"."sub_bids" add column "updated_at" timestamp with time zone default now();

alter table "public"."sub_bids" alter column "bid_package_id" drop not null;

alter table "public"."sub_bids" alter column "created_at" drop not null;

alter table "public"."sub_bids" alter column "submitted_at" drop not null;

alter table "public"."sub_bids" enable row level security;

alter table "public"."sub_compliance_documents" drop column "company_id";

alter table "public"."sub_compliance_documents" drop column "created_by";

alter table "public"."sub_compliance_documents" drop column "doc_type";

alter table "public"."sub_compliance_documents" drop column "document_id";

alter table "public"."sub_compliance_documents" drop column "effective_date";

alter table "public"."sub_compliance_documents" drop column "expiry_date";

alter table "public"."sub_compliance_documents" drop column "status";

alter table "public"."sub_compliance_documents" add column "document_type" text not null;

alter table "public"."sub_compliance_documents" add column "expiration_date" date;

alter table "public"."sub_compliance_documents" alter column "created_at" drop not null;

alter table "public"."sub_compliance_documents" alter column "updated_at" drop not null;

alter table "public"."sub_compliance_documents" enable row level security;

alter table "public"."sub_contracts" drop column "amount_billed";

alter table "public"."sub_contracts" drop column "amount_paid";

alter table "public"."sub_contracts" drop column "created_by";

alter table "public"."sub_contracts" drop column "description";

alter table "public"."sub_contracts" drop column "linked_document_id";

alter table "public"."sub_contracts" drop column "payment_terms";

alter table "public"."sub_contracts" drop column "retention_held";

alter table "public"."sub_contracts" add column "notes" text;

alter table "public"."sub_contracts" alter column "retention_percentage" set default 10;

alter table "public"."sub_invoices" drop column "amount_paid";

alter table "public"."sub_invoices" drop column "auto_classified";

alter table "public"."sub_invoices" drop column "created_by";

alter table "public"."sub_invoices" drop column "linked_document_id";

alter table "public"."sub_invoices" drop column "subtotal";

alter table "public"."sub_invoices" drop column "tax";

alter table "public"."sub_invoices" add column "amount" numeric not null;

alter table "public"."sub_invoices" add column "paid_date" date;

alter table "public"."sub_invoices" add column "status" text default 'unpaid'::text;

alter table "public"."sub_invoices" alter column "invoice_date" set default CURRENT_DATE;

alter table "public"."sub_invoices" alter column "invoice_number" set not null;

alter table "public"."sub_invoices" alter column "payment_status" set default 'pending'::text;

alter table "public"."sub_invoices" alter column "total" drop default;

alter table "public"."sub_invoices" alter column "total" drop not null;

alter table "public"."sub_logs" drop column "amount";

alter table "public"."sub_logs" drop column "company_id";

alter table "public"."sub_logs" drop column "created_by";

alter table "public"."sub_logs" drop column "description";

alter table "public"."sub_logs" add column "hours_worked" numeric not null;

alter table "public"."sub_logs" add column "notes" text;

alter table "public"."sub_logs" add column "updated_at" timestamp with time zone default now();

alter table "public"."sub_logs" add column "workers_count" integer default 1;

alter table "public"."sub_logs" enable row level security;

alter table "public"."sub_payments" drop column "company_id";

alter table "public"."sub_payments" drop column "created_by";

alter table "public"."sub_payments" drop column "payment_batch_id";

alter table "public"."sub_payments" add column "payment_method" text;

alter table "public"."sub_payments" add column "updated_at" timestamp with time zone default now();

alter table "public"."sub_payments" alter column "amount_paid" drop default;

alter table "public"."sub_payments" enable row level security;

alter table "public"."sub_scheduled_shifts" add column "work_order_id" uuid;

alter table "public"."sub_scheduled_shifts" add column "workers_count" integer default 1;

alter table "public"."sub_scheduled_shifts" alter column "scheduled_hours" set not null;

alter table "public"."sub_scheduled_shifts" alter column "scheduled_hours" set data type numeric using "scheduled_hours"::numeric;

alter table "public"."subs" drop column "created_by";

alter table "public"."subs" drop column "default_rate";

alter table "public"."subs" add column "address" text;

alter table "public"."subs" add column "default_cost_code_id" uuid;

alter table "public"."subs" add column "hourly_rate" numeric;

alter table "public"."subs" add column "status" text default 'active'::text;

alter table "public"."subs" alter column "active" set not null;

alter table "public"."time_log_allocations" drop column "created_by";

alter table "public"."time_logs" drop column "labor_cost";

alter table "public"."time_logs" add column "created_by" uuid;

alter table "public"."time_logs" add column "payment_id" uuid;

alter table "public"."time_logs" add column "labor_cost" numeric generated always as ((hours_worked * COALESCE(hourly_rate, (0)::numeric))) stored;

alter table "public"."time_logs" alter column "date" set not null;

alter table "public"."time_logs" alter column "hours_worked" set not null;

alter table "public"."time_logs" alter column "project_id" set not null;

alter table "public"."time_logs" alter column "worker_id" set not null;

alter table "public"."trades" drop column "company_id";

alter table "public"."trades" drop column "created_by";

alter table "public"."trades" add column "default_equipment_cost_code_id" uuid;

alter table "public"."trades" add column "updated_at" timestamp with time zone default now();

alter table "public"."vendor_payment_items" drop column "amount";

alter table "public"."vendor_payment_items" add column "applied_amount" numeric not null;

alter table "public"."vendor_payments" alter column "amount" set data type numeric using "amount"::numeric;

alter table "public"."vendor_payments" alter column "payment_date" set default CURRENT_DATE;

alter table "public"."vendor_payments" alter column "status" drop not null;

alter table "public"."work_schedules" add column "work_order_id" uuid;

alter table "public"."work_schedules" alter column "project_id" set not null;

alter table "public"."work_schedules" alter column "scheduled_date" set not null;

alter table "public"."work_schedules" alter column "scheduled_hours" set not null;

alter table "public"."work_schedules" alter column "worker_id" set not null;

alter table "public"."workers" drop column "created_by";

alter table "public"."workers" add column "email" text;

alter table "public"."workers" add column "notes" text;

alter table "public"."workers" add column "status" text default 'active'::text;

alter table "public"."workers" alter column "active" drop not null;

alter table "public"."workers" alter column "hourly_rate" drop not null;

alter table "public"."workers" alter column "hourly_rate" set data type numeric using "hourly_rate"::numeric;

alter table "public"."workers" alter column "trade" drop not null;

CREATE UNIQUE INDEX bid_invitations_bid_package_id_sub_id_key ON public.bid_invitations USING btree (bid_package_id, sub_id);

CREATE UNIQUE INDEX change_order_items_pkey ON public.change_order_items USING btree (id);

CREATE UNIQUE INDEX change_orders_pkey ON public.change_orders USING btree (id);

CREATE UNIQUE INDEX companies_name_key ON public.companies USING btree (name);

CREATE UNIQUE INDEX cost_codes_code_key ON public.cost_codes USING btree (code);

CREATE UNIQUE INDEX day_cards_worker_id_date_key ON public.day_cards USING btree (worker_id, date);

CREATE INDEX generated_documents_entity_idx ON public.generated_documents USING btree (doc_type, entity_id);

CREATE UNIQUE INDEX generated_documents_pkey ON public.generated_documents USING btree (id);

CREATE INDEX generated_documents_project_idx ON public.generated_documents USING btree (project_id);

CREATE UNIQUE INDEX generated_documents_unique_render_hash ON public.generated_documents USING btree (doc_type, entity_id, render_hash);

CREATE UNIQUE INDEX generated_documents_unique_version ON public.generated_documents USING btree (doc_type, entity_id, version);

CREATE INDEX idx_activity_log_created ON public.activity_log USING btree (created_at DESC);

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);

CREATE INDEX idx_bid_invitations_package ON public.bid_invitations USING btree (bid_package_id);

CREATE INDEX idx_bid_packages_project ON public.bid_packages USING btree (project_id);

CREATE UNIQUE INDEX idx_cost_codes_trade_category_unique ON public.cost_codes USING btree (trade_id, category) WHERE ((is_active = true) AND (trade_id IS NOT NULL));

CREATE INDEX idx_cost_codes_trade_id ON public.cost_codes USING btree (trade_id);

CREATE INDEX idx_costs_paid_amount ON public.costs USING btree (paid_amount) WHERE (paid_amount > (0)::numeric);

CREATE INDEX idx_costs_project ON public.costs USING btree (project_id);

CREATE INDEX idx_costs_status_paid_amount ON public.costs USING btree (status, paid_amount);

CREATE INDEX idx_costs_work_order_id ON public.costs USING btree (work_order_id);

CREATE INDEX idx_daily_logs_date ON public.daily_logs USING btree (date);

CREATE INDEX idx_daily_logs_project ON public.daily_logs USING btree (project_id);

CREATE INDEX idx_daily_logs_status ON public.daily_logs USING btree (payment_status);

CREATE INDEX idx_daily_logs_worker ON public.daily_logs USING btree (worker_id);

CREATE INDEX idx_day_card_jobs_day_card ON public.day_card_jobs USING btree (day_card_id);

CREATE INDEX idx_day_card_jobs_project ON public.day_card_jobs USING btree (project_id);

CREATE INDEX idx_day_cards_company ON public.day_cards USING btree (company_id);

CREATE INDEX idx_day_cards_date ON public.day_cards USING btree (date);

CREATE INDEX idx_day_cards_pay_status ON public.day_cards USING btree (pay_status);

CREATE INDEX idx_day_cards_worker ON public.day_cards USING btree (worker_id);

CREATE INDEX idx_document_tags_document ON public.document_tags USING btree (document_id);

CREATE INDEX idx_documents_doc_type ON public.documents USING btree (doc_type);

CREATE INDEX idx_documents_owner ON public.documents USING btree (owner_type, owner_id);

CREATE INDEX idx_documents_project ON public.documents USING btree (project_id);

CREATE INDEX idx_documents_uploaded_at ON public.documents USING btree (uploaded_at DESC);

CREATE INDEX idx_estimate_items_cost_code ON public.estimate_items USING btree (cost_code_id);

CREATE INDEX idx_estimate_items_estimate ON public.estimate_items USING btree (estimate_id);

CREATE INDEX idx_estimates_project ON public.estimates USING btree (project_id);

CREATE INDEX idx_estimates_status ON public.estimates USING btree (status);

CREATE UNIQUE INDEX idx_generated_documents_render_hash_unique ON public.generated_documents USING btree (render_hash);

CREATE INDEX idx_invoice_items_cost_code ON public.invoice_items USING btree (cost_code_id);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items USING btree (invoice_id);

CREATE INDEX idx_invoice_items_sov ON public.invoice_items USING btree (sov_item_id);

CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments USING btree (invoice_id);

CREATE INDEX idx_invoices_payment_schedule ON public.invoices USING btree (payment_schedule_id);

CREATE INDEX idx_invoices_payment_schedule_item ON public.invoices USING btree (payment_schedule_item_id);

CREATE INDEX idx_invoices_project ON public.invoices USING btree (project_id);

CREATE INDEX idx_invoices_proposal ON public.invoices USING btree (proposal_id);

CREATE INDEX idx_invoices_source ON public.invoices USING btree (source_type, source_id);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_labor_pay_run_items_pay_run ON public.labor_pay_run_items USING btree (pay_run_id);

CREATE INDEX idx_labor_pay_run_items_time_log ON public.labor_pay_run_items USING btree (time_log_id);

CREATE INDEX idx_labor_pay_run_items_worker ON public.labor_pay_run_items USING btree (worker_id);

CREATE INDEX idx_labor_pay_runs_status ON public.labor_pay_runs USING btree (status);

CREATE INDEX idx_material_receipts_cost_code ON public.material_receipts USING btree (cost_code_id);

CREATE INDEX idx_material_receipts_date ON public.material_receipts USING btree (receipt_date);

CREATE INDEX idx_material_receipts_project ON public.material_receipts USING btree (project_id);

CREATE INDEX idx_material_receipts_vendor ON public.material_receipts USING btree (vendor_id);

CREATE INDEX idx_material_vendors_trade ON public.material_vendors USING btree (trade_id);

CREATE INDEX idx_payment_schedule_items_schedule ON public.payment_schedule_items USING btree (payment_schedule_id);

CREATE INDEX idx_payment_schedules_project ON public.payment_schedules USING btree (project_id);

CREATE INDEX idx_payments_company ON public.payments USING btree (company_id);

CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);

CREATE INDEX idx_pdf_render_jobs_status_priority ON public.pdf_render_jobs USING btree (status, priority, created_at);

CREATE INDEX idx_project_budget_lines_budget ON public.project_budget_lines USING btree (project_budget_id);

CREATE INDEX idx_project_budget_lines_category ON public.project_budget_lines USING btree (category);

CREATE INDEX idx_project_budget_lines_cost_code ON public.project_budget_lines USING btree (cost_code_id);

CREATE INDEX idx_project_budget_lines_project ON public.project_budget_lines USING btree (project_id);

CREATE INDEX idx_project_budgets_project ON public.project_budgets USING btree (project_id);

CREATE INDEX idx_project_todos_assignee ON public.project_todos USING btree (assignee_id);

CREATE INDEX idx_project_todos_completed_at ON public.project_todos USING btree (completed_at);

CREATE INDEX idx_project_todos_due_date ON public.project_todos USING btree (due_date);

CREATE INDEX idx_project_todos_project ON public.project_todos USING btree (project_id);

CREATE INDEX idx_project_todos_project_due_date ON public.project_todos USING btree (project_id, due_date);

CREATE INDEX idx_project_todos_project_status ON public.project_todos USING btree (project_id, status);

CREATE INDEX idx_projects_company ON public.projects USING btree (company_id);

CREATE INDEX idx_projects_status ON public.projects USING btree (status);

CREATE INDEX idx_proposal_events_proposal ON public.proposal_events USING btree (proposal_id);

CREATE INDEX idx_proposal_events_type ON public.proposal_events USING btree (event_type);

CREATE INDEX idx_proposal_sections_proposal ON public.proposal_sections USING btree (proposal_id);

CREATE INDEX idx_proposals_project ON public.proposals USING btree (project_id);

CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);

CREATE INDEX idx_ps_alloc_item ON public.payment_schedule_allocations USING btree (payment_schedule_item_id);

CREATE INDEX idx_ps_alloc_sov ON public.payment_schedule_allocations USING btree (sov_item_id);

CREATE INDEX idx_scope_block_cost_items_cost_code ON public.scope_block_cost_items USING btree (cost_code_id);

CREATE INDEX idx_sov_items_cost_code ON public.sov_items USING btree (cost_code_id);

CREATE INDEX idx_sov_items_project ON public.sov_items USING btree (project_id);

CREATE INDEX idx_sov_items_proposal ON public.sov_items USING btree (proposal_id);

CREATE INDEX idx_sub_contracts_project ON public.sub_contracts USING btree (project_id);

CREATE INDEX idx_sub_contracts_sub ON public.sub_contracts USING btree (sub_id);

CREATE INDEX idx_sub_invoices_contract ON public.sub_invoices USING btree (contract_id);

CREATE INDEX idx_sub_invoices_project ON public.sub_invoices USING btree (project_id);

CREATE INDEX idx_sub_invoices_sub ON public.sub_invoices USING btree (sub_id);

CREATE INDEX idx_sub_logs_project ON public.sub_logs USING btree (project_id);

CREATE INDEX idx_sub_logs_sub ON public.sub_logs USING btree (sub_id);

CREATE INDEX idx_sub_payments_contract ON public.sub_payments USING btree (project_subcontract_id);

CREATE INDEX idx_sub_payments_invoice ON public.sub_payments USING btree (sub_invoice_id);

CREATE INDEX idx_sub_scheduled_shifts_work_order_id ON public.sub_scheduled_shifts USING btree (work_order_id);

CREATE INDEX idx_subs_status ON public.subs USING btree (status);

CREATE INDEX idx_subs_trade ON public.subs USING btree (trade_id);

CREATE INDEX idx_time_log_allocations_day_card ON public.time_log_allocations USING btree (day_card_id);

CREATE INDEX idx_time_log_allocations_project ON public.time_log_allocations USING btree (project_id);

CREATE INDEX idx_time_logs_payment_status ON public.time_logs USING btree (payment_status);

CREATE INDEX idx_time_logs_project_worker ON public.time_logs USING btree (project_id, worker_id);

CREATE INDEX idx_work_orders_project_id ON public.work_orders USING btree (project_id);

CREATE INDEX idx_work_orders_status ON public.work_orders USING btree (status);

CREATE INDEX idx_work_orders_sub_company_id ON public.work_orders USING btree (sub_company_id);

CREATE INDEX idx_work_schedules_date ON public.work_schedules USING btree (scheduled_date);

CREATE INDEX idx_work_schedules_project ON public.work_schedules USING btree (project_id);

CREATE INDEX idx_work_schedules_project_date ON public.work_schedules USING btree (project_id, scheduled_date);

CREATE INDEX idx_work_schedules_status ON public.work_schedules USING btree (status);

CREATE INDEX idx_work_schedules_work_order_id ON public.work_schedules USING btree (work_order_id);

CREATE INDEX idx_work_schedules_worker ON public.work_schedules USING btree (worker_id);

CREATE INDEX idx_workers_id ON public.workers USING btree (id);

CREATE INDEX idx_workers_status ON public.workers USING btree (status);

CREATE INDEX idx_workers_trade ON public.workers USING btree (trade_id);

CREATE UNIQUE INDEX invoice_payments_pkey ON public.invoice_payments USING btree (id);

CREATE UNIQUE INDEX labor_pay_run_items_time_log_id_key ON public.labor_pay_run_items USING btree (time_log_id);

CREATE UNIQUE INDEX measurement_units_code_key ON public.measurement_units USING btree (code);

CREATE UNIQUE INDEX payment_schedule_allocations_payment_schedule_item_id_sov_i_key ON public.payment_schedule_allocations USING btree (payment_schedule_item_id, sov_item_id);

CREATE UNIQUE INDEX payment_schedule_allocations_pkey ON public.payment_schedule_allocations USING btree (id);

CREATE UNIQUE INDEX payment_schedule_items_pkey ON public.payment_schedule_items USING btree (id);

CREATE UNIQUE INDEX payment_schedules_pkey ON public.payment_schedules USING btree (id);

CREATE INDEX pdf_render_jobs_doc_idx ON public.pdf_render_jobs USING btree (generated_document_id);

CREATE UNIQUE INDEX pdf_render_jobs_pkey ON public.pdf_render_jobs USING btree (id);

CREATE INDEX pdf_render_jobs_status_idx ON public.pdf_render_jobs USING btree (status);

CREATE UNIQUE INDEX project_budgets_project_id_key ON public.project_budgets USING btree (project_id);

CREATE UNIQUE INDEX proposal_estimate_settings_proposal_id_key ON public.proposal_estimate_settings USING btree (proposal_id);

CREATE UNIQUE INDEX proposals_public_token_key ON public.proposals USING btree (public_token);

CREATE UNIQUE INDEX sov_items_pkey ON public.sov_items USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX vendor_payment_items_payment_id_cost_id_key ON public.vendor_payment_items USING btree (payment_id, cost_id);

CREATE UNIQUE INDEX work_orders_pkey ON public.work_orders USING btree (id);

CREATE INDEX idx_labor_pay_runs_created_at ON public.labor_pay_runs USING btree (created_at DESC);

CREATE INDEX idx_project_checklist_items_checklist ON public.project_checklist_items USING btree (checklist_id);

CREATE INDEX idx_sub_scheduled_shifts_project ON public.sub_scheduled_shifts USING btree (project_id);

CREATE INDEX idx_sub_scheduled_shifts_sub ON public.sub_scheduled_shifts USING btree (sub_id);

CREATE INDEX idx_time_logs_source_schedule ON public.time_logs USING btree (source_schedule_id);

CREATE INDEX idx_time_logs_unpaid_company ON public.time_logs USING btree (company_id) WHERE (payment_status = 'unpaid'::text);

CREATE INDEX idx_work_schedules_worker_status ON public.work_schedules USING btree (worker_id, status);

alter table "public"."change_order_items" add constraint "change_order_items_pkey" PRIMARY KEY using index "change_order_items_pkey";

alter table "public"."change_orders" add constraint "change_orders_pkey" PRIMARY KEY using index "change_orders_pkey";

alter table "public"."generated_documents" add constraint "generated_documents_pkey" PRIMARY KEY using index "generated_documents_pkey";

alter table "public"."invoice_payments" add constraint "invoice_payments_pkey" PRIMARY KEY using index "invoice_payments_pkey";

alter table "public"."payment_schedule_allocations" add constraint "payment_schedule_allocations_pkey" PRIMARY KEY using index "payment_schedule_allocations_pkey";

alter table "public"."payment_schedule_items" add constraint "payment_schedule_items_pkey" PRIMARY KEY using index "payment_schedule_items_pkey";

alter table "public"."payment_schedules" add constraint "payment_schedules_pkey" PRIMARY KEY using index "payment_schedules_pkey";

alter table "public"."pdf_render_jobs" add constraint "pdf_render_jobs_pkey" PRIMARY KEY using index "pdf_render_jobs_pkey";

alter table "public"."sov_items" add constraint "sov_items_pkey" PRIMARY KEY using index "sov_items_pkey";

alter table "public"."work_orders" add constraint "work_orders_pkey" PRIMARY KEY using index "work_orders_pkey";

alter table "public"."bid_invitations" add constraint "bid_invitations_bid_package_id_fkey" FOREIGN KEY (bid_package_id) REFERENCES public.bid_packages(id) not valid;

alter table "public"."bid_invitations" validate constraint "bid_invitations_bid_package_id_fkey";

alter table "public"."bid_invitations" add constraint "bid_invitations_bid_package_id_sub_id_key" UNIQUE using index "bid_invitations_bid_package_id_sub_id_key";

alter table "public"."bid_invitations" add constraint "bid_invitations_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."bid_invitations" validate constraint "bid_invitations_sub_id_fkey";

alter table "public"."bid_packages" add constraint "bid_packages_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."bid_packages" validate constraint "bid_packages_project_id_fkey";

alter table "public"."budget_revisions" add constraint "budget_revisions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."budget_revisions" validate constraint "budget_revisions_project_id_fkey";

alter table "public"."change_order_items" add constraint "change_order_items_change_order_id_fkey" FOREIGN KEY (change_order_id) REFERENCES public.change_orders(id) ON DELETE CASCADE not valid;

alter table "public"."change_order_items" validate constraint "change_order_items_change_order_id_fkey";

alter table "public"."change_order_items" add constraint "change_order_items_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."change_order_items" validate constraint "change_order_items_cost_code_id_fkey";

alter table "public"."change_orders" add constraint "change_orders_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."change_orders" validate constraint "change_orders_project_id_fkey";

alter table "public"."companies" add constraint "companies_name_key" UNIQUE using index "companies_name_key";

alter table "public"."cost_codes" add constraint "cost_codes_code_key" UNIQUE using index "cost_codes_code_key";

alter table "public"."cost_codes" add constraint "cost_codes_default_trade_id_fkey" FOREIGN KEY (default_trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."cost_codes" validate constraint "cost_codes_default_trade_id_fkey";

alter table "public"."cost_codes" add constraint "cost_codes_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."cost_codes" validate constraint "cost_codes_trade_id_fkey";

alter table "public"."cost_entries" add constraint "cost_entries_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."cost_entries" validate constraint "cost_entries_cost_code_id_fkey";

alter table "public"."cost_entries" add constraint "cost_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."cost_entries" validate constraint "cost_entries_project_id_fkey";

alter table "public"."costs" add constraint "costs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."costs" validate constraint "costs_company_id_fkey";

alter table "public"."costs" add constraint "costs_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.vendor_payments(id) not valid;

alter table "public"."costs" validate constraint "costs_payment_id_fkey";

alter table "public"."costs" add constraint "costs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."costs" validate constraint "costs_project_id_fkey";

alter table "public"."costs" add constraint "costs_status_check" CHECK ((status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'paid'::text, 'void'::text, 'disputed'::text]))) not valid;

alter table "public"."costs" validate constraint "costs_status_check";

alter table "public"."costs" add constraint "costs_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE SET NULL not valid;

alter table "public"."costs" validate constraint "costs_sub_id_fkey";

alter table "public"."costs" add constraint "costs_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL not valid;

alter table "public"."costs" validate constraint "costs_work_order_id_fkey";

alter table "public"."daily_logs" add constraint "daily_logs_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."daily_logs" validate constraint "daily_logs_cost_code_id_fkey";

alter table "public"."daily_logs" add constraint "daily_logs_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) not valid;

alter table "public"."daily_logs" validate constraint "daily_logs_payment_id_fkey";

alter table "public"."daily_logs" add constraint "daily_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."daily_logs" validate constraint "daily_logs_project_id_fkey";

alter table "public"."daily_logs" add constraint "daily_logs_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."daily_logs" validate constraint "daily_logs_trade_id_fkey";

alter table "public"."daily_logs" add constraint "daily_logs_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."daily_logs" validate constraint "daily_logs_worker_id_fkey";

alter table "public"."day_card_jobs" add constraint "day_card_jobs_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."day_card_jobs" validate constraint "day_card_jobs_cost_code_id_fkey";

alter table "public"."day_card_jobs" add constraint "day_card_jobs_day_card_id_fkey" FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE not valid;

alter table "public"."day_card_jobs" validate constraint "day_card_jobs_day_card_id_fkey";

alter table "public"."day_card_jobs" add constraint "day_card_jobs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."day_card_jobs" validate constraint "day_card_jobs_project_id_fkey";

alter table "public"."day_card_jobs" add constraint "day_card_jobs_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."day_card_jobs" validate constraint "day_card_jobs_trade_id_fkey";

alter table "public"."day_cards" add constraint "day_cards_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."day_cards" validate constraint "day_cards_company_id_fkey";

alter table "public"."day_cards" add constraint "day_cards_worker_id_date_key" UNIQUE using index "day_cards_worker_id_date_key";

alter table "public"."day_cards" add constraint "day_cards_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."day_cards" validate constraint "day_cards_worker_id_fkey";

alter table "public"."document_tags" add constraint "document_tags_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_tags" validate constraint "document_tags_document_id_fkey";

alter table "public"."documents" add constraint "documents_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."documents" validate constraint "documents_cost_code_id_fkey";

alter table "public"."documents" add constraint "documents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."documents" validate constraint "documents_project_id_fkey";

alter table "public"."documents" add constraint "documents_related_cost_id_fkey" FOREIGN KEY (related_cost_id) REFERENCES public.costs(id) not valid;

alter table "public"."documents" validate constraint "documents_related_cost_id_fkey";

alter table "public"."documents" add constraint "documents_related_invoice_id_fkey" FOREIGN KEY (related_invoice_id) REFERENCES public.invoices(id) not valid;

alter table "public"."documents" validate constraint "documents_related_invoice_id_fkey";

alter table "public"."estimate_items" add constraint "estimate_items_estimate_id_fkey" FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE not valid;

alter table "public"."estimate_items" validate constraint "estimate_items_estimate_id_fkey";

alter table "public"."estimate_items" add constraint "estimate_items_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."estimate_items" validate constraint "estimate_items_trade_id_fkey";

alter table "public"."generated_documents" add constraint "generated_documents_doc_type_check" CHECK ((doc_type = ANY (ARRAY['invoice'::text, 'proposal'::text, 'change_order'::text]))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_doc_type_check";

alter table "public"."generated_documents" add constraint "generated_documents_renderer_check" CHECK ((renderer = ANY (ARRAY['html2pdf'::text, 'playwright'::text, 'external'::text, 'gotenberg'::text]))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_renderer_check";

alter table "public"."generated_documents" add constraint "generated_documents_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'rendering'::text, 'final'::text, 'failed'::text, 'queued'::text]))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_status_check";

alter table "public"."invoice_items" add constraint "invoice_items_sov_item_id_fkey" FOREIGN KEY (sov_item_id) REFERENCES public.sov_items(id) ON DELETE SET NULL not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_sov_item_id_fkey";

alter table "public"."invoice_payments" add constraint "invoice_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_payments" validate constraint "invoice_payments_invoice_id_fkey";

alter table "public"."invoices" add constraint "invoices_payment_schedule_id_fkey" FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_payment_schedule_id_fkey";

alter table "public"."invoices" add constraint "invoices_payment_schedule_item_id_fkey" FOREIGN KEY (payment_schedule_item_id) REFERENCES public.payment_schedule_items(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_payment_schedule_item_id_fkey";

alter table "public"."invoices" add constraint "invoices_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_proposal_id_fkey";

alter table "public"."invoices" add constraint "invoices_source_type_check" CHECK ((source_type = ANY (ARRAY['proposal'::text, 'payment_schedule'::text, 'manual'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_source_type_check";

alter table "public"."labor_pay_run_items" add constraint "labor_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.labor_pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."labor_pay_run_items" validate constraint "labor_pay_run_items_pay_run_id_fkey";

alter table "public"."labor_pay_run_items" add constraint "labor_pay_run_items_time_log_id_fkey" FOREIGN KEY (time_log_id) REFERENCES public.time_logs(id) not valid;

alter table "public"."labor_pay_run_items" validate constraint "labor_pay_run_items_time_log_id_fkey";

alter table "public"."labor_pay_run_items" add constraint "labor_pay_run_items_time_log_id_key" UNIQUE using index "labor_pay_run_items_time_log_id_key";

alter table "public"."labor_pay_run_items" add constraint "labor_pay_run_items_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."labor_pay_run_items" validate constraint "labor_pay_run_items_worker_id_fkey";

alter table "public"."labor_pay_runs" add constraint "labor_pay_runs_payee_company_id_fkey" FOREIGN KEY (payee_company_id) REFERENCES public.companies(id) not valid;

alter table "public"."labor_pay_runs" validate constraint "labor_pay_runs_payee_company_id_fkey";

alter table "public"."labor_pay_runs" add constraint "labor_pay_runs_payer_company_id_fkey" FOREIGN KEY (payer_company_id) REFERENCES public.companies(id) not valid;

alter table "public"."labor_pay_runs" validate constraint "labor_pay_runs_payer_company_id_fkey";

alter table "public"."material_receipts" add constraint "material_receipts_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."material_receipts" validate constraint "material_receipts_cost_code_id_fkey";

alter table "public"."material_receipts" add constraint "material_receipts_linked_cost_id_fkey" FOREIGN KEY (linked_cost_id) REFERENCES public.costs(id) not valid;

alter table "public"."material_receipts" validate constraint "material_receipts_linked_cost_id_fkey";

alter table "public"."material_receipts" add constraint "material_receipts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."material_receipts" validate constraint "material_receipts_project_id_fkey";

alter table "public"."material_vendors" add constraint "material_vendors_default_cost_code_id_fkey" FOREIGN KEY (default_cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."material_vendors" validate constraint "material_vendors_default_cost_code_id_fkey";

alter table "public"."material_vendors" add constraint "material_vendors_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."material_vendors" validate constraint "material_vendors_trade_id_fkey";

alter table "public"."measurement_units" add constraint "measurement_units_code_key" UNIQUE using index "measurement_units_code_key";

alter table "public"."payment_schedule_allocations" add constraint "payment_schedule_allocations_payment_schedule_item_id_fkey" FOREIGN KEY (payment_schedule_item_id) REFERENCES public.payment_schedule_items(id) ON DELETE CASCADE not valid;

alter table "public"."payment_schedule_allocations" validate constraint "payment_schedule_allocations_payment_schedule_item_id_fkey";

alter table "public"."payment_schedule_allocations" add constraint "payment_schedule_allocations_payment_schedule_item_id_sov_i_key" UNIQUE using index "payment_schedule_allocations_payment_schedule_item_id_sov_i_key";

alter table "public"."payment_schedule_allocations" add constraint "payment_schedule_allocations_sov_item_id_fkey" FOREIGN KEY (sov_item_id) REFERENCES public.sov_items(id) ON DELETE CASCADE not valid;

alter table "public"."payment_schedule_allocations" validate constraint "payment_schedule_allocations_sov_item_id_fkey";

alter table "public"."payment_schedule_items" add constraint "payment_schedule_items_payment_schedule_id_fkey" FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON DELETE CASCADE not valid;

alter table "public"."payment_schedule_items" validate constraint "payment_schedule_items_payment_schedule_id_fkey";

alter table "public"."payment_schedules" add constraint "payment_schedules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."payment_schedules" validate constraint "payment_schedules_project_id_fkey";

alter table "public"."payment_schedules" add constraint "payment_schedules_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL not valid;

alter table "public"."payment_schedules" validate constraint "payment_schedules_proposal_id_fkey";

alter table "public"."payments" add constraint "payments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."payments" validate constraint "payments_company_id_fkey";

alter table "public"."pdf_render_jobs" add constraint "pdf_render_jobs_generated_document_id_fkey" FOREIGN KEY (generated_document_id) REFERENCES public.generated_documents(id) ON DELETE CASCADE not valid;

alter table "public"."pdf_render_jobs" validate constraint "pdf_render_jobs_generated_document_id_fkey";

alter table "public"."pdf_render_jobs" add constraint "pdf_render_jobs_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."pdf_render_jobs" validate constraint "pdf_render_jobs_status_check";

alter table "public"."project_budget_lines" add constraint "project_budget_lines_source_estimate_id_fkey" FOREIGN KEY (source_estimate_id) REFERENCES public.estimates(id) not valid;

alter table "public"."project_budget_lines" validate constraint "project_budget_lines_source_estimate_id_fkey";

alter table "public"."project_budgets" add constraint "project_budgets_baseline_estimate_id_fkey" FOREIGN KEY (baseline_estimate_id) REFERENCES public.estimates(id) not valid;

alter table "public"."project_budgets" validate constraint "project_budgets_baseline_estimate_id_fkey";

alter table "public"."project_budgets" add constraint "project_budgets_project_id_key" UNIQUE using index "project_budgets_project_id_key";

alter table "public"."project_checklist_items" add constraint "project_checklist_items_checklist_id_fkey" FOREIGN KEY (checklist_id) REFERENCES public.project_checklists(id) ON DELETE CASCADE not valid;

alter table "public"."project_checklist_items" validate constraint "project_checklist_items_checklist_id_fkey";

alter table "public"."project_subcontracts" add constraint "project_subcontracts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_subcontracts" validate constraint "project_subcontracts_project_id_fkey";

alter table "public"."project_subcontracts" add constraint "project_subcontracts_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."project_subcontracts" validate constraint "project_subcontracts_sub_id_fkey";

alter table "public"."project_todos" add constraint "project_todos_assigned_worker_id_fkey" FOREIGN KEY (assigned_worker_id) REFERENCES public.workers(id) ON DELETE SET NULL not valid;

alter table "public"."project_todos" validate constraint "project_todos_assigned_worker_id_fkey";

alter table "public"."project_todos" add constraint "project_todos_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."project_todos" validate constraint "project_todos_cost_code_id_fkey";

alter table "public"."project_todos" add constraint "project_todos_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_todos" validate constraint "project_todos_project_id_fkey";

alter table "public"."projects" add constraint "projects_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."projects" validate constraint "projects_company_id_fkey";

alter table "public"."proposal_estimate_settings" add constraint "proposal_estimate_settings_estimate_id_fkey" FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) not valid;

alter table "public"."proposal_estimate_settings" validate constraint "proposal_estimate_settings_estimate_id_fkey";

alter table "public"."proposal_estimate_settings" add constraint "proposal_estimate_settings_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_estimate_settings" validate constraint "proposal_estimate_settings_proposal_id_fkey";

alter table "public"."proposal_estimate_settings" add constraint "proposal_estimate_settings_proposal_id_key" UNIQUE using index "proposal_estimate_settings_proposal_id_key";

alter table "public"."proposal_events" add constraint "proposal_events_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_events" validate constraint "proposal_events_proposal_id_fkey";

alter table "public"."proposal_line_groups" add constraint "proposal_line_groups_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_line_groups" validate constraint "proposal_line_groups_proposal_id_fkey";

alter table "public"."proposal_line_overrides" add constraint "proposal_line_overrides_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_line_overrides" validate constraint "proposal_line_overrides_proposal_id_fkey";

alter table "public"."proposal_section_items" add constraint "proposal_section_items_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.proposal_sections(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_section_items" validate constraint "proposal_section_items_section_id_fkey";

alter table "public"."proposal_sections" add constraint "proposal_sections_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE not valid;

alter table "public"."proposal_sections" validate constraint "proposal_sections_proposal_id_fkey";

alter table "public"."proposals" add constraint "proposals_primary_estimate_id_fkey" FOREIGN KEY (primary_estimate_id) REFERENCES public.estimates(id) not valid;

alter table "public"."proposals" validate constraint "proposals_primary_estimate_id_fkey";

alter table "public"."proposals" add constraint "proposals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."proposals" validate constraint "proposals_project_id_fkey";

alter table "public"."proposals" add constraint "proposals_proposal_kind_check" CHECK ((proposal_kind = ANY (ARRAY['proposal'::text, 'change_order'::text]))) not valid;

alter table "public"."proposals" validate constraint "proposals_proposal_kind_check";

alter table "public"."proposals" add constraint "proposals_public_token_key" UNIQUE using index "proposals_public_token_key";

alter table "public"."schedule_of_values" add constraint "schedule_of_values_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."schedule_of_values" validate constraint "schedule_of_values_cost_code_id_fkey";

alter table "public"."schedule_of_values" add constraint "schedule_of_values_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."schedule_of_values" validate constraint "schedule_of_values_project_id_fkey";

alter table "public"."scheduled_shifts" add constraint "scheduled_shifts_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."scheduled_shifts" validate constraint "scheduled_shifts_cost_code_id_fkey";

alter table "public"."scheduled_shifts" add constraint "scheduled_shifts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."scheduled_shifts" validate constraint "scheduled_shifts_project_id_fkey";

alter table "public"."scheduled_shifts" add constraint "scheduled_shifts_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."scheduled_shifts" validate constraint "scheduled_shifts_trade_id_fkey";

alter table "public"."scheduled_shifts" add constraint "scheduled_shifts_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."scheduled_shifts" validate constraint "scheduled_shifts_worker_id_fkey";

alter table "public"."scope_block_cost_items" add constraint "scope_block_cost_items_scope_block_id_fkey" FOREIGN KEY (scope_block_id) REFERENCES public.scope_blocks(id) ON DELETE CASCADE not valid;

alter table "public"."scope_block_cost_items" validate constraint "scope_block_cost_items_scope_block_id_fkey";

alter table "public"."sov_items" add constraint "sov_items_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL not valid;

alter table "public"."sov_items" validate constraint "sov_items_cost_code_id_fkey";

alter table "public"."sov_items" add constraint "sov_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."sov_items" validate constraint "sov_items_project_id_fkey";

alter table "public"."sov_items" add constraint "sov_items_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL not valid;

alter table "public"."sov_items" validate constraint "sov_items_proposal_id_fkey";

alter table "public"."sub_bids" add constraint "sub_bids_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_bids" validate constraint "sub_bids_sub_id_fkey";

alter table "public"."sub_compliance_documents" add constraint "sub_compliance_documents_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_compliance_documents" validate constraint "sub_compliance_documents_sub_id_fkey";

alter table "public"."sub_contracts" add constraint "sub_contracts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."sub_contracts" validate constraint "sub_contracts_project_id_fkey";

alter table "public"."sub_contracts" add constraint "sub_contracts_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_contracts" validate constraint "sub_contracts_sub_id_fkey";

alter table "public"."sub_invoices" add constraint "sub_invoices_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.sub_contracts(id) not valid;

alter table "public"."sub_invoices" validate constraint "sub_invoices_contract_id_fkey";

alter table "public"."sub_invoices" add constraint "sub_invoices_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."sub_invoices" validate constraint "sub_invoices_project_id_fkey";

alter table "public"."sub_invoices" add constraint "sub_invoices_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_invoices" validate constraint "sub_invoices_sub_id_fkey";

alter table "public"."sub_logs" add constraint "sub_logs_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."sub_logs" validate constraint "sub_logs_cost_code_id_fkey";

alter table "public"."sub_logs" add constraint "sub_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."sub_logs" validate constraint "sub_logs_project_id_fkey";

alter table "public"."sub_logs" add constraint "sub_logs_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_logs" validate constraint "sub_logs_sub_id_fkey";

alter table "public"."sub_payments" add constraint "sub_payments_project_subcontract_id_fkey" FOREIGN KEY (project_subcontract_id) REFERENCES public.sub_contracts(id) not valid;

alter table "public"."sub_payments" validate constraint "sub_payments_project_subcontract_id_fkey";

alter table "public"."sub_payments" add constraint "sub_payments_sub_invoice_id_fkey" FOREIGN KEY (sub_invoice_id) REFERENCES public.sub_invoices(id) not valid;

alter table "public"."sub_payments" validate constraint "sub_payments_sub_invoice_id_fkey";

alter table "public"."sub_scheduled_shifts" add constraint "sub_scheduled_shifts_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."sub_scheduled_shifts" validate constraint "sub_scheduled_shifts_cost_code_id_fkey";

alter table "public"."sub_scheduled_shifts" add constraint "sub_scheduled_shifts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."sub_scheduled_shifts" validate constraint "sub_scheduled_shifts_project_id_fkey";

alter table "public"."sub_scheduled_shifts" add constraint "sub_scheduled_shifts_sub_id_fkey" FOREIGN KEY (sub_id) REFERENCES public.subs(id) not valid;

alter table "public"."sub_scheduled_shifts" validate constraint "sub_scheduled_shifts_sub_id_fkey";

alter table "public"."sub_scheduled_shifts" add constraint "sub_scheduled_shifts_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL not valid;

alter table "public"."sub_scheduled_shifts" validate constraint "sub_scheduled_shifts_work_order_id_fkey";

alter table "public"."subs" add constraint "subs_default_cost_code_id_fkey" FOREIGN KEY (default_cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."subs" validate constraint "subs_default_cost_code_id_fkey";

alter table "public"."subs" add constraint "subs_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."subs" validate constraint "subs_trade_id_fkey";

alter table "public"."time_log_allocations" add constraint "time_log_allocations_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."time_log_allocations" validate constraint "time_log_allocations_cost_code_id_fkey";

alter table "public"."time_log_allocations" add constraint "time_log_allocations_day_card_id_fkey" FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE not valid;

alter table "public"."time_log_allocations" validate constraint "time_log_allocations_day_card_id_fkey";

alter table "public"."time_log_allocations" add constraint "time_log_allocations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."time_log_allocations" validate constraint "time_log_allocations_project_id_fkey";

alter table "public"."time_log_allocations" add constraint "time_log_allocations_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."time_log_allocations" validate constraint "time_log_allocations_trade_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_company_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_source_schedule_id_fkey" FOREIGN KEY (source_schedule_id) REFERENCES public.work_schedules(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_source_schedule_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_trade_id_fkey";

alter table "public"."trades" add constraint "trades_default_equipment_cost_code_id_fkey" FOREIGN KEY (default_equipment_cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL not valid;

alter table "public"."trades" validate constraint "trades_default_equipment_cost_code_id_fkey";

alter table "public"."trades" add constraint "trades_default_labor_cost_code_id_fkey" FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."trades" validate constraint "trades_default_labor_cost_code_id_fkey";

alter table "public"."trades" add constraint "trades_default_material_cost_code_id_fkey" FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."trades" validate constraint "trades_default_material_cost_code_id_fkey";

alter table "public"."trades" add constraint "trades_default_sub_cost_code_id_fkey" FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."trades" validate constraint "trades_default_sub_cost_code_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."vendor_payment_items" add constraint "vendor_payment_items_applied_amount_check" CHECK ((applied_amount > (0)::numeric)) not valid;

alter table "public"."vendor_payment_items" validate constraint "vendor_payment_items_applied_amount_check";

alter table "public"."vendor_payment_items" add constraint "vendor_payment_items_payment_id_cost_id_key" UNIQUE using index "vendor_payment_items_payment_id_cost_id_key";

alter table "public"."work_orders" add constraint "work_orders_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."work_orders" validate constraint "work_orders_project_id_fkey";

alter table "public"."work_orders" add constraint "work_orders_sub_company_id_fkey" FOREIGN KEY (sub_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."work_orders" validate constraint "work_orders_sub_company_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_company_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_cost_code_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_project_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_trade_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_work_order_id_fkey";

alter table "public"."work_schedules" add constraint "work_schedules_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."work_schedules" validate constraint "work_schedules_worker_id_fkey";

alter table "public"."checklist_question_answers" add constraint "checklist_question_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.checklist_questions(id) not valid;

alter table "public"."checklist_question_answers" validate constraint "checklist_question_answers_question_id_fkey";

alter table "public"."costs" add constraint "costs_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."costs" validate constraint "costs_cost_code_id_fkey";

alter table "public"."customer_payments" add constraint "customer_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) not valid;

alter table "public"."customer_payments" validate constraint "customer_payments_invoice_id_fkey";

alter table "public"."customer_payments" add constraint "customer_payments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."customer_payments" validate constraint "customer_payments_project_id_fkey";

alter table "public"."estimate_items" add constraint "estimate_items_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."estimate_items" validate constraint "estimate_items_cost_code_id_fkey";

alter table "public"."estimates" add constraint "estimates_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."estimates" validate constraint "estimates_project_id_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_cost_code_id_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_invoice_id_fkey";

alter table "public"."invoices" add constraint "invoices_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."invoices" validate constraint "invoices_project_id_fkey";

alter table "public"."material_receipts" add constraint "material_receipts_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.material_vendors(id) not valid;

alter table "public"."material_receipts" validate constraint "material_receipts_vendor_id_fkey";

alter table "public"."project_budget_lines" add constraint "project_budget_lines_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."project_budget_lines" validate constraint "project_budget_lines_cost_code_id_fkey";

alter table "public"."project_budget_lines" add constraint "project_budget_lines_project_budget_id_fkey" FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) not valid;

alter table "public"."project_budget_lines" validate constraint "project_budget_lines_project_budget_id_fkey";

alter table "public"."project_budget_lines" add constraint "project_budget_lines_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_budget_lines" validate constraint "project_budget_lines_project_id_fkey";

alter table "public"."project_budgets" add constraint "project_budgets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_budgets" validate constraint "project_budgets_project_id_fkey";

alter table "public"."project_checklists" add constraint "project_checklists_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_checklists" validate constraint "project_checklists_project_id_fkey";

alter table "public"."project_financials_snapshot" add constraint "project_financials_snapshot_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_financials_snapshot" validate constraint "project_financials_snapshot_project_id_fkey";

alter table "public"."scope_block_cost_items" add constraint "scope_block_cost_items_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."scope_block_cost_items" validate constraint "scope_block_cost_items_cost_code_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_cost_code_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_project_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.workers(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_worker_id_fkey";

alter table "public"."vendor_payment_items" add constraint "vendor_payment_items_cost_id_fkey" FOREIGN KEY (cost_id) REFERENCES public.costs(id) not valid;

alter table "public"."vendor_payment_items" validate constraint "vendor_payment_items_cost_id_fkey";

alter table "public"."workers" add constraint "workers_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES public.trades(id) not valid;

alter table "public"."workers" validate constraint "workers_trade_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auto_assign_sub_cost_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  IF NEW.cost_code_id IS NULL THEN
    SELECT trade_id INTO v_trade_id
    FROM subs
    WHERE id = NEW.sub_id;
    
    IF v_trade_id IS NOT NULL THEN
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id
      FROM trades
      WHERE id = v_trade_id;
      
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_invoice_payments_total(invoice_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_payments NUMERIC := 0;
  old_payments NUMERIC := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoice_payments') THEN
    SELECT COALESCE(SUM(amount), 0) INTO new_payments
    FROM public.invoice_payments
    WHERE invoice_id = invoice_uuid;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customer_payments') THEN
    SELECT COALESCE(SUM(amount), 0) INTO old_payments
    FROM public.customer_payments
    WHERE invoice_id = invoice_uuid;
  END IF;

  RETURN new_payments + old_payments;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(p_worker_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_job public.pdf_render_jobs; v_doc public.generated_documents;
BEGIN
  SELECT * INTO v_job FROM public.pdf_render_jobs WHERE status = 'queued' ORDER BY priority ASC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  UPDATE public.pdf_render_jobs SET status = 'running', attempt_count = attempt_count + 1, worker_id = p_worker_id, started_at = NOW() WHERE id = v_job.id;
  UPDATE public.generated_documents SET status = 'rendering' WHERE id = v_job.generated_document_id;
  SELECT * INTO v_doc FROM public.generated_documents WHERE id = v_job.generated_document_id;
  RETURN jsonb_build_object('found', true, 'job_id', v_job.id, 'document_id', v_doc.id, 'doc_type', v_doc.doc_type, 'entity_id', v_doc.entity_id, 'version', v_doc.version, 'snapshot', v_doc.snapshot, 'template_key', v_doc.template_key, 'renderer', v_doc.renderer, 'project_id', v_doc.project_id, 'company_id', v_doc.company_id, 'attempt_count', v_job.attempt_count + 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_pdf_job(p_job_id uuid, p_document_id uuid, p_storage_bucket text, p_storage_path text, p_file_size_bytes bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.pdf_render_jobs SET status = 'succeeded', finished_at = NOW() WHERE id = p_job_id;
  UPDATE public.generated_documents SET status = 'final', storage_bucket = p_storage_bucket, storage_path = p_storage_path, file_size_bytes = p_file_size_bytes, finalized_at = NOW() WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_archived_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fail_pdf_job(p_job_id uuid, p_document_id uuid, p_error_message text, p_error_details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.pdf_render_jobs SET status = 'failed', error_message = p_error_message, error_details = p_error_details, finished_at = NOW() WHERE id = p_job_id;
  UPDATE public.generated_documents SET status = 'failed' WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_change_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  pfx text;
  n int;
BEGIN
  IF NEW.change_order_number IS NULL OR NEW.change_order_number = '' THEN
    SELECT COALESCE(
      UPPER(LEFT(REGEXP_REPLACE(project_name, '[^A-Za-z0-9]', '', 'g'), 4)),
      'CO'
    ) INTO pfx
    FROM public.projects
    WHERE id = NEW.project_id;

    n := nextval('public.change_order_number_seq');
    NEW.change_order_number := COALESCE(pfx,'CO') || '-CO-' || LPAD(n::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  project_prefix TEXT;
  next_num BIGINT;
BEGIN
  -- only generate if empty
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    SELECT COALESCE(
      UPPER(LEFT(REGEXP_REPLACE(p.project_name, '[^A-Za-z0-9]', '', 'g'), 4)),
      'INV'
    )
    INTO project_prefix
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    next_num := nextval('public.invoice_number_seq');
    NEW.invoice_number := COALESCE(project_prefix, 'INV') || '-' || LPAD(next_num::TEXT, 5, '0');
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pdf_download_url(p_doc_type text, p_entity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_doc record;
BEGIN
  SELECT id, version, storage_bucket, storage_path
  INTO v_doc
  FROM public.generated_documents
  WHERE doc_type = p_doc_type
    AND entity_id = p_entity_id
    AND status = 'final'
    AND storage_path IS NOT NULL
  ORDER BY version DESC, created_at DESC
  LIMIT 1;

  IF v_doc IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'version', v_doc.version,
    'storage_bucket', COALESCE(v_doc.storage_bucket, 'generated'),
    'storage_path', v_doc.storage_path
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pdf_status(p_doc_type text, p_entity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_doc record;
  v_is_rendering boolean := false;
BEGIN
  SELECT id, version, status, storage_bucket, storage_path, created_at
  INTO v_doc
  FROM public.generated_documents
  WHERE doc_type = p_doc_type
    AND entity_id = p_entity_id
  ORDER BY version DESC, created_at DESC
  LIMIT 1;

  IF v_doc IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'none',
      'has_pdf', false,
      'is_rendering', false,
      'can_view', false
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pdf_render_jobs
    WHERE generated_document_id = v_doc.id
      AND status IN ('queued', 'running')
  )
  INTO v_is_rendering;

  RETURN jsonb_build_object(
    'status', v_doc.status,
    'version', v_doc.version,
    'document_id', v_doc.id,
    'storage_bucket', COALESCE(v_doc.storage_bucket, 'generated'),
    'storage_path', v_doc.storage_path,
    'has_pdf', v_doc.status = 'final' AND v_doc.storage_path IS NOT NULL,
    'is_rendering', v_is_rendering,
    'can_view', v_doc.status = 'final' AND v_doc.storage_path IS NOT NULL
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
 RETURNS TABLE(approved_proposal_total numeric, approved_change_order_total numeric, contract_value numeric, invoiced_total numeric, paid_total numeric, outstanding_invoiced_balance numeric, balance_to_finish numeric, has_base_proposal boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_project_stats(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  result jsonb;
begin
  with

  /* -------------------------------------------
     BUDGET
  --------------------------------------------*/
  b as (
    select 
      coalesce(labor_budget,0) +
      coalesce(subs_budget,0) +
      coalesce(materials_budget,0) +
      coalesce(other_budget,0) as budget_total
    from project_budgets
    where project_id = p_project_id
    limit 1
  ),

  /* -------------------------------------------
     LABOR ACTUALS + UNPAID LABOR
  --------------------------------------------*/
  tl as (
    select
      coalesce(sum(labor_cost),0) as labor_actual,
      coalesce(sum(case when payment_status <> 'paid' then labor_cost else 0 end),0) as unpaid_labor,
      max(date) as last_labor_activity
    from time_logs
    where project_id = p_project_id
  ),

  /* -------------------------------------------
     NON-LABOR COSTS
  --------------------------------------------*/
  c as (
    select
      coalesce(sum(amount),0) as non_labor_actual,
      max(created_at) as last_cost_activity
    from costs
    where project_id = p_project_id
  ),

  /* -------------------------------------------
     INVOICES (TOTAL BILLED)
  --------------------------------------------*/
  inv as (
    select 
      coalesce(sum(total_amount),0) as billed_total,
      max(updated_at) as last_invoice_activity
    from invoices
    where project_id = p_project_id
      and status <> 'void'
  ),

  /* -------------------------------------------
     PAYMENTS (TOTAL PAID)
  --------------------------------------------*/
  pay as (
    select 
      coalesce(sum(amount),0) as payments_total
    from customer_payments
    where project_id = p_project_id
  ),

  /* -------------------------------------------
     TASKS (OPEN + OVERDUE)
  --------------------------------------------*/
  t as (
    select
      count(*) filter (where status in ('open','in_progress')) as open_tasks,
      count(*) filter (
        where status <> 'done'
        and due_date < current_date
      ) as overdue_tasks,
      max(updated_at) as last_task_activity
    from project_todos
    where project_id = p_project_id
  ),

  /* -------------------------------------------
     TODAY'S CREW COUNT
  --------------------------------------------*/
  crew as (
    select 
      count(distinct worker_id) as today_crew
    from work_schedules
    where project_id = p_project_id
      and scheduled_date = current_date
  ),

  /* -------------------------------------------
     COMBINE LAST ACTIVITY
  --------------------------------------------*/
  last_activity as (
    select 
      (
        greatest(
          coalesce((select last_labor_activity from tl)::timestamp, '1970-01-01'),
          coalesce((select last_cost_activity from c)::timestamp, '1970-01-01'),
          coalesce((select last_invoice_activity from inv)::timestamp, '1970-01-01'),
          coalesce((select last_task_activity from t)::timestamp, '1970-01-01')
        )
      ) as activity_date
  )

  /* -------------------------------------------
     FINAL RETURN JSON
  --------------------------------------------*/
  select jsonb_build_object(
    -- Budget
    'budget_total', (select budget_total from b)::numeric,
    -- Actuals
    'actual_total', ((select labor_actual from tl) + (select non_labor_actual from c))::numeric,
    -- Percent complete
    'percent_used', (
      case 
        when (select budget_total from b) > 0 then
          (((select labor_actual from tl) + (select non_labor_actual from c)) / nullif((select budget_total from b),0))::float8
        else null
      end
    ),
    -- Variance
    'variance', (
      (select budget_total from b) -
      ((select labor_actual from tl) + (select non_labor_actual from c))
    )::numeric,

    -- AR/AP
    'billed_total', (select billed_total from inv)::numeric,
    'ar_outstanding', (
      (select billed_total from inv) - (select payments_total from pay)
    )::numeric,
    'unpaid_labor', (select unpaid_labor from tl)::numeric,

    -- Activity
    'today_crew_count', (select today_crew from crew),
    'last_activity_date', (select activity_date::date from last_activity),
    'days_inactive', (
      current_date - (select activity_date::date from last_activity)
    ),

    -- Tasks
    'open_tasks', (select open_tasks from t),
    'overdue_tasks', (select overdue_tasks from t)
  )
  into result;

  return result;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user');
  RETURN NEW;
END;
$function$
;

create or replace view "public"."invoice_payment_totals" as  SELECT i.id AS invoice_id,
    (COALESCE(sum(ip.amount), (0)::numeric) + COALESCE(sum(cp.amount), (0)::numeric)) AS total_paid
   FROM ((public.invoices i
     LEFT JOIN public.invoice_payments ip ON ((ip.invoice_id = i.id)))
     LEFT JOIN public.customer_payments cp ON ((cp.invoice_id = i.id)))
  GROUP BY i.id;


CREATE OR REPLACE FUNCTION public.normalize_line_type(p_category text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_cat text := lower(coalesce(p_category, ''));
begin
  if v_cat like '%lab%' then
    return 'labor';
  elsif v_cat like '%sub%' then
    return 'subs';
  elsif v_cat like '%mat%' then
    return 'materials';
  elsif v_cat like '%equip%' or v_cat like '%equipm%' then
    return 'equipment';
  else
    return 'other';
  end if;
end;
$function$
;

create or replace view "public"."project_billing_summary" as  WITH approved_proposal AS (
         SELECT p.project_id,
            COALESCE(sum(p.total_amount), (0)::numeric) AS approved_proposal_total
           FROM public.proposals p
          WHERE (p.acceptance_status = 'accepted'::text)
          GROUP BY p.project_id
        ), approved_cos AS (
         SELECT co.project_id,
            COALESCE(sum(co.total_amount), (0)::numeric) AS approved_co_total
           FROM public.change_orders co
          WHERE (co.status = 'approved'::text)
          GROUP BY co.project_id
        ), invoiced AS (
         SELECT i.project_id,
            COALESCE(sum(i.total_amount), (0)::numeric) AS total_invoiced
           FROM public.invoices i
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        ), paid AS (
         SELECT i.project_id,
            (COALESCE(sum(ip.amount), (0)::numeric) + COALESCE(sum(cp.amount), (0)::numeric)) AS total_paid
           FROM ((public.invoices i
             LEFT JOIN public.invoice_payments ip ON ((ip.invoice_id = i.id)))
             LEFT JOIN public.customer_payments cp ON ((cp.invoice_id = i.id)))
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        )
 SELECT pr.id AS project_id,
    COALESCE(ap.approved_proposal_total, (0)::numeric) AS approved_proposal_total,
    COALESCE(ac.approved_co_total, (0)::numeric) AS approved_co_total,
    (COALESCE(ap.approved_proposal_total, (0)::numeric) + COALESCE(ac.approved_co_total, (0)::numeric)) AS contract_value,
    COALESCE(iv.total_invoiced, (0)::numeric) AS total_invoiced,
    COALESCE(pd.total_paid, (0)::numeric) AS total_paid,
    (COALESCE(iv.total_invoiced, (0)::numeric) - COALESCE(pd.total_paid, (0)::numeric)) AS outstanding_invoiced,
    ((COALESCE(ap.approved_proposal_total, (0)::numeric) + COALESCE(ac.approved_co_total, (0)::numeric)) - COALESCE(pd.total_paid, (0)::numeric)) AS balance_to_finish
   FROM ((((public.projects pr
     LEFT JOIN approved_proposal ap ON ((ap.project_id = pr.id)))
     LEFT JOIN approved_cos ac ON ((ac.project_id = pr.id)))
     LEFT JOIN invoiced iv ON ((iv.project_id = pr.id)))
     LEFT JOIN paid pd ON ((pd.project_id = pr.id)));


CREATE OR REPLACE FUNCTION public.recalc_change_order_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_change_order_id uuid;
  v_subtotal numeric;
BEGIN
  v_change_order_id := COALESCE(NEW.change_order_id, OLD.change_order_id);

  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM public.change_order_items
  WHERE change_order_id = v_change_order_id;

  UPDATE public.change_orders
  SET subtotal_amount = v_subtotal,
      total_amount = v_subtotal + COALESCE(tax_amount,0)
  WHERE id = v_change_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_subtotal numeric;
  v_tax numeric;
begin
  select coalesce(sum(line_total),0) into v_subtotal
  from invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(tax_amount,0) into v_tax
  from invoices
  where id = p_invoice_id;

  update invoices
  set subtotal_amount = v_subtotal,
      total_amount = v_subtotal + v_tax,
      updated_at = now()
  where id = p_invoice_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.recalc_payment_schedule_item_amount(p_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_schedule_id uuid;
  v_project_id uuid;
  v_contract numeric;
  v_pct numeric;
  v_fixed numeric;
begin
  select payment_schedule_id, percent_of_contract, fixed_amount
  into v_schedule_id, v_pct, v_fixed
  from payment_schedule_items
  where id = p_item_id;

  select project_id into v_project_id
  from payment_schedules
  where id = v_schedule_id;

  -- contract value = sum of active SOV scheduled_value
  select coalesce(sum(scheduled_value),0) into v_contract
  from sov_items
  where project_id = v_project_id and is_archived = false;

  update payment_schedule_items
  set scheduled_amount =
      case
        when v_fixed is not null then v_fixed
        when v_pct is not null then (v_contract * (v_pct / 100.0))
        else 0
      end,
      updated_at = now()
  where id = p_item_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.request_pdf_generation(p_company_id uuid, p_doc_type text, p_entity_id uuid, p_priority integer, p_project_id uuid, p_render_hash text, p_renderer text, p_snapshot jsonb, p_snapshot_hash text, p_template_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing_doc public.generated_documents;
  v_new_doc_id uuid;
  v_new_job_id uuid;
  v_version int;
BEGIN
  SELECT * INTO v_existing_doc FROM public.generated_documents WHERE render_hash = p_render_hash LIMIT 1;

  IF FOUND THEN
    IF v_existing_doc.status = 'final' THEN
      RETURN jsonb_build_object('action', 'existing', 'document_id', v_existing_doc.id, 'status', v_existing_doc.status, 'storage_path', v_existing_doc.storage_path, 'version', v_existing_doc.version);
    END IF;
    IF v_existing_doc.status = 'failed' THEN
      INSERT INTO public.pdf_render_jobs (generated_document_id, status, attempt_count, max_attempts, priority)
      VALUES (v_existing_doc.id, 'queued', 0, 3, COALESCE(p_priority, 100)) RETURNING id INTO v_new_job_id;
      UPDATE public.generated_documents SET status = 'pending' WHERE id = v_existing_doc.id;
      RETURN jsonb_build_object('action', 'retry', 'document_id', v_existing_doc.id, 'job_id', v_new_job_id, 'status', 'pending', 'version', v_existing_doc.version);
    END IF;
    RETURN jsonb_build_object('action', 'in_progress', 'document_id', v_existing_doc.id, 'status', v_existing_doc.status, 'version', v_existing_doc.version);
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version FROM public.generated_documents WHERE doc_type = p_doc_type AND entity_id = p_entity_id;

  INSERT INTO public.generated_documents (doc_type, entity_id, version, snapshot_hash, render_hash, template_key, renderer, snapshot, project_id, company_id, status)
  VALUES (p_doc_type, p_entity_id, v_version, p_snapshot_hash, p_render_hash, COALESCE(p_template_key, 'default'), COALESCE(p_renderer, 'html2pdf'), COALESCE(p_snapshot, '{}'::jsonb), p_project_id, p_company_id, 'pending')
  RETURNING id INTO v_new_doc_id;

  INSERT INTO public.pdf_render_jobs (generated_document_id, status, attempt_count, max_attempts, priority)
  VALUES (v_new_doc_id, 'queued', 0, 3, COALESCE(p_priority, 100)) RETURNING id INTO v_new_job_id;

  RETURN jsonb_build_object('action', 'created', 'document_id', v_new_doc_id, 'job_id', v_new_job_id, 'status', 'pending', 'version', v_version);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_pdf_generation(p_doc_type text, p_entity_id uuid, p_project_id uuid, p_company_id uuid, p_template_key text, p_renderer text, p_snapshot jsonb, p_snapshot_hash text, p_render_hash text, p_file_name text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_doc_id uuid;
  v_version int;
begin
  -- Determine next version for this entity (only if we need a new version)
  select coalesce(max(version), 0) + 1
    into v_version
  from public.generated_documents
  where doc_type = p_doc_type and entity_id = p_entity_id;

  -- If same render_hash already exists for this entity, return it (idempotent)
  select id into v_doc_id
  from public.generated_documents
  where doc_type = p_doc_type
    and entity_id = p_entity_id
    and render_hash = p_render_hash
  limit 1;

  if v_doc_id is not null then
    return v_doc_id;
  end if;

  insert into public.generated_documents (
    company_id, project_id,
    doc_type, entity_id,
    version, status,
    template_key, renderer,
    snapshot, snapshot_hash, render_hash,
    file_name,
    created_by
  )
  values (
    p_company_id, p_project_id,
    p_doc_type, p_entity_id,
    v_version, 'draft',
    coalesce(p_template_key,'default'), coalesce(p_renderer,'playwright'),
    coalesce(p_snapshot,'{}'::jsonb), p_snapshot_hash, p_render_hash,
    p_file_name,
    auth.uid()
  )
  returning id into v_doc_id;

  insert into public.pdf_render_jobs (generated_document_id, status)
  values (v_doc_id, 'queued');

  return v_doc_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_work_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget_v2(p_project_id uuid, p_estimate_id uuid, p_mode text DEFAULT 'merge'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_budget_id uuid;
  v_estimate public.estimates%rowtype;
  v_is_change_order boolean;
  v_uses_scope_blocks boolean;
begin
  select *
  into v_estimate
  from public.estimates
  where id = p_estimate_id;

  if not found then
    raise exception 'Estimate not found';
  end if;

  if v_estimate.project_id <> p_project_id then
    raise exception 'Estimate does not belong to this project';
  end if;

  v_is_change_order := (v_estimate.status = 'change_order')
    or coalesce((v_estimate.settings ->> 'is_change_order')::boolean, false);

  if p_mode = 'replace' then
    update public.project_budgets
    set status = 'archived',
        updated_at = now()
    where project_id = p_project_id
      and status = 'active'
    returning id into v_budget_id;

    if v_budget_id is not null then
      delete from public.project_budget_lines
      where project_budget_id = v_budget_id;
    end if;

    v_budget_id := null;
  end if;

  if v_budget_id is null then
    select id
    into v_budget_id
    from public.project_budgets
    where project_id = p_project_id
      and status = 'active'
    order by created_at desc
    limit 1;
  end if;

  if v_budget_id is null then
    insert into public.project_budgets (project_id, status, created_at, updated_at)
    values (p_project_id, 'active', now(), now())
    returning id into v_budget_id;
  end if;

  if p_mode = 'merge' then
    delete from public.project_budget_lines
    where project_budget_id = v_budget_id
      and source_estimate_id = p_estimate_id;
  end if;

  select exists (
    select 1
    from public.scope_blocks sb
    where sb.entity_type = 'estimate'
      and sb.entity_id = p_estimate_id
      and sb.is_visible = true
  )
  into v_uses_scope_blocks;

  if v_uses_scope_blocks then
    insert into public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      category,
      description_internal,
      description_client,
      qty,
      unit,
      unit_cost,
      budget_amount,
      budget_hours,
      markup_pct,
      tax_pct,
      allowance_cap,
      is_optional,
      is_allowance,
      client_visible,
      sort_order,
      internal_notes,
      source_estimate_id,
      change_order_id
    )
    select
      p_project_id,
      v_budget_id,
      null,
      sbci.cost_code_id,
      case
        when sb.block_type = 'change_order' or v_is_change_order then 'change_order'
        else 'base'
      end,
      public.normalize_line_type(sbci.category),
      public.normalize_line_type(sbci.category),
      coalesce(sbci.description, ''),
      coalesce(sbci.description, ''),
      coalesce(sbci.quantity, 1),
      sbci.unit,
      coalesce(sbci.unit_price, 0)::numeric,
      coalesce(sbci.line_total,
               coalesce(sbci.quantity, 1) * coalesce(sbci.unit_price, 0)
      )::numeric,
      null::numeric,
      sbci.markup_percent,
      null::numeric,
      null::numeric,
      false,
      false,
      true,
      coalesce(sbci.sort_order, 0),
      sbci.notes,
      p_estimate_id,
      case
        when sb.block_type = 'change_order' or v_is_change_order then p_estimate_id
        else null
      end
    from public.scope_blocks sb
    join public.scope_block_cost_items sbci
      on sbci.scope_block_id = sb.id
    where sb.entity_type = 'estimate'
      and sb.entity_id = p_estimate_id
      and sb.is_visible = true;

  else
    insert into public.project_budget_lines (
      project_id,
      project_budget_id,
      group_id,
      cost_code_id,
      scope_type,
      line_type,
      category,
      description_internal,
      description_client,
      qty,
      unit,
      unit_cost,
      budget_amount,
      budget_hours,
      markup_pct,
      tax_pct,
      allowance_cap,
      is_optional,
      is_allowance,
      client_visible,
      sort_order,
      internal_notes,
      source_estimate_id,
      change_order_id
    )
    select
      p_project_id,
      v_budget_id,
      null,
      ei.cost_code_id,
      case when v_is_change_order then 'change_order' else 'base' end,
      public.normalize_line_type(ei.category),
      public.normalize_line_type(ei.category),
      string_agg(coalesce(ei.description, ''), ' | '),
      string_agg(coalesce(ei.description, ''), ' | '),
      sum(coalesce(ei.quantity, 1)),
      coalesce(max(ei.unit), 'ea'),
      case
        when sum(coalesce(ei.quantity, 1)) > 0 then
          sum(
            coalesce(ei.line_total,
              coalesce(ei.quantity, 1) * coalesce(ei.unit_price, 0)
            )
          ) / sum(coalesce(ei.quantity, 1))
        else 0
      end::numeric,
      sum(
        coalesce(ei.line_total,
          coalesce(ei.quantity, 1) * coalesce(ei.unit_price, 0)
        )
      )::numeric,
      sum(coalesce(ei.planned_hours, 0))::numeric,
      null::numeric,
      null::numeric,
      null::numeric,
      false,
      bool_or(coalesce(ei.is_allowance, false)),
      true,
      0,
      null,
      p_estimate_id,
      case when v_is_change_order then p_estimate_id else null end
    from public.estimate_items ei
    where ei.estimate_id = p_estimate_id
    group by
      ei.cost_code_id,
      public.normalize_line_type(ei.category);
  end if;

  with sums as (
    select
      coalesce(sum(case when line_type = 'labor' then budget_amount else 0 end), 0) as labor_budget,
      coalesce(sum(case when line_type = 'subs' then budget_amount else 0 end), 0) as subs_budget,
      coalesce(sum(case when line_type = 'materials' then budget_amount else 0 end), 0) as materials_budget,
      coalesce(sum(case when line_type = 'equipment' then budget_amount else 0 end), 0) as equipment_budget,
      coalesce(sum(case when line_type not in ('labor', 'subs', 'materials', 'equipment')
                        then budget_amount else 0 end), 0) as other_budget
    from public.project_budget_lines
    where project_budget_id = v_budget_id
  )
  update public.project_budgets pb
  set labor_budget = s.labor_budget,
      subs_budget = s.subs_budget,
      materials_budget = s.materials_budget,
      other_budget = s.other_budget + s.equipment_budget,
      baseline_estimate_id = case
        when p_mode = 'replace' then p_estimate_id
        else pb.baseline_estimate_id
      end,
      updated_at = now()
  from sums s
  where pb.id = v_budget_id;

  return jsonb_build_object(
    'budget_id', v_budget_id,
    'estimate_id', p_estimate_id,
    'mode', p_mode
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_invoice_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  paid numeric := 0;
  balance numeric := 0;
BEGIN
  SELECT total_paid INTO paid
  FROM invoice_payment_totals
  WHERE invoice_id = NEW.id;

  balance := NEW.total_amount - COALESCE(paid, 0);

  NEW.previously_invoiced := paid;
  NEW.balance_to_finish := GREATEST(balance, 0);

  IF balance <= 0 AND NEW.total_amount > 0 THEN
    NEW.status := 'paid';
  ELSIF paid > 0 THEN
    NEW.status := 'partially_paid';
  ELSIF NEW.status IS NULL THEN
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_invoice_items_calc_line_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.line_total = coalesce(new.quantity,0) * coalesce(new.unit_price,0);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.tg_invoice_items_recalc_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform public.recalc_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.tg_payment_schedule_items_recalc_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform public.recalc_payment_schedule_item_amount(new.id);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.update_cost_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_paid NUMERIC(12,2);
  cost_amount NUMERIC(12,2);
  new_status TEXT;
BEGIN
  -- Calculate total paid_amount for this cost from all payment_items
  SELECT COALESCE(SUM(applied_amount), 0), c.amount
  INTO total_paid, cost_amount
  FROM public.vendor_payment_items vpi
  JOIN public.costs c ON c.id = vpi.cost_id
  WHERE vpi.cost_id = COALESCE(NEW.cost_id, OLD.cost_id)
  GROUP BY c.amount;

  -- Determine status based on paid_amount vs amount
  IF total_paid = 0 THEN
    new_status := 'unpaid';
  ELSIF total_paid >= cost_amount THEN
    new_status := 'paid';
  ELSE
    new_status := 'partially_paid';
  END IF;

  -- Update the cost record
  UPDATE public.costs
  SET 
    paid_amount = total_paid,
    status = new_status,
    paid_date = CASE WHEN new_status = 'paid' THEN CURRENT_DATE ELSE paid_date END,
    updated_at = now()
  WHERE id = COALESCE(NEW.cost_id, OLD.cost_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_invoice_status_from_payments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  inv_id UUID;
  invoice_total NUMERIC;
  paid_total NUMERIC;
  current_status TEXT;
  new_status TEXT;
  sent_at_val timestamptz;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF inv_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT total_amount, status, sent_at
  INTO invoice_total, current_status, sent_at_val
  FROM public.invoices
  WHERE id = inv_id;

  IF invoice_total IS NULL OR current_status = 'void' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  paid_total := public.calculate_invoice_payments_total(inv_id);

  -- IMPORTANT: don't auto-set "sent". Draft vs Sent is a user action (sent_at).
  IF paid_total >= invoice_total AND invoice_total > 0 THEN
    new_status := 'paid';
  ELSIF paid_total > 0 THEN
    new_status := 'partially_paid';
  ELSE
    new_status := CASE
      WHEN sent_at_val IS NOT NULL THEN 'sent'
      ELSE 'draft'
    END;
  END IF;

  IF new_status <> current_status THEN
    UPDATE public.invoices SET status = new_status WHERE id = inv_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  NEW.updated_at = now();
  return NEW;
end;
$function$
;

create or replace view "public"."work_order_schedule_view" as  SELECT wo.id AS work_order_id,
    wo.project_id,
    wo.sub_company_id,
    wo.budget_item_id,
    wo.title,
    wo.status,
    wo.scheduled_start,
    wo.scheduled_end,
    wo.original_amount,
    COALESCE(wo.approved_amount, wo.original_amount) AS contract_amount,
    s.id AS sub_shift_id,
    s.scheduled_date,
    s.scheduled_hours,
    s.notes AS schedule_notes
   FROM (public.work_orders wo
     LEFT JOIN public.sub_scheduled_shifts s ON ((s.work_order_id = wo.id)));


create or replace view "public"."company_payroll_summary" as  SELECT c.id AS company_id,
    c.name AS company_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_unpaid,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_paid,
    max(dc.date) AS last_activity_date
   FROM (public.companies c
     LEFT JOIN public.day_cards dc ON ((dc.company_id = c.id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY c.id, c.name;


create or replace view "public"."cost_code_actuals" as  SELECT cc.id AS cost_code_id,
    cc.code,
    cc.name AS cost_code_name,
    cc.category,
    tla.project_id,
    p.project_name,
    sum(tla.hours) AS actual_hours,
    sum((tla.hours * dc.pay_rate)) AS actual_cost,
    count(DISTINCT dc.worker_id) AS worker_count
   FROM (((public.cost_codes cc
     LEFT JOIN public.time_log_allocations tla ON ((tla.cost_code_id = cc.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;


create or replace view "public"."day_cards_with_details" as  SELECT dc.id,
    dc.worker_id,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.status,
    dc.pay_rate,
    dc.pay_status,
    dc.company_id,
    dc.notes,
    dc.metadata,
    dc.created_at,
    dc.updated_at,
    dc.created_by,
    dc.locked,
    w.name AS worker_name,
    w.hourly_rate AS worker_default_rate,
    t.name AS trade_name,
    array_agg(jsonb_build_object('id', dcj.id, 'project_id', dcj.project_id, 'project_name', p.project_name, 'trade_id', dcj.trade_id, 'cost_code_id', dcj.cost_code_id, 'hours', dcj.hours, 'notes', dcj.notes) ORDER BY dcj.created_at) FILTER (WHERE (dcj.id IS NOT NULL)) AS jobs
   FROM ((((public.day_cards dc
     LEFT JOIN public.workers w ON ((dc.worker_id = w.id)))
     LEFT JOIN public.trades t ON ((w.trade_id = t.id)))
     LEFT JOIN public.day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
     LEFT JOIN public.projects p ON ((dcj.project_id = p.id)))
  GROUP BY dc.id, w.name, w.hourly_rate, t.name;


create or replace view "public"."global_financial_summary_view" as  WITH labor_summary AS (
         SELECT COALESCE(sum(time_logs.labor_cost), (0)::numeric) AS total_labor_cost,
            COALESCE(sum(
                CASE
                    WHEN (time_logs.payment_status = 'unpaid'::text) THEN time_logs.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_labor_cost
           FROM public.time_logs
        ), costs_summary AS (
         SELECT COALESCE(sum(
                CASE
                    WHEN (costs.category = 'subs'::text) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_cost,
            COALESCE(sum(
                CASE
                    WHEN ((costs.category = 'subs'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (costs.category = 'materials'::text) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_cost,
            COALESCE(sum(
                CASE
                    WHEN ((costs.category = 'materials'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_unpaid,
            COALESCE(sum(
                CASE
                    WHEN ((lower(costs.category) = ANY (ARRAY['other'::text, 'misc'::text, 'equipment'::text])) OR (costs.category IS NULL)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_cost,
            COALESCE(sum(
                CASE
                    WHEN (((lower(costs.category) = ANY (ARRAY['other'::text, 'misc'::text, 'equipment'::text])) OR (costs.category IS NULL)) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_unpaid
           FROM public.costs
        ), revenue_summary AS (
         SELECT COALESCE(sum(estimates.total_amount), (0)::numeric) AS total_revenue
           FROM public.estimates
          WHERE (estimates.status = 'accepted'::text)
        ), retention_summary AS (
         SELECT COALESCE(sum(invoices.retention_amount), (0)::numeric) AS total_retention
           FROM public.invoices
          WHERE (invoices.status <> 'void'::text)
        )
 SELECT r.total_revenue AS revenue,
    l.total_labor_cost AS labor_actual,
    l.unpaid_labor_cost AS labor_unpaid,
    c.subs_cost AS subs_actual,
    c.subs_unpaid,
    c.materials_cost AS materials_actual,
    c.materials_unpaid,
    c.other_cost AS other_actual,
    c.other_unpaid,
    ret.total_retention AS retention_held,
    (((l.total_labor_cost + c.subs_cost) + c.materials_cost) + c.other_cost) AS total_costs,
    (r.total_revenue - (((l.total_labor_cost + c.subs_cost) + c.materials_cost) + c.other_cost)) AS profit,
    (((l.unpaid_labor_cost + c.subs_unpaid) + c.materials_unpaid) + c.other_unpaid) AS total_outstanding
   FROM labor_summary l,
    costs_summary c,
    revenue_summary r,
    retention_summary ret;


create or replace view "public"."labor_actuals_by_cost_code" as  SELECT dl.project_id,
    dl.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    sum(dl.hours_worked) AS actual_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS actual_cost,
    count(DISTINCT dl.worker_id) AS worker_count
   FROM ((public.daily_logs dl
     LEFT JOIN public.cost_codes cc ON ((dl.cost_code_id = cc.id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY dl.project_id, dl.cost_code_id, cc.code, cc.name;


create or replace view "public"."material_actuals_by_project" as  SELECT p.id AS project_id,
    p.project_name,
    p.company_id,
    COALESCE(sum(c.amount), (0)::numeric) AS material_actual,
    pb.materials_budget,
    (COALESCE(pb.materials_budget, (0)::numeric) - COALESCE(sum(c.amount), (0)::numeric)) AS material_variance,
    count(DISTINCT mr.id) AS receipt_count,
    count(DISTINCT c.vendor_id) AS vendor_count
   FROM (((public.projects p
     LEFT JOIN public.costs c ON (((c.project_id = p.id) AND (c.category = 'materials'::text) AND (c.status <> 'void'::text))))
     LEFT JOIN public.material_receipts mr ON ((mr.project_id = p.id)))
     LEFT JOIN public.project_budgets pb ON ((pb.project_id = p.id)))
  GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;


create or replace view "public"."monthly_costs_view" as  SELECT (date_trunc('month'::text, (date_incurred)::timestamp with time zone))::date AS month,
    category,
    sum(amount) AS total_cost,
    sum(
        CASE
            WHEN (status = 'unpaid'::text) THEN amount
            ELSE (0)::numeric
        END) AS unpaid_cost,
    sum(
        CASE
            WHEN (status = 'paid'::text) THEN amount
            ELSE (0)::numeric
        END) AS paid_cost,
    count(*) AS cost_entry_count
   FROM public.costs c
  GROUP BY (date_trunc('month'::text, (date_incurred)::timestamp with time zone)), category;


create or replace view "public"."monthly_labor_costs_view" as  SELECT (date_trunc('month'::text, (date)::timestamp with time zone))::date AS month,
    sum(labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (payment_status = 'unpaid'::text) THEN labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (payment_status = 'paid'::text) THEN labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    sum(hours_worked) AS total_hours,
    count(DISTINCT worker_id) AS unique_workers,
    count(*) AS log_count
   FROM public.time_logs t
  GROUP BY (date_trunc('month'::text, (date)::timestamp with time zone));


create or replace view "public"."payment_labor_summary" as  SELECT p.id AS payment_id,
    p.start_date,
    p.end_date,
    p.paid_by,
    p.payment_date,
    dl.worker_id,
    w.name AS worker_name,
    w.trade AS worker_trade,
    dl.project_id,
    proj.project_name,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS labor_cost
   FROM (((public.payments p
     CROSS JOIN public.daily_logs dl)
     JOIN public.workers w ON ((w.id = dl.worker_id)))
     JOIN public.projects proj ON ((proj.id = dl.project_id)))
  WHERE ((dl.date >= p.start_date) AND (dl.date <= p.end_date))
  GROUP BY p.id, p.start_date, p.end_date, p.paid_by, p.payment_date, dl.worker_id, w.name, w.trade, dl.project_id, proj.project_name;


create or replace view "public"."project_activity_view" as  SELECT dl.id AS log_id,
    dl.project_id,
    dl.worker_id,
    dl.trade_id,
    dl.date,
    dl.hours_worked,
    dl.schedule_id,
    dl.notes,
    dl.created_at,
    (dl.hours_worked * COALESCE(w.hourly_rate, (0)::numeric)) AS cost,
    w.name AS worker_name,
    w.trade AS worker_trade,
    p.project_name
   FROM ((public.daily_logs dl
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects p ON ((dl.project_id = p.id)));


create or replace view "public"."project_budget_ledger_view" as  WITH budget AS (
         SELECT pbl.project_id,
            pbl.cost_code_id,
            pbl.category,
            sum(COALESCE(pbl.budget_amount, (0)::numeric)) AS budget_amount,
            sum(COALESCE(pbl.budget_hours, (0)::numeric)) AS budget_hours,
            bool_or(COALESCE(pbl.is_allowance, false)) AS is_allowance
           FROM public.project_budget_lines pbl
          GROUP BY pbl.project_id, pbl.cost_code_id, pbl.category
        ), labor_actuals AS (
         SELECT tl.project_id,
            tl.cost_code_id,
            COALESCE(sum(tl.labor_cost), (0)::numeric) AS labor_actual_amount,
            COALESCE(sum(COALESCE(tl.hours_worked, (0)::numeric)), (0)::numeric) AS labor_actual_hours
           FROM public.time_logs tl
          GROUP BY tl.project_id, tl.cost_code_id
        ), non_labor_actuals AS (
         SELECT c.project_id,
            c.cost_code_id,
            c.category,
            COALESCE(sum(c.amount), (0)::numeric) AS actual_amount,
            COALESCE(sum(
                CASE
                    WHEN (c.status = 'unpaid'::text) THEN c.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_amount
           FROM public.costs c
          GROUP BY c.project_id, c.cost_code_id, c.category
        )
 SELECT b.project_id,
    b.cost_code_id,
    cc.code AS cost_code,
    COALESCE(cc.name, 'Unassigned / Misc'::text) AS cost_code_name,
    b.category,
    b.budget_amount,
    b.budget_hours,
    b.is_allowance,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_amount, (0)::numeric)
            ELSE COALESCE(nla.actual_amount, (0)::numeric)
        END AS actual_amount,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_hours, (0)::numeric)
            ELSE (0)::numeric
        END AS actual_hours,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la_unpaid.labor_unpaid_amount, (0)::numeric)
            ELSE COALESCE(nla.unpaid_amount, (0)::numeric)
        END AS unpaid_amount,
    (COALESCE(b.budget_amount, (0)::numeric) -
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_amount, (0)::numeric)
            ELSE COALESCE(nla.actual_amount, (0)::numeric)
        END) AS variance
   FROM ((((budget b
     LEFT JOIN public.cost_codes cc ON ((cc.id = b.cost_code_id)))
     LEFT JOIN labor_actuals la ON (((la.project_id = b.project_id) AND (la.cost_code_id = b.cost_code_id))))
     LEFT JOIN ( SELECT tl.project_id,
            tl.cost_code_id,
            COALESCE(sum(
                CASE
                    WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS labor_unpaid_amount
           FROM public.time_logs tl
          GROUP BY tl.project_id, tl.cost_code_id) la_unpaid ON (((la_unpaid.project_id = b.project_id) AND (la_unpaid.cost_code_id = b.cost_code_id))))
     LEFT JOIN non_labor_actuals nla ON (((nla.project_id = b.project_id) AND (nla.cost_code_id = b.cost_code_id) AND (nla.category = b.category))));


create or replace view "public"."project_budget_vs_actual_view" as  WITH budget AS (
         SELECT pb.project_id,
            pb.id AS project_budget_id,
            pb.labor_budget,
            pb.subs_budget,
            pb.materials_budget,
            pb.other_budget,
            (((COALESCE(pb.labor_budget, (0)::numeric) + COALESCE(pb.subs_budget, (0)::numeric)) + COALESCE(pb.materials_budget, (0)::numeric)) + COALESCE(pb.other_budget, (0)::numeric)) AS total_budget
           FROM public.project_budgets pb
        ), labor_actuals AS (
         SELECT tl.project_id,
            COALESCE(sum(tl.labor_cost), (0)::numeric) AS labor_actual,
            COALESCE(sum(
                CASE
                    WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS labor_unpaid
           FROM public.time_logs tl
          GROUP BY tl.project_id
        ), costs_actuals AS (
         SELECT c.project_id,
            c.category,
            COALESCE(sum(c.amount), (0)::numeric) AS actual_amount,
            COALESCE(sum(
                CASE
                    WHEN (c.status = 'unpaid'::text) THEN c.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_amount
           FROM public.costs c
          GROUP BY c.project_id, c.category
        ), costs_pivot AS (
         SELECT ca.project_id,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'subs'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'subs'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'materials'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'materials'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'other'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'other'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_unpaid
           FROM costs_actuals ca
          GROUP BY ca.project_id
        ), revenue AS (
         SELECT e.project_id,
            COALESCE(sum(e.total_amount), (0)::numeric) AS total_revenue
           FROM public.estimates e
          WHERE (e.status = 'accepted'::text)
          GROUP BY e.project_id
        ), retention AS (
         SELECT i.project_id,
            COALESCE(sum(i.retention_amount), (0)::numeric) AS retention_held
           FROM public.invoices i
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        )
 SELECT p.id AS project_id,
    p.project_name,
    b.project_budget_id,
    COALESCE(b.labor_budget, (0)::numeric) AS labor_budget,
    COALESCE(b.subs_budget, (0)::numeric) AS subs_budget,
    COALESCE(b.materials_budget, (0)::numeric) AS materials_budget,
    COALESCE(b.other_budget, (0)::numeric) AS other_budget,
    COALESCE(b.total_budget, (0)::numeric) AS total_budget,
    COALESCE(la.labor_actual, (0)::numeric) AS labor_actual,
    COALESCE(cp.subs_actual, (0)::numeric) AS subs_actual,
    COALESCE(cp.materials_actual, (0)::numeric) AS materials_actual,
    COALESCE(cp.other_actual, (0)::numeric) AS other_actual,
    COALESCE(la.labor_unpaid, (0)::numeric) AS labor_unpaid,
    COALESCE(cp.subs_unpaid, (0)::numeric) AS subs_unpaid,
    COALESCE(cp.materials_unpaid, (0)::numeric) AS materials_unpaid,
    COALESCE(cp.other_unpaid, (0)::numeric) AS other_unpaid,
    COALESCE(r.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(ret.retention_held, (0)::numeric) AS retention_held,
    (((COALESCE(la.labor_actual, (0)::numeric) + COALESCE(cp.subs_actual, (0)::numeric)) + COALESCE(cp.materials_actual, (0)::numeric)) + COALESCE(cp.other_actual, (0)::numeric)) AS total_actual_costs,
    (COALESCE(r.total_revenue, (0)::numeric) - (((COALESCE(la.labor_actual, (0)::numeric) + COALESCE(cp.subs_actual, (0)::numeric)) + COALESCE(cp.materials_actual, (0)::numeric)) + COALESCE(cp.other_actual, (0)::numeric))) AS profit,
    (((COALESCE(la.labor_unpaid, (0)::numeric) + COALESCE(cp.subs_unpaid, (0)::numeric)) + COALESCE(cp.materials_unpaid, (0)::numeric)) + COALESCE(cp.other_unpaid, (0)::numeric)) AS total_outstanding
   FROM (((((public.projects p
     LEFT JOIN budget b ON ((b.project_id = p.id)))
     LEFT JOIN labor_actuals la ON ((la.project_id = p.id)))
     LEFT JOIN costs_pivot cp ON ((cp.project_id = p.id)))
     LEFT JOIN revenue r ON ((r.project_id = p.id)))
     LEFT JOIN retention ret ON ((ret.project_id = p.id)));


create or replace view "public"."project_cost_summary_view" as  SELECT c.project_id,
    p.company_id,
    p.project_name,
    sum(c.amount) AS total_cost,
    sum(
        CASE
            WHEN (c.status = 'paid'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS paid_cost,
    sum(
        CASE
            WHEN (c.status = 'unpaid'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS unpaid_cost,
    sum(
        CASE
            WHEN (c.category = 'subs'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS subs_cost,
    sum(
        CASE
            WHEN (c.category = 'materials'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS materials_cost,
    sum(
        CASE
            WHEN (c.category = 'misc'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS misc_cost,
    sum(
        CASE
            WHEN ((c.category = 'subs'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS subs_unpaid,
    sum(
        CASE
            WHEN ((c.category = 'materials'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS materials_unpaid,
    sum(
        CASE
            WHEN ((c.category = 'misc'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS misc_unpaid,
    count(c.id) AS cost_entry_count
   FROM (public.costs c
     JOIN public.projects p ON ((c.project_id = p.id)))
  GROUP BY c.project_id, p.company_id, p.project_name;


create or replace view "public"."project_costs_view" as  WITH labor_costs AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS total_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS total_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          GROUP BY dl.project_id
        ), paid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS paid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS paid_cost,
            max(p_1.payment_date) AS last_paid_at
           FROM ((public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
             JOIN public.payments p_1 ON (((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date))))
          GROUP BY dl.project_id
        ), unpaid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS unpaid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS unpaid_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM public.payments p_1
                  WHERE ((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date)))))
          GROUP BY dl.project_id
        )
 SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.status,
    COALESCE(lc.total_hours, (0)::numeric) AS labor_total_hours,
    COALESCE(lc.total_cost, (0)::numeric) AS labor_total_cost,
    COALESCE(pl.paid_hours, (0)::numeric) AS labor_paid_hours,
    COALESCE(pl.paid_cost, (0)::numeric) AS labor_paid_cost,
    COALESCE(ul.unpaid_hours, (0)::numeric) AS labor_unpaid_hours,
    COALESCE(ul.unpaid_cost, (0)::numeric) AS labor_unpaid_cost,
    pl.last_paid_at,
    COALESCE(pb.labor_budget, (0)::numeric) AS labor_budget,
    COALESCE(pb.subs_budget, (0)::numeric) AS subs_budget,
    COALESCE(pb.materials_budget, (0)::numeric) AS materials_budget,
    COALESCE(pb.other_budget, (0)::numeric) AS other_budget,
    (COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)) AS labor_budget_variance,
    GREATEST((COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)), (0)::numeric) AS labor_budget_remaining
   FROM ((((public.projects p
     LEFT JOIN labor_costs lc ON ((p.id = lc.project_id)))
     LEFT JOIN paid_labor pl ON ((p.id = pl.project_id)))
     LEFT JOIN unpaid_labor ul ON ((p.id = ul.project_id)))
     LEFT JOIN public.project_budgets pb ON ((p.id = pb.project_id)));


create or replace view "public"."project_dashboard_view" as  SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.company_id,
    p.status,
    p.address,
    p.project_manager,
    COALESCE(sum(dl.hours_worked), (0)::numeric) AS total_hours,
    COALESCE(sum((dl.hours_worked * w.hourly_rate)), (0)::numeric) AS total_cost,
    count(DISTINCT dl.worker_id) AS worker_count,
    max(dl.date) AS last_activity
   FROM ((public.projects p
     LEFT JOIN public.daily_logs dl ON ((p.id = dl.project_id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY p.id, p.project_name, p.client_name, p.company_id, p.status, p.address, p.project_manager;


create or replace view "public"."project_labor_costs_view" as  SELECT t.project_id,
    t.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    sum(t.hours_worked) AS total_hours,
    sum(t.labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (t.payment_status = 'unpaid'::text) THEN t.labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (t.payment_status = 'paid'::text) THEN t.labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    count(DISTINCT t.worker_id) AS worker_count,
    min(t.date) AS first_log_date,
    max(t.date) AS last_log_date
   FROM (public.time_logs t
     LEFT JOIN public.cost_codes cc ON ((cc.id = t.cost_code_id)))
  GROUP BY t.project_id, t.cost_code_id, cc.code, cc.name;


create or replace view "public"."project_labor_summary" as  SELECT p.id AS project_id,
    p.project_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours_logged,
    sum(dc.scheduled_hours) AS total_hours_scheduled,
    sum(COALESCE((dc.logged_hours * dc.pay_rate), (0)::numeric)) AS total_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    max(dc.date) AS last_activity_date
   FROM ((public.projects p
     LEFT JOIN public.time_log_allocations tla ON ((tla.project_id = p.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
  GROUP BY p.id, p.project_name;


create or replace view "public"."project_labor_summary_view" as  SELECT tl.project_id,
    tl.company_id,
    p.project_name,
    sum(tl.hours_worked) AS total_hours,
    sum(tl.labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'paid'::text) THEN tl.labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'paid'::text) THEN tl.hours_worked
            ELSE (0)::numeric
        END) AS paid_hours,
    sum(
        CASE
            WHEN (tl.payment_status = 'unpaid'::text) THEN tl.hours_worked
            ELSE (0)::numeric
        END) AS unpaid_hours,
    count(DISTINCT tl.worker_id) AS worker_count,
    count(tl.id) AS time_log_count
   FROM (public.time_logs tl
     LEFT JOIN public.projects p ON ((tl.project_id = p.id)))
  GROUP BY tl.project_id, tl.company_id, p.project_name;


create or replace view "public"."project_revenue_summary_view" as  SELECT project_id,
    COALESCE(sum(
        CASE
            WHEN (status <> 'void'::text) THEN total_amount
            ELSE (0)::numeric
        END), (0)::numeric) AS billed_amount
   FROM public.invoices i
  GROUP BY project_id;


create or replace view "public"."project_schedule_view" as  SELECT id,
    project_id,
    worker_id,
    trade_id,
    scheduled_date,
    scheduled_hours,
    status,
    notes,
    converted_to_timelog,
    created_at,
    updated_at
   FROM public.scheduled_shifts;


create or replace view "public"."sub_contract_summary" as  SELECT sc.id AS contract_id,
    sc.project_id,
    sc.sub_id,
    s.name AS sub_name,
    s.company_name,
    s.trade,
    sc.contract_value,
    sc.retention_percentage,
    sc.status,
    COALESCE(sum(si.total), (0)::numeric) AS total_billed,
    COALESCE(sum(sp.amount_paid), (0)::numeric) AS total_paid,
    COALESCE(sum(si.retention_amount), (0)::numeric) AS total_retention_held,
    COALESCE(sum(sp.retention_released), (0)::numeric) AS total_retention_released,
    (sc.contract_value - COALESCE(sum(si.total), (0)::numeric)) AS remaining_to_bill,
    (COALESCE(sum(si.total), (0)::numeric) - COALESCE(sum(sp.amount_paid), (0)::numeric)) AS outstanding_balance
   FROM (((public.sub_contracts sc
     LEFT JOIN public.subs s ON ((s.id = sc.sub_id)))
     LEFT JOIN public.sub_invoices si ON (((si.contract_id = sc.id) AND (si.payment_status <> 'rejected'::text))))
     LEFT JOIN public.sub_payments sp ON ((sp.project_subcontract_id = sc.id)))
  GROUP BY sc.id, s.name, s.company_name, s.trade;


CREATE OR REPLACE FUNCTION public.tg_set_company_id_from_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  -- If project_id is present and company_id is missing, infer it
  if new.project_id is not null and new.company_id is null then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    new.company_id := v_company_id;

    if new.company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;
  end if;

  -- If project_id changes on UPDATE, ensure company_id matches the project
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    if v_company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;

    -- If company_id is missing OR mismatched after a project change, enforce it
    if new.company_id is null or new.company_id is distinct from v_company_id then
      new.company_id := v_company_id;
    end if;
  end if;

  -- If UPDATE explicitly sets company_id to NULL while project_id exists, re-infer or fail
  if tg_op = 'UPDATE' and new.project_id is not null and new.company_id is null then
    select p.company_id
      into v_company_id
    from public.projects p
    where p.id = new.project_id;

    new.company_id := v_company_id;

    if new.company_id is null then
      raise exception 'company_id is required (could not infer from project_id=%)', new.project_id;
    end if;
  end if;

  return new;
end;
$function$
;

create or replace view "public"."time_logs_with_meta_view" as  SELECT tl.id,
    tl.worker_id,
    w.name AS worker_name,
    w.trade_id AS worker_trade_id,
    t.name AS worker_trade_name,
    tl.project_id,
    p.project_name,
    p.company_id,
    c.name AS company_name,
    tl.company_id AS override_company_id,
    tl.trade_id,
    tl.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    tl.date,
    tl.hours_worked,
    tl.hourly_rate,
    tl.labor_cost,
    tl.payment_status,
    tl.paid_amount,
    tl.source_schedule_id,
    tl.notes,
    tl.last_synced_at,
    tl.created_at
   FROM (((((public.time_logs tl
     LEFT JOIN public.workers w ON ((w.id = tl.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = tl.trade_id)))
     LEFT JOIN public.projects p ON ((p.id = tl.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = tl.cost_code_id)));


create or replace view "public"."unpaid_labor_bills" as  SELECT p.company_id,
    c.name AS company_name,
    dl.project_id,
    proj.project_name,
    min(dl.date) AS period_start,
    max(dl.date) AS period_end,
    count(dl.id) AS log_count,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS total_amount
   FROM ((((public.daily_logs dl
     JOIN public.projects p ON ((dl.project_id = p.id)))
     LEFT JOIN public.companies c ON ((p.company_id = c.id)))
     JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects proj ON ((dl.project_id = proj.id)))
  WHERE (dl.payment_status = 'unpaid'::text)
  GROUP BY p.company_id, c.name, dl.project_id, proj.project_name
  ORDER BY (max(dl.date)) DESC;


create or replace view "public"."unpaid_time_logs_available_for_pay_run" as  SELECT id,
    worker_id,
    date,
    project_id,
    company_id,
    trade_id,
    cost_code_id,
    hours_worked,
    hourly_rate,
    labor_cost,
    notes,
    payment_status,
    payment_id,
    paid_amount,
    source_schedule_id,
    last_synced_at,
    created_by,
    created_at,
    updated_at
   FROM public.time_logs tl
  WHERE ((payment_status = 'unpaid'::text) AND (NOT (EXISTS ( SELECT 1
           FROM (public.labor_pay_run_items lpri
             JOIN public.labor_pay_runs pr ON ((pr.id = lpri.pay_run_id)))
          WHERE ((lpri.time_log_id = tl.id) AND (pr.status <> 'cancelled'::text))))));


create or replace view "public"."work_schedule_grid_view" as  SELECT ws.id,
    ws.worker_id,
    w.name AS worker_name,
    w.trade_id AS worker_trade_id,
    t.name AS worker_trade_name,
    ws.project_id,
    p.project_name,
    ws.company_id,
    c.name AS company_name,
    ws.trade_id,
    ws.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    ws.scheduled_date,
    ws.scheduled_hours,
    ws.status,
    ws.notes,
    ws.converted_to_timelog,
    ws.last_synced_at,
    ws.created_at,
    ws.updated_at
   FROM (((((public.work_schedules ws
     LEFT JOIN public.workers w ON ((w.id = ws.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = ws.trade_id)))
     LEFT JOIN public.projects p ON ((p.id = ws.project_id)))
     LEFT JOIN public.companies c ON ((c.id = ws.company_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = ws.cost_code_id)));


create or replace view "public"."worker_day_summary" as  SELECT dc.id AS day_card_id,
    dc.worker_id,
    w.name AS worker_name,
    w.hourly_rate AS worker_rate,
    t.name AS worker_trade,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.pay_rate,
    dc.lifecycle_status,
    dc.pay_status,
    dc.locked,
    dc.company_id,
    c.name AS company_name,
    COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric) AS total_cost,
        CASE
            WHEN (dc.pay_status = 'unpaid'::text) THEN COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric)
            ELSE (0)::numeric
        END AS unpaid_amount,
    json_agg(json_build_object('project_id', tla.project_id, 'project_name', p.project_name, 'hours', tla.hours, 'trade', tr.name, 'cost_code', cc.code)) FILTER (WHERE (tla.id IS NOT NULL)) AS allocations
   FROM (((((((public.day_cards dc
     JOIN public.workers w ON ((w.id = dc.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = w.trade_id)))
     LEFT JOIN public.companies c ON ((c.id = dc.company_id)))
     LEFT JOIN public.time_log_allocations tla ON ((tla.day_card_id = dc.id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
     LEFT JOIN public.trades tr ON ((tr.id = tla.trade_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = tla.cost_code_id)))
  GROUP BY dc.id, w.id, w.name, w.hourly_rate, t.name, c.name;


create or replace view "public"."workers_public" as  SELECT id,
    name,
    trade_id,
    trade,
    hourly_rate,
    active,
    created_at,
    updated_at,
        CASE
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN phone
            ELSE NULL::text
        END AS phone
   FROM public.workers;


create or replace view "public"."workforce_activity_feed" as  SELECT ('schedule:'::text || (ss.id)::text) AS id,
        CASE
            WHEN (ss.created_at = ss.updated_at) THEN 'schedule_created'::text
            ELSE 'schedule_updated'::text
        END AS event_type,
    ss.created_at AS event_at,
    ss.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    ss.project_id,
    p.project_name,
    ss.scheduled_hours AS hours,
    NULL::numeric AS amount,
    jsonb_build_object('schedule_id', ss.id, 'trade_id', ss.trade_id, 'status', ss.status, 'notes', ss.notes, 'date', ss.scheduled_date) AS meta
   FROM (((public.scheduled_shifts ss
     LEFT JOIN public.workers w ON ((w.id = ss.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = ss.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (ss.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('timelog:'::text || (dl.id)::text) AS id,
        CASE
            WHEN ((dl.created_at)::date = dl.date) THEN 'time_log_created'::text
            ELSE 'time_log_updated'::text
        END AS event_type,
    dl.created_at AS event_at,
    dl.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    dl.project_id,
    p.project_name,
    dl.hours_worked AS hours,
    (dl.hours_worked * w.hourly_rate) AS amount,
    jsonb_build_object('log_id', dl.id, 'trade_id', dl.trade_id, 'payment_status', dl.payment_status, 'payment_id', dl.payment_id, 'notes', dl.notes, 'date', dl.date, 'hourly_rate', w.hourly_rate) AS meta
   FROM (((public.daily_logs dl
     LEFT JOIN public.workers w ON ((w.id = dl.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = dl.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (dl.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('payment:'::text || (pay.id)::text) AS id,
        CASE
            WHEN (pay.created_at = pay.updated_at) THEN 'payment_created'::text
            ELSE 'payment_updated'::text
        END AS event_type,
    pay.created_at AS event_at,
    NULL::uuid AS worker_id,
    NULL::text AS worker_name,
    pay.company_id,
    c.name AS company_name,
    NULL::uuid AS project_id,
    NULL::text AS project_name,
    NULL::numeric AS hours,
    pay.amount,
    jsonb_build_object('payment_id', pay.id, 'start_date', pay.start_date, 'end_date', pay.end_date, 'payment_date', pay.payment_date, 'paid_by', pay.paid_by, 'paid_via', pay.paid_via, 'reimbursement_status', pay.reimbursement_status, 'notes', pay.notes, 'log_count', ( SELECT count(*) AS count
           FROM public.daily_logs
          WHERE (daily_logs.payment_id = pay.id))) AS meta
   FROM (public.payments pay
     LEFT JOIN public.companies c ON ((c.id = pay.company_id)))
  WHERE (pay.created_at > (now() - '90 days'::interval));


grant delete on table "public"."change_order_items" to "anon";

grant insert on table "public"."change_order_items" to "anon";

grant references on table "public"."change_order_items" to "anon";

grant select on table "public"."change_order_items" to "anon";

grant trigger on table "public"."change_order_items" to "anon";

grant truncate on table "public"."change_order_items" to "anon";

grant update on table "public"."change_order_items" to "anon";

grant delete on table "public"."change_order_items" to "authenticated";

grant insert on table "public"."change_order_items" to "authenticated";

grant references on table "public"."change_order_items" to "authenticated";

grant select on table "public"."change_order_items" to "authenticated";

grant trigger on table "public"."change_order_items" to "authenticated";

grant truncate on table "public"."change_order_items" to "authenticated";

grant update on table "public"."change_order_items" to "authenticated";

grant delete on table "public"."change_order_items" to "service_role";

grant insert on table "public"."change_order_items" to "service_role";

grant references on table "public"."change_order_items" to "service_role";

grant select on table "public"."change_order_items" to "service_role";

grant trigger on table "public"."change_order_items" to "service_role";

grant truncate on table "public"."change_order_items" to "service_role";

grant update on table "public"."change_order_items" to "service_role";

grant delete on table "public"."change_orders" to "anon";

grant insert on table "public"."change_orders" to "anon";

grant references on table "public"."change_orders" to "anon";

grant select on table "public"."change_orders" to "anon";

grant trigger on table "public"."change_orders" to "anon";

grant truncate on table "public"."change_orders" to "anon";

grant update on table "public"."change_orders" to "anon";

grant delete on table "public"."change_orders" to "authenticated";

grant insert on table "public"."change_orders" to "authenticated";

grant references on table "public"."change_orders" to "authenticated";

grant select on table "public"."change_orders" to "authenticated";

grant trigger on table "public"."change_orders" to "authenticated";

grant truncate on table "public"."change_orders" to "authenticated";

grant update on table "public"."change_orders" to "authenticated";

grant delete on table "public"."change_orders" to "service_role";

grant insert on table "public"."change_orders" to "service_role";

grant references on table "public"."change_orders" to "service_role";

grant select on table "public"."change_orders" to "service_role";

grant trigger on table "public"."change_orders" to "service_role";

grant truncate on table "public"."change_orders" to "service_role";

grant update on table "public"."change_orders" to "service_role";

grant delete on table "public"."generated_documents" to "anon";

grant insert on table "public"."generated_documents" to "anon";

grant references on table "public"."generated_documents" to "anon";

grant select on table "public"."generated_documents" to "anon";

grant trigger on table "public"."generated_documents" to "anon";

grant truncate on table "public"."generated_documents" to "anon";

grant update on table "public"."generated_documents" to "anon";

grant delete on table "public"."generated_documents" to "authenticated";

grant insert on table "public"."generated_documents" to "authenticated";

grant references on table "public"."generated_documents" to "authenticated";

grant select on table "public"."generated_documents" to "authenticated";

grant trigger on table "public"."generated_documents" to "authenticated";

grant truncate on table "public"."generated_documents" to "authenticated";

grant update on table "public"."generated_documents" to "authenticated";

grant delete on table "public"."generated_documents" to "service_role";

grant insert on table "public"."generated_documents" to "service_role";

grant references on table "public"."generated_documents" to "service_role";

grant select on table "public"."generated_documents" to "service_role";

grant trigger on table "public"."generated_documents" to "service_role";

grant truncate on table "public"."generated_documents" to "service_role";

grant update on table "public"."generated_documents" to "service_role";

grant delete on table "public"."invoice_payments" to "anon";

grant insert on table "public"."invoice_payments" to "anon";

grant references on table "public"."invoice_payments" to "anon";

grant select on table "public"."invoice_payments" to "anon";

grant trigger on table "public"."invoice_payments" to "anon";

grant truncate on table "public"."invoice_payments" to "anon";

grant update on table "public"."invoice_payments" to "anon";

grant delete on table "public"."invoice_payments" to "authenticated";

grant insert on table "public"."invoice_payments" to "authenticated";

grant references on table "public"."invoice_payments" to "authenticated";

grant select on table "public"."invoice_payments" to "authenticated";

grant trigger on table "public"."invoice_payments" to "authenticated";

grant truncate on table "public"."invoice_payments" to "authenticated";

grant update on table "public"."invoice_payments" to "authenticated";

grant delete on table "public"."invoice_payments" to "service_role";

grant insert on table "public"."invoice_payments" to "service_role";

grant references on table "public"."invoice_payments" to "service_role";

grant select on table "public"."invoice_payments" to "service_role";

grant trigger on table "public"."invoice_payments" to "service_role";

grant truncate on table "public"."invoice_payments" to "service_role";

grant update on table "public"."invoice_payments" to "service_role";

grant delete on table "public"."payment_schedule_allocations" to "anon";

grant insert on table "public"."payment_schedule_allocations" to "anon";

grant references on table "public"."payment_schedule_allocations" to "anon";

grant select on table "public"."payment_schedule_allocations" to "anon";

grant trigger on table "public"."payment_schedule_allocations" to "anon";

grant truncate on table "public"."payment_schedule_allocations" to "anon";

grant update on table "public"."payment_schedule_allocations" to "anon";

grant delete on table "public"."payment_schedule_allocations" to "authenticated";

grant insert on table "public"."payment_schedule_allocations" to "authenticated";

grant references on table "public"."payment_schedule_allocations" to "authenticated";

grant select on table "public"."payment_schedule_allocations" to "authenticated";

grant trigger on table "public"."payment_schedule_allocations" to "authenticated";

grant truncate on table "public"."payment_schedule_allocations" to "authenticated";

grant update on table "public"."payment_schedule_allocations" to "authenticated";

grant delete on table "public"."payment_schedule_allocations" to "service_role";

grant insert on table "public"."payment_schedule_allocations" to "service_role";

grant references on table "public"."payment_schedule_allocations" to "service_role";

grant select on table "public"."payment_schedule_allocations" to "service_role";

grant trigger on table "public"."payment_schedule_allocations" to "service_role";

grant truncate on table "public"."payment_schedule_allocations" to "service_role";

grant update on table "public"."payment_schedule_allocations" to "service_role";

grant delete on table "public"."payment_schedule_items" to "anon";

grant insert on table "public"."payment_schedule_items" to "anon";

grant references on table "public"."payment_schedule_items" to "anon";

grant select on table "public"."payment_schedule_items" to "anon";

grant trigger on table "public"."payment_schedule_items" to "anon";

grant truncate on table "public"."payment_schedule_items" to "anon";

grant update on table "public"."payment_schedule_items" to "anon";

grant delete on table "public"."payment_schedule_items" to "authenticated";

grant insert on table "public"."payment_schedule_items" to "authenticated";

grant references on table "public"."payment_schedule_items" to "authenticated";

grant select on table "public"."payment_schedule_items" to "authenticated";

grant trigger on table "public"."payment_schedule_items" to "authenticated";

grant truncate on table "public"."payment_schedule_items" to "authenticated";

grant update on table "public"."payment_schedule_items" to "authenticated";

grant delete on table "public"."payment_schedule_items" to "service_role";

grant insert on table "public"."payment_schedule_items" to "service_role";

grant references on table "public"."payment_schedule_items" to "service_role";

grant select on table "public"."payment_schedule_items" to "service_role";

grant trigger on table "public"."payment_schedule_items" to "service_role";

grant truncate on table "public"."payment_schedule_items" to "service_role";

grant update on table "public"."payment_schedule_items" to "service_role";

grant delete on table "public"."payment_schedules" to "anon";

grant insert on table "public"."payment_schedules" to "anon";

grant references on table "public"."payment_schedules" to "anon";

grant select on table "public"."payment_schedules" to "anon";

grant trigger on table "public"."payment_schedules" to "anon";

grant truncate on table "public"."payment_schedules" to "anon";

grant update on table "public"."payment_schedules" to "anon";

grant delete on table "public"."payment_schedules" to "authenticated";

grant insert on table "public"."payment_schedules" to "authenticated";

grant references on table "public"."payment_schedules" to "authenticated";

grant select on table "public"."payment_schedules" to "authenticated";

grant trigger on table "public"."payment_schedules" to "authenticated";

grant truncate on table "public"."payment_schedules" to "authenticated";

grant update on table "public"."payment_schedules" to "authenticated";

grant delete on table "public"."payment_schedules" to "service_role";

grant insert on table "public"."payment_schedules" to "service_role";

grant references on table "public"."payment_schedules" to "service_role";

grant select on table "public"."payment_schedules" to "service_role";

grant trigger on table "public"."payment_schedules" to "service_role";

grant truncate on table "public"."payment_schedules" to "service_role";

grant update on table "public"."payment_schedules" to "service_role";

grant delete on table "public"."pdf_render_jobs" to "anon";

grant insert on table "public"."pdf_render_jobs" to "anon";

grant references on table "public"."pdf_render_jobs" to "anon";

grant select on table "public"."pdf_render_jobs" to "anon";

grant trigger on table "public"."pdf_render_jobs" to "anon";

grant truncate on table "public"."pdf_render_jobs" to "anon";

grant update on table "public"."pdf_render_jobs" to "anon";

grant delete on table "public"."pdf_render_jobs" to "authenticated";

grant insert on table "public"."pdf_render_jobs" to "authenticated";

grant references on table "public"."pdf_render_jobs" to "authenticated";

grant select on table "public"."pdf_render_jobs" to "authenticated";

grant trigger on table "public"."pdf_render_jobs" to "authenticated";

grant truncate on table "public"."pdf_render_jobs" to "authenticated";

grant update on table "public"."pdf_render_jobs" to "authenticated";

grant delete on table "public"."pdf_render_jobs" to "service_role";

grant insert on table "public"."pdf_render_jobs" to "service_role";

grant references on table "public"."pdf_render_jobs" to "service_role";

grant select on table "public"."pdf_render_jobs" to "service_role";

grant trigger on table "public"."pdf_render_jobs" to "service_role";

grant truncate on table "public"."pdf_render_jobs" to "service_role";

grant update on table "public"."pdf_render_jobs" to "service_role";

grant delete on table "public"."sov_items" to "anon";

grant insert on table "public"."sov_items" to "anon";

grant references on table "public"."sov_items" to "anon";

grant select on table "public"."sov_items" to "anon";

grant trigger on table "public"."sov_items" to "anon";

grant truncate on table "public"."sov_items" to "anon";

grant update on table "public"."sov_items" to "anon";

grant delete on table "public"."sov_items" to "authenticated";

grant insert on table "public"."sov_items" to "authenticated";

grant references on table "public"."sov_items" to "authenticated";

grant select on table "public"."sov_items" to "authenticated";

grant trigger on table "public"."sov_items" to "authenticated";

grant truncate on table "public"."sov_items" to "authenticated";

grant update on table "public"."sov_items" to "authenticated";

grant delete on table "public"."sov_items" to "service_role";

grant insert on table "public"."sov_items" to "service_role";

grant references on table "public"."sov_items" to "service_role";

grant select on table "public"."sov_items" to "service_role";

grant trigger on table "public"."sov_items" to "service_role";

grant truncate on table "public"."sov_items" to "service_role";

grant update on table "public"."sov_items" to "service_role";

grant delete on table "public"."work_orders" to "anon";

grant insert on table "public"."work_orders" to "anon";

grant references on table "public"."work_orders" to "anon";

grant select on table "public"."work_orders" to "anon";

grant trigger on table "public"."work_orders" to "anon";

grant truncate on table "public"."work_orders" to "anon";

grant update on table "public"."work_orders" to "anon";

grant delete on table "public"."work_orders" to "authenticated";

grant insert on table "public"."work_orders" to "authenticated";

grant references on table "public"."work_orders" to "authenticated";

grant select on table "public"."work_orders" to "authenticated";

grant trigger on table "public"."work_orders" to "authenticated";

grant truncate on table "public"."work_orders" to "authenticated";

grant update on table "public"."work_orders" to "authenticated";

grant delete on table "public"."work_orders" to "service_role";

grant insert on table "public"."work_orders" to "service_role";

grant references on table "public"."work_orders" to "service_role";

grant select on table "public"."work_orders" to "service_role";

grant trigger on table "public"."work_orders" to "service_role";

grant truncate on table "public"."work_orders" to "service_role";

grant update on table "public"."work_orders" to "service_role";


  create policy "generated_documents_read_auth"
  on "public"."generated_documents"
  as permissive
  for select
  to authenticated
using (true);



  create policy "generated_documents_update_auth"
  on "public"."generated_documents"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "generated_documents_write_auth"
  on "public"."generated_documents"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Anyone can view measurement units"
  on "public"."measurement_units"
  as permissive
  for select
  to public
using (true);



  create policy "pdf_render_jobs_read_auth"
  on "public"."pdf_render_jobs"
  as permissive
  for select
  to authenticated
using (true);



  create policy "pdf_render_jobs_update_auth"
  on "public"."pdf_render_jobs"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "pdf_render_jobs_write_auth"
  on "public"."pdf_render_jobs"
  as permissive
  for insert
  to authenticated
with check (true);


CREATE TRIGGER update_bid_packages_updated_at BEFORE UPDATE ON public.bid_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_recalc_co_totals_del AFTER DELETE ON public.change_order_items FOR EACH ROW EXECUTE FUNCTION public.recalc_change_order_totals();

CREATE TRIGGER trg_recalc_co_totals_ins AFTER INSERT ON public.change_order_items FOR EACH ROW EXECUTE FUNCTION public.recalc_change_order_totals();

CREATE TRIGGER trg_recalc_co_totals_upd AFTER UPDATE ON public.change_order_items FOR EACH ROW EXECUTE FUNCTION public.recalc_change_order_totals();

CREATE TRIGGER trg_change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_generate_co_number BEFORE INSERT ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.generate_change_order_number();

CREATE TRIGGER update_cost_codes_updated_at BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_customer_payments_status AFTER INSERT OR DELETE OR UPDATE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status_from_payments();

CREATE TRIGGER trigger_auto_assign_labor_cost_code BEFORE INSERT ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_labor_cost_code();

CREATE TRIGGER update_day_card_jobs_updated_at BEFORE UPDATE ON public.day_card_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER day_cards_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.log_activity('log');

CREATE TRIGGER update_day_cards_updated_at BEFORE UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_company_id_from_project BEFORE INSERT OR UPDATE OF project_id, company_id ON public.generated_documents FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_id_from_project();

CREATE TRIGGER trg_generated_documents_updated_at BEFORE UPDATE ON public.generated_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_invoice_items_calc_line_total BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_items_calc_line_total();

CREATE TRIGGER trg_invoice_items_recalc_invoice AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_items_recalc_invoice();

CREATE TRIGGER trg_invoice_payments_status AFTER INSERT OR DELETE OR UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status_from_payments();

CREATE TRIGGER trg_generate_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number_trg();

CREATE TRIGGER trg_sync_invoice_status BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status();

CREATE TRIGGER trigger_mark_time_logs_paid_on_pay_run AFTER UPDATE OF status ON public.labor_pay_runs FOR EACH ROW EXECUTE FUNCTION public.mark_time_logs_paid_on_pay_run();

CREATE TRIGGER trg_payment_schedule_allocations_updated_at BEFORE UPDATE ON public.payment_schedule_allocations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_payment_schedule_items_recalc_amount AFTER INSERT OR UPDATE OF percent_of_contract, fixed_amount ON public.payment_schedule_items FOR EACH ROW EXECUTE FUNCTION public.tg_payment_schedule_items_recalc_amount();

CREATE TRIGGER trg_payment_schedule_items_updated_at BEFORE UPDATE ON public.payment_schedule_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_pdf_render_jobs_updated_at BEFORE UPDATE ON public.pdf_render_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_calculate_scope_item_line_total BEFORE INSERT OR UPDATE ON public.scope_block_cost_items FOR EACH ROW EXECUTE FUNCTION public.calculate_scope_item_line_total();

CREATE TRIGGER update_scope_block_cost_items_updated_at BEFORE UPDATE ON public.scope_block_cost_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scope_blocks_updated_at BEFORE UPDATE ON public.scope_blocks FOR EACH ROW EXECUTE FUNCTION public.update_scope_block_updated_at();

CREATE TRIGGER trg_sov_items_updated_at BEFORE UPDATE ON public.sov_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER update_time_log_allocations_updated_at BEFORE UPDATE ON public.time_log_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER time_logs_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.log_activity('time_log');

CREATE TRIGGER trigger_auto_populate_company_id_time_logs BEFORE INSERT ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.auto_populate_company_id();

CREATE TRIGGER trigger_auto_populate_worker_rate_time_logs BEFORE INSERT ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.auto_populate_worker_rate();

CREATE TRIGGER trigger_prevent_paid_time_log_mutation BEFORE UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_paid_time_log_mutation();

CREATE TRIGGER trigger_sync_time_log_to_work_schedule BEFORE UPDATE ON public.time_logs FOR EACH ROW WHEN ((new.source_schedule_id IS NOT NULL)) EXECUTE FUNCTION public.sync_time_log_to_work_schedule();

CREATE TRIGGER trg_update_cost_paid_on_payment_item_delete AFTER DELETE ON public.vendor_payment_items FOR EACH ROW EXECUTE FUNCTION public.update_cost_paid_amount();

CREATE TRIGGER trg_update_cost_paid_on_payment_item_insert AFTER INSERT ON public.vendor_payment_items FOR EACH ROW EXECUTE FUNCTION public.update_cost_paid_amount();

CREATE TRIGGER trg_update_cost_paid_on_payment_item_update AFTER UPDATE ON public.vendor_payment_items FOR EACH ROW EXECUTE FUNCTION public.update_cost_paid_amount();

CREATE TRIGGER trigger_mark_costs_paid_on_vendor_payment AFTER INSERT OR UPDATE OF status ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.mark_costs_paid_on_vendor_payment();

CREATE TRIGGER set_work_orders_updated_at_trigger BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_work_orders_updated_at();

CREATE TRIGGER update_work_orders_timestamp BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER work_schedules_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.log_activity('work_schedule');


