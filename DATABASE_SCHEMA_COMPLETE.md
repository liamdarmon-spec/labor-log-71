# Complete Database Schema Dump
Generated: 2025-12-03

## Table of Contents
1. [Tables](#tables)
2. [Views](#views)
3. [Functions](#functions)
4. [Triggers](#triggers)
5. [Indexes](#indexes)
6. [RLS Policies](#rls-policies)

---

## Tables

### activity_log
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| entity_type | text | NO | - |
| entity_id | uuid | NO | - |
| action | text | NO | - |
| actor_id | uuid | YES | - |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |

### archived_daily_logs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| original_id | uuid | NO | - |
| date | date | NO | - |
| worker_id | uuid | NO | - |
| project_id | uuid | NO | - |
| hours_worked | numeric | NO | - |
| notes | text | YES | - |
| trade_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| created_by | uuid | YES | - |
| archived_at | timestamp with time zone | NO | now() |
| archived_by | uuid | YES | - |

### bid_invitations
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| bid_package_id | uuid | NO | - |
| sub_id | uuid | NO | - |
| status | text | YES | 'invited'::text |
| invited_at | timestamp with time zone | NO | now() |
| responded_at | timestamp with time zone | YES | - |
| notes | text | YES | - |

### bid_packages
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| title | text | NO | - |
| scope_summary | text | YES | - |
| cost_code_ids | ARRAY | YES | - |
| bid_due_date | date | YES | - |
| desired_start_date | date | YES | - |
| attachments | jsonb | YES | - |
| status | text | YES | 'draft'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### budget_revisions
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| revision_number | integer | NO | - |
| revision_type | text | NO | - |
| description | text | YES | - |
| previous_budget | numeric | YES | - |
| revision_amount | numeric | NO | - |
| new_budget | numeric | NO | - |
| status | text | YES | 'pending'::text |
| notes | text | YES | - |
| approved_by | uuid | YES | - |
| approved_at | timestamp with time zone | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |

### companies
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| created_at | timestamp with time zone | YES | now() |

### cost_codes
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | text | NO | - |
| name | text | NO | - |
| category | text | NO | - |
| is_active | boolean | NO | true |
| trade_id | uuid | YES | - |
| default_trade_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### cost_entries
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| cost_code_id | uuid | YES | - |
| entry_type | text | NO | - |
| entry_date | date | NO | - |
| quantity | numeric | YES | - |
| unit | text | YES | - |
| unit_cost | numeric | YES | - |
| total_cost | numeric | NO | - |
| description | text | YES | - |
| vendor_name | text | YES | - |
| invoice_number | text | YES | - |
| source_type | text | YES | - |
| source_id | uuid | YES | - |
| notes | text | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### costs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| company_id | uuid | YES | - |
| vendor_type | text | YES | - |
| vendor_id | uuid | YES | - |
| category | text | NO | - |
| cost_code_id | uuid | NO | - |
| description | text | NO | - |
| amount | numeric | NO | 0 |
| quantity | numeric | YES | - |
| unit_cost | numeric | YES | - |
| date_incurred | date | NO | CURRENT_DATE |
| status | text | NO | 'unpaid'::text |
| payment_id | uuid | YES | - |
| paid_date | date | YES | - |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### customer_payments
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| invoice_id | uuid | YES | - |
| payment_date | date | NO | CURRENT_DATE |
| amount | numeric | NO | - |
| payment_method | text | YES | - |
| reference_number | text | YES | - |
| notes | text | YES | - |
| applied_to_retention | numeric | YES | 0 |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### daily_logs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| date | date | NO | CURRENT_DATE |
| worker_id | uuid | NO | - |
| project_id | uuid | NO | - |
| hours_worked | numeric | NO | - |
| notes | text | YES | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | NO | - |
| schedule_id | uuid | YES | - |
| payment_status | text | YES | 'unpaid'::text |
| paid_amount | numeric | YES | 0 |
| payment_id | uuid | YES | - |
| last_synced_at | timestamp with time zone | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |

### day_card_jobs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| day_card_id | uuid | NO | - |
| project_id | uuid | NO | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | YES | - |
| hours | numeric | NO | 0 |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### day_cards
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| worker_id | uuid | NO | - |
| date | date | NO | - |
| scheduled_hours | numeric | YES | 0 |
| logged_hours | numeric | YES | 0 |
| status | text | NO | 'scheduled'::text |
| pay_rate | numeric | YES | - |
| pay_status | text | YES | 'unpaid'::text |
| company_id | uuid | YES | - |
| notes | text | YES | - |
| metadata | jsonb | YES | '{}'::jsonb |
| lifecycle_status | text | YES | 'scheduled'::text |
| locked | boolean | YES | false |
| approved_at | timestamp with time zone | YES | - |
| approved_by | uuid | YES | - |
| paid_at | timestamp with time zone | YES | - |
| archived_at | timestamp with time zone | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### documents
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | YES | - |
| file_name | text | NO | - |
| file_url | text | NO | - |
| file_size | bigint | YES | - |
| size_bytes | bigint | YES | - |
| mime_type | text | YES | - |
| storage_path | text | YES | - |
| title | text | YES | - |
| description | text | YES | - |
| doc_type | text | YES | - |
| document_type | text | YES | - |
| tags | ARRAY | YES | - |
| vendor_name | text | YES | - |
| amount | numeric | YES | - |
| document_date | date | YES | - |
| cost_code_id | uuid | YES | - |
| owner_type | text | YES | - |
| owner_id | uuid | YES | - |
| source | text | YES | - |
| status | text | YES | - |
| extracted_text | text | YES | - |
| auto_classified | boolean | YES | false |
| ai_status | text | YES | - |
| ai_doc_type | text | YES | - |
| ai_title | text | YES | - |
| ai_summary | text | YES | - |
| ai_counterparty_name | text | YES | - |
| ai_total_amount | numeric | YES | - |
| ai_currency | text | YES | 'USD'::text |
| ai_effective_date | date | YES | - |
| ai_expiration_date | date | YES | - |
| ai_tags | ARRAY | YES | - |
| ai_extracted_data | jsonb | YES | - |
| ai_last_run_at | timestamp with time zone | YES | - |
| ai_last_run_status | text | YES | - |
| uploaded_by | uuid | YES | - |
| uploaded_at | timestamp with time zone | YES | now() |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### entity_change_log
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| entity_type | text | NO | - |
| entity_id | uuid | NO | - |
| version | integer | NO | - |
| change_type | text | NO | - |
| change_summary | text | YES | - |
| changes | jsonb | YES | '{}'::jsonb |
| changed_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |

### estimate_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| estimate_id | uuid | NO | - |
| cost_code_id | uuid | NO | - |
| trade_id | uuid | YES | - |
| description | text | NO | - |
| category | text | YES | - |
| quantity | numeric | NO | 1 |
| unit | text | YES | 'ea'::text |
| unit_price | numeric | NO | 0 |
| line_total | numeric | NO | 0 |
| planned_hours | numeric | YES | - |
| is_allowance | boolean | YES | false |
| area_name | text | YES | - |
| scope_group | text | YES | - |
| group_label | text | YES | - |
| created_at | timestamp with time zone | YES | now() |

### estimates
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| title | text | NO | - |
| status | text | NO | 'draft'::text |
| version | integer | YES | 1 |
| parent_estimate_id | uuid | YES | - |
| margin_percent | numeric | YES | 0 |
| subtotal_amount | numeric | YES | 0 |
| tax_amount | numeric | YES | 0 |
| total_amount | numeric | YES | 0 |
| is_budget_source | boolean | YES | false |
| settings | jsonb | YES | '{}'::jsonb |
| change_log | jsonb | YES | '[]'::jsonb |
| approved_by | uuid | YES | - |
| approved_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### invitations
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| email | text | NO | - |
| role | app_role | NO | 'field_user'::app_role |
| used | boolean | YES | false |
| used_at | timestamp with time zone | YES | - |
| invited_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |

### invoice_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| invoice_id | uuid | NO | - |
| cost_code_id | uuid | YES | - |
| description | text | NO | - |
| category | text | YES | - |
| quantity | numeric | NO | 1 |
| unit | text | YES | 'ea'::text |
| unit_price | numeric | NO | 0 |
| line_total | numeric | NO | 0 |
| created_at | timestamp with time zone | YES | now() |

### invoices
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| invoice_number | text | NO | - |
| client_name | text | YES | - |
| status | text | NO | 'draft'::text |
| issue_date | date | NO | CURRENT_DATE |
| due_date | date | YES | - |
| payment_terms | text | YES | 'Net 30'::text |
| subtotal_amount | numeric | YES | 0 |
| tax_amount | numeric | YES | 0 |
| total_amount | numeric | YES | 0 |
| retention_percent | numeric | YES | 10 |
| retention_amount | numeric | YES | 0 |
| previously_invoiced | numeric | YES | 0 |
| balance_to_finish | numeric | YES | 0 |
| sov_based | boolean | YES | false |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### labor_pay_run_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| pay_run_id | uuid | NO | - |
| time_log_id | uuid | NO | - |
| worker_id | uuid | YES | - |
| hours | numeric | YES | - |
| rate | numeric | YES | - |
| amount | numeric | NO | - |
| created_at | timestamp with time zone | YES | now() |

### labor_pay_runs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| payer_company_id | uuid | YES | - |
| payee_company_id | uuid | YES | - |
| date_range_start | date | NO | - |
| date_range_end | date | NO | - |
| total_hours | numeric | YES | 0 |
| total_amount | numeric | YES | 0 |
| status | text | YES | 'draft'::text |
| payment_date | date | YES | - |
| payment_method | text | YES | - |
| payment_reference | text | YES | - |
| notes | text | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### material_receipts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| vendor | text | NO | - |
| vendor_id | uuid | YES | - |
| date | date | NO | CURRENT_DATE |
| receipt_date | date | NO | - |
| subtotal | numeric | NO | 0 |
| tax | numeric | YES | 0 |
| shipping | numeric | YES | 0 |
| total | numeric | NO | 0 |
| notes | text | YES | - |
| cost_code_id | uuid | YES | - |
| linked_document_id | uuid | YES | - |
| receipt_document_id | uuid | YES | - |
| linked_cost_id | uuid | YES | - |
| auto_classified | boolean | YES | false |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### material_vendors
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| company_name | text | YES | - |
| email | text | YES | - |
| phone | text | YES | - |
| trade_id | uuid | YES | - |
| default_cost_code_id | uuid | YES | - |
| notes | text | YES | - |
| active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### measurement_units
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | text | NO | - |
| label | text | NO | - |
| category | text | NO | 'general'::text |
| sort_order | integer | NO | 100 |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### payments
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| company_id | uuid | YES | - |
| start_date | date | NO | - |
| end_date | date | NO | - |
| amount | numeric | NO | 0 |
| payment_date | date | NO | CURRENT_DATE |
| paid_by | text | NO | - |
| paid_via | text | YES | - |
| notes | text | YES | - |
| reimbursement_status | text | YES | - |
| reimbursement_date | date | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### project_budget_groups
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_budget_id | uuid | NO | - |
| name | text | NO | - |
| description | text | YES | - |
| sort_order | integer | NO | 0 |
| client_visible | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### project_budget_lines
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| project_budget_id | uuid | YES | - |
| group_id | uuid | YES | - |
| cost_code_id | uuid | NO | - |
| scope_type | text | YES | 'base'::text |
| line_type | text | YES | - |
| category | text | YES | - |
| description_internal | text | YES | - |
| description_client | text | YES | - |
| qty | numeric | YES | 1 |
| unit | text | YES | 'ea'::text |
| unit_cost | numeric | YES | 0 |
| budget_amount | numeric | NO | 0 |
| budget_hours | numeric | YES | - |
| markup_pct | numeric | YES | - |
| tax_pct | numeric | YES | - |
| allowance_cap | numeric | YES | - |
| is_optional | boolean | YES | false |
| is_allowance | boolean | YES | false |
| client_visible | boolean | YES | true |
| sort_order | integer | YES | 0 |
| internal_notes | text | YES | - |
| change_order_id | uuid | YES | - |
| source_estimate_id | uuid | YES | - |
| actual_cost | numeric | YES | 0 |
| actual_hours | numeric | YES | 0 |
| variance | numeric | YES | 0 |
| percent_complete | numeric | YES | 0 |
| forecast_at_completion | numeric | YES | 0 |
| estimated_hours | numeric | YES | - |
| estimated_cost | numeric | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### project_budgets
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| name | text | YES | 'Main Budget'::text |
| status | text | YES | 'draft'::text |
| default_markup_pct | numeric | YES | 0 |
| default_tax_pct | numeric | YES | 0 |
| notes | text | YES | - |
| baseline_estimate_id | uuid | YES | - |
| labor_budget | numeric | YES | 0 |
| subs_budget | numeric | YES | 0 |
| materials_budget | numeric | YES | 0 |
| other_budget | numeric | YES | 0 |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### project_todos
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | YES | - |
| title | text | NO | - |
| description | text | YES | - |
| status | text | YES | 'open'::text |
| priority | text | YES | 'medium'::text |
| task_type | text | YES | 'general'::text |
| due_date | date | YES | - |
| assigned_to | uuid | YES | - |
| created_by | uuid | YES | - |
| completed_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### projects
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_name | text | NO | - |
| client_name | text | YES | - |
| address | text | YES | - |
| status | text | YES | 'active'::text |
| budget | numeric | YES | 0 |
| company_id | uuid | YES | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| retention_percent | numeric | YES | 10 |
| notes | text | YES | - |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### proposal_events
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| proposal_id | uuid | NO | - |
| event_type | text | NO | - |
| actor_name | text | YES | - |
| actor_email | text | YES | - |
| actor_ip | text | YES | - |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |

### proposal_sections
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| proposal_id | uuid | NO | - |
| section_type | text | NO | - |
| title | text | YES | - |
| content | jsonb | YES | '{}'::jsonb |
| sort_order | integer | YES | 0 |
| visible | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### proposal_settings
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| company_name | text | YES | - |
| company_logo_url | text | YES | - |
| company_address | text | YES | - |
| company_phone | text | YES | - |
| company_email | text | YES | - |
| company_website | text | YES | - |
| license_number | text | YES | - |
| default_terms | text | YES | - |
| default_payment_terms | text | YES | - |
| default_warranty | text | YES | - |
| primary_color | text | YES | '#2563eb'::text |
| secondary_color | text | YES | '#64748b'::text |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### proposal_templates
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| description | text | YES | - |
| sections | jsonb | YES | '[]'::jsonb |
| default_terms | text | YES | - |
| default_payment_terms | text | YES | - |
| default_warranty | text | YES | - |
| is_default | boolean | YES | false |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### proposals
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| title | text | NO | - |
| status | text | YES | 'draft'::text |
| version | integer | YES | 1 |
| estimate_id | uuid | YES | - |
| template_id | uuid | YES | - |
| client_name | text | YES | - |
| client_email | text | YES | - |
| client_phone | text | YES | - |
| client_address | text | YES | - |
| intro_text | text | YES | - |
| terms_text | text | YES | - |
| payment_terms | text | YES | - |
| warranty_text | text | YES | - |
| valid_until | date | YES | - |
| public_token | text | YES | - |
| acceptance_status | text | YES | 'pending'::text |
| acceptance_date | timestamp with time zone | YES | - |
| accepted_by_name | text | YES | - |
| accepted_by_email | text | YES | - |
| acceptance_notes | text | YES | - |
| client_signature | text | YES | - |
| acceptance_ip | text | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### scheduled_shifts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| worker_id | uuid | NO | - |
| project_id | uuid | NO | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | YES | - |
| scheduled_date | date | NO | - |
| scheduled_hours | numeric | NO | 8 |
| notes | text | YES | - |
| status | text | YES | 'scheduled'::text |
| converted_to_log | boolean | YES | false |
| last_synced_at | timestamp with time zone | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |

### scope_block_cost_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| scope_block_id | uuid | NO | - |
| cost_code_id | uuid | NO | - |
| description | text | YES | - |
| category | text | YES | 'labor'::text |
| quantity | numeric | YES | 1 |
| unit | text | YES | 'ea'::text |
| unit_price | numeric | YES | 0 |
| markup_percent | numeric | YES | 0 |
| line_total | numeric | YES | 0 |
| sort_order | integer | YES | 0 |
| notes | text | YES | - |
| area_label | text | YES | - |
| group_label | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### scope_blocks
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| entity_type | text | NO | - |
| entity_id | uuid | NO | - |
| title | text | YES | - |
| description | text | YES | - |
| sort_order | integer | YES | 0 |
| is_visible | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### schedule_of_values
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| cost_code_id | uuid | YES | - |
| description | text | NO | - |
| scheduled_value | numeric | NO | 0 |
| previous_applications | numeric | YES | 0 |
| current_application | numeric | YES | 0 |
| materials_stored | numeric | YES | 0 |
| sort_order | integer | YES | 0 |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### sub_contracts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | uuid | NO | - |
| sub_id | uuid | NO | - |
| contract_amount | numeric | NO | 0 |
| start_date | date | YES | - |
| end_date | date | YES | - |
| status | text | YES | 'active'::text |
| scope_description | text | YES | - |
| retention_percent | numeric | YES | 10 |
| notes | text | YES | - |
| signed_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### sub_invoices
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| sub_id | uuid | NO | - |
| project_id | uuid | NO | - |
| sub_contract_id | uuid | YES | - |
| invoice_number | text | YES | - |
| invoice_date | date | NO | CURRENT_DATE |
| amount | numeric | NO | 0 |
| retention_held | numeric | YES | 0 |
| net_payable | numeric | YES | 0 |
| status | text | YES | 'pending'::text |
| cost_code_id | uuid | YES | - |
| notes | text | YES | - |
| paid_date | date | YES | - |
| payment_reference | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### sub_scheduled_shifts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| sub_id | uuid | NO | - |
| project_id | uuid | NO | - |
| scheduled_date | date | NO | - |
| description | text | YES | - |
| status | text | YES | 'scheduled'::text |
| notes | text | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### subs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| company_name | text | YES | - |
| trade_id | uuid | YES | - |
| email | text | YES | - |
| phone | text | YES | - |
| default_rate | numeric | YES | - |
| notes | text | YES | - |
| is_active | boolean | YES | true |
| compliance_coi_expiration | date | YES | - |
| compliance_w9_received | boolean | YES | false |
| compliance_license_expiration | date | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### time_log_allocations
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| day_card_id | uuid | NO | - |
| project_id | uuid | NO | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | YES | - |
| hours | numeric | NO | 0 |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### time_logs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| source_schedule_id | uuid | YES | - |
| worker_id | uuid | NO | - |
| company_id | uuid | YES | - |
| project_id | uuid | NO | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | YES | - |
| date | date | NO | CURRENT_DATE |
| hours_worked | numeric | NO | 0 |
| hourly_rate | numeric | YES | - |
| labor_cost | numeric | YES | - |
| notes | text | YES | - |
| payment_status | text | YES | 'unpaid'::text |
| paid_amount | numeric | YES | 0 |
| last_synced_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### trades
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| default_labor_cost_code_id | uuid | YES | - |
| default_sub_cost_code_id | uuid | YES | - |
| default_materials_cost_code_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### user_roles
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| role | app_role | NO | 'field_user'::app_role |
| created_at | timestamp with time zone | YES | now() |

### vendor_payment_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| payment_id | uuid | NO | - |
| cost_id | uuid | NO | - |
| amount | numeric | NO | - |
| created_at | timestamp with time zone | YES | now() |

### vendor_payments
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| company_id | uuid | YES | - |
| vendor_type | text | NO | - |
| vendor_id | uuid | YES | - |
| payment_date | date | NO | CURRENT_DATE |
| amount | numeric | NO | 0 |
| method | text | YES | - |
| reference | text | YES | - |
| notes | text | YES | - |
| status | text | YES | 'recorded'::text |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### work_schedules
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| worker_id | uuid | NO | - |
| project_id | uuid | NO | - |
| company_id | uuid | YES | - |
| trade_id | uuid | YES | - |
| cost_code_id | uuid | YES | - |
| scheduled_date | date | NO | - |
| scheduled_hours | numeric | NO | 8 |
| notes | text | YES | - |
| status | text | YES | 'planned'::text |
| converted_to_timelog | boolean | YES | false |
| last_synced_at | timestamp with time zone | YES | - |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### workers
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| hourly_rate | numeric | YES | - |
| trade_id | uuid | YES | - |
| company_id | uuid | YES | - |
| is_active | boolean | YES | true |
| phone | text | YES | - |
| email | text | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

---

## Views

### company_payroll_summary
```sql
SELECT c.id AS company_id,
    c.name AS company_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours,
    sum(CASE WHEN ((dc.pay_status = 'unpaid') AND (dc.logged_hours > 0)) 
        THEN (dc.logged_hours * dc.pay_rate) ELSE 0 END) AS total_unpaid,
    sum(CASE WHEN ((dc.pay_status = 'paid') AND (dc.logged_hours > 0)) 
        THEN (dc.logged_hours * dc.pay_rate) ELSE 0 END) AS total_paid,
    max(dc.date) AS last_activity_date
FROM (companies c LEFT JOIN day_cards dc ON ((dc.company_id = c.id)))
WHERE (dc.logged_hours > 0)
GROUP BY c.id, c.name;
```

### cost_code_actuals
```sql
SELECT cc.id AS cost_code_id, cc.code, cc.name AS cost_code_name, cc.category,
    tla.project_id, p.project_name,
    sum(tla.hours) AS actual_hours,
    sum((tla.hours * dc.pay_rate)) AS actual_cost,
    count(DISTINCT dc.worker_id) AS worker_count
FROM (((cost_codes cc
    LEFT JOIN time_log_allocations tla ON ((tla.cost_code_id = cc.id)))
    LEFT JOIN day_cards dc ON ((dc.id = tla.day_card_id)))
    LEFT JOIN projects p ON ((p.id = tla.project_id)))
WHERE (dc.logged_hours > 0)
GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;
```

### day_cards_with_details
```sql
SELECT dc.id, dc.worker_id, dc.date, dc.scheduled_hours, dc.logged_hours,
    dc.status, dc.pay_rate, dc.pay_status, dc.company_id, dc.notes,
    dc.metadata, dc.created_at, dc.updated_at, dc.created_by, dc.locked,
    w.name AS worker_name, w.hourly_rate AS worker_default_rate,
    t.name AS trade_name,
    array_agg(jsonb_build_object('id', dcj.id, 'project_id', dcj.project_id,
        'project_name', p.project_name, 'trade_id', dcj.trade_id,
        'cost_code_id', dcj.cost_code_id, 'hours', dcj.hours, 'notes', dcj.notes)
        ORDER BY dcj.created_at) FILTER (WHERE (dcj.id IS NOT NULL)) AS jobs
FROM ((((day_cards dc
    LEFT JOIN workers w ON ((dc.worker_id = w.id)))
    LEFT JOIN trades t ON ((w.trade_id = t.id)))
    LEFT JOIN day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
    LEFT JOIN projects p ON ((dcj.project_id = p.id)))
GROUP BY dc.id, w.name, w.hourly_rate, t.name;
```

### global_financial_summary_view
```sql
WITH labor_summary AS (
    SELECT COALESCE(sum(time_logs.labor_cost), 0) AS total_labor_cost,
        COALESCE(sum(CASE WHEN (payment_status = 'unpaid') THEN labor_cost ELSE 0 END), 0) AS unpaid_labor_cost
    FROM time_logs
), costs_summary AS (
    SELECT 
        COALESCE(sum(CASE WHEN (category = 'subs') THEN amount ELSE 0 END), 0) AS subs_cost,
        COALESCE(sum(CASE WHEN (category = 'subs' AND status = 'unpaid') THEN amount ELSE 0 END), 0) AS subs_unpaid,
        COALESCE(sum(CASE WHEN (category = 'materials') THEN amount ELSE 0 END), 0) AS materials_cost,
        COALESCE(sum(CASE WHEN (category = 'materials' AND status = 'unpaid') THEN amount ELSE 0 END), 0) AS materials_unpaid,
        COALESCE(sum(CASE WHEN (category = 'misc') THEN amount ELSE 0 END), 0) AS misc_cost,
        COALESCE(sum(CASE WHEN (category = 'misc' AND status = 'unpaid') THEN amount ELSE 0 END), 0) AS misc_unpaid
    FROM costs
), revenue_summary AS (
    SELECT COALESCE(sum(total_amount), 0) AS total_revenue
    FROM estimates WHERE (status = 'accepted')
), retention_summary AS (
    SELECT COALESCE(sum(retention_amount), 0) AS total_retention
    FROM invoices WHERE (status <> 'void')
)
SELECT r.total_revenue AS revenue,
    l.total_labor_cost AS labor_actual, l.unpaid_labor_cost AS labor_unpaid,
    c.subs_cost AS subs_actual, c.subs_unpaid,
    c.materials_cost AS materials_actual, c.materials_unpaid,
    c.misc_cost AS misc_actual, c.misc_unpaid,
    ret.total_retention AS retention_held,
    (l.total_labor_cost + c.subs_cost + c.materials_cost + c.misc_cost) AS total_costs,
    (r.total_revenue - (l.total_labor_cost + c.subs_cost + c.materials_cost + c.misc_cost)) AS profit,
    (l.unpaid_labor_cost + c.subs_unpaid + c.materials_unpaid + c.misc_unpaid) AS total_outstanding
FROM labor_summary l, costs_summary c, revenue_summary r, retention_summary ret;
```

### labor_actuals_by_cost_code
```sql
SELECT tl.project_id, tl.cost_code_id, cc.code AS cost_code, cc.name AS cost_code_name,
    sum(tl.hours_worked) AS actual_hours,
    sum(tl.labor_cost) AS actual_cost,
    count(DISTINCT tl.worker_id) AS worker_count
FROM (time_logs tl LEFT JOIN cost_codes cc ON ((tl.cost_code_id = cc.id)))
GROUP BY tl.project_id, tl.cost_code_id, cc.code, cc.name;
```

### material_actuals_by_project
```sql
SELECT p.id AS project_id, p.project_name, p.company_id,
    COALESCE(sum(c.amount), 0) AS material_actual,
    pb.materials_budget,
    (pb.materials_budget - COALESCE(sum(c.amount), 0)) AS material_variance,
    count(DISTINCT mr.id) AS receipt_count,
    count(DISTINCT c.vendor_id) AS vendor_count
FROM (((projects p
    LEFT JOIN costs c ON ((c.project_id = p.id AND c.category = 'materials' AND c.status <> 'void')))
    LEFT JOIN material_receipts mr ON ((mr.project_id = p.id)))
    LEFT JOIN project_budgets pb ON ((pb.project_id = p.id)))
GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;
```

### monthly_costs_view
```sql
SELECT date_trunc('month', date_incurred) AS month, category,
    count(*) AS cost_entry_count,
    sum(amount) AS total_cost,
    sum(CASE WHEN (status = 'paid') THEN amount ELSE 0 END) AS paid_cost,
    sum(CASE WHEN (status = 'unpaid') THEN amount ELSE 0 END) AS unpaid_cost
FROM costs
GROUP BY (date_trunc('month', date_incurred)), category
ORDER BY (date_trunc('month', date_incurred)) DESC, category;
```

### monthly_labor_costs_view
```sql
SELECT date_trunc('month', date) AS month,
    count(*) AS log_count,
    count(DISTINCT worker_id) AS unique_workers,
    sum(hours_worked) AS total_hours,
    sum(labor_cost) AS total_labor_cost,
    sum(CASE WHEN (payment_status = 'paid') THEN labor_cost ELSE 0 END) AS paid_labor_cost,
    sum(CASE WHEN (payment_status = 'unpaid') THEN labor_cost ELSE 0 END) AS unpaid_labor_cost
FROM time_logs
GROUP BY (date_trunc('month', date))
ORDER BY (date_trunc('month', date)) DESC;
```

### payment_labor_summary
```sql
SELECT pay.id AS payment_id, pay.start_date, pay.end_date, pay.payment_date, pay.paid_by,
    dl.worker_id, w.name AS worker_name, t.name AS worker_trade,
    dl.project_id, p.project_name,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * COALESCE(w.hourly_rate, 0))) AS labor_cost
FROM ((((payments pay
    JOIN daily_logs dl ON ((dl.payment_id = pay.id)))
    JOIN workers w ON ((dl.worker_id = w.id)))
    LEFT JOIN trades t ON ((w.trade_id = t.id)))
    LEFT JOIN projects p ON ((dl.project_id = p.id)))
GROUP BY pay.id, pay.start_date, pay.end_date, pay.payment_date, pay.paid_by,
    dl.worker_id, w.name, t.name, dl.project_id, p.project_name;
```

### project_activity_view
```sql
SELECT dl.id AS log_id, dl.project_id, p.project_name, dl.worker_id,
    w.name AS worker_name, dl.trade_id, t.name AS worker_trade,
    dl.date, dl.hours_worked, dl.notes, dl.schedule_id, dl.created_at,
    (dl.hours_worked * COALESCE(w.hourly_rate, 0)) AS cost
FROM (((daily_logs dl
    JOIN workers w ON ((dl.worker_id = w.id)))
    JOIN projects p ON ((dl.project_id = p.id)))
    LEFT JOIN trades t ON ((dl.trade_id = t.id)))
ORDER BY dl.created_at DESC;
```

### project_budget_vs_actual_view
```sql
SELECT p.id AS project_id, p.project_name, p.budget AS original_budget,
    pb.labor_budget, pb.subs_budget, pb.materials_budget, pb.other_budget,
    COALESCE(l.labor_actual, 0) AS labor_actual,
    COALESCE(c.subs_actual, 0) AS subs_actual,
    COALESCE(c.materials_actual, 0) AS materials_actual,
    COALESCE(c.other_actual, 0) AS other_actual,
    ((pb.labor_budget + pb.subs_budget + pb.materials_budget + pb.other_budget) -
     (COALESCE(l.labor_actual, 0) + COALESCE(c.subs_actual, 0) + 
      COALESCE(c.materials_actual, 0) + COALESCE(c.other_actual, 0))) AS remaining_budget
FROM (((projects p
    LEFT JOIN project_budgets pb ON ((pb.project_id = p.id)))
    LEFT JOIN (SELECT project_id, sum(labor_cost) AS labor_actual FROM time_logs GROUP BY project_id) l 
        ON ((l.project_id = p.id)))
    LEFT JOIN (SELECT project_id,
        sum(CASE WHEN (category = 'subs') THEN amount ELSE 0 END) AS subs_actual,
        sum(CASE WHEN (category = 'materials') THEN amount ELSE 0 END) AS materials_actual,
        sum(CASE WHEN (category NOT IN ('subs', 'materials')) THEN amount ELSE 0 END) AS other_actual
        FROM costs WHERE (status <> 'void') GROUP BY project_id) c 
        ON ((c.project_id = p.id)));
```

### project_costs_view
```sql
SELECT c.project_id, p.project_name, c.category,
    cc.id AS cost_code_id, cc.code AS cost_code, cc.name AS cost_code_name,
    count(*) AS entry_count,
    sum(c.amount) AS total_cost,
    sum(CASE WHEN (c.status = 'paid') THEN c.amount ELSE 0 END) AS paid_cost,
    sum(CASE WHEN (c.status = 'unpaid') THEN c.amount ELSE 0 END) AS unpaid_cost
FROM ((costs c
    JOIN projects p ON ((c.project_id = p.id)))
    LEFT JOIN cost_codes cc ON ((c.cost_code_id = cc.id)))
GROUP BY c.project_id, p.project_name, c.category, cc.id, cc.code, cc.name;
```

### project_dashboard_view
```sql
SELECT p.id AS project_id, p.project_name, p.client_name, p.status, p.budget,
    p.start_date, p.end_date,
    COALESCE(l.total_hours, 0) AS total_hours,
    COALESCE(l.labor_cost, 0) AS labor_cost,
    COALESCE(c.total_cost, 0) AS total_cost,
    (p.budget - COALESCE(l.labor_cost, 0) - COALESCE(c.total_cost, 0)) AS remaining_budget,
    l.worker_count
FROM ((projects p
    LEFT JOIN (SELECT project_id, sum(hours_worked) AS total_hours,
        sum(labor_cost) AS labor_cost, count(DISTINCT worker_id) AS worker_count
        FROM time_logs GROUP BY project_id) l ON ((l.project_id = p.id)))
    LEFT JOIN (SELECT project_id, sum(amount) AS total_cost
        FROM costs WHERE (status <> 'void') GROUP BY project_id) c ON ((c.project_id = p.id)));
```

### project_labor_summary
```sql
SELECT dc.id AS day_card_id, dcj.project_id,
    sum(dcj.hours) AS total_hours,
    sum((dcj.hours * dc.pay_rate)) AS total_cost,
    sum(CASE WHEN (dc.pay_status = 'unpaid') THEN (dcj.hours * dc.pay_rate) ELSE 0 END) AS unpaid_cost
FROM (day_cards dc JOIN day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
WHERE (dc.logged_hours > 0)
GROUP BY dc.id, dcj.project_id;
```

### project_labor_summary_view
```sql
SELECT tl.project_id,
    sum(tl.hours_worked) AS total_hours,
    sum(tl.labor_cost) AS total_cost,
    sum(CASE WHEN (tl.payment_status = 'unpaid') THEN tl.labor_cost ELSE 0 END) AS unpaid_cost,
    sum(CASE WHEN (tl.payment_status = 'paid') THEN tl.labor_cost ELSE 0 END) AS paid_cost,
    count(DISTINCT tl.worker_id) AS worker_count,
    count(*) AS log_count
FROM time_logs tl
GROUP BY tl.project_id;
```

### project_revenue_summary_view
```sql
SELECT i.project_id, sum(i.total_amount) AS billed_amount
FROM invoices i
WHERE (i.status <> 'void')
GROUP BY i.project_id;
```

### time_logs_with_meta_view
```sql
SELECT tl.id, tl.source_schedule_id, tl.worker_id, tl.company_id, tl.project_id,
    tl.trade_id, tl.cost_code_id, tl.date, tl.hours_worked, tl.hourly_rate,
    tl.labor_cost, tl.notes, tl.payment_status, tl.paid_amount,
    tl.last_synced_at, tl.created_at, tl.updated_at,
    w.name AS worker_name, tr.name AS trade_name,
    p.project_name, co.name AS company_name,
    cc.code AS cost_code, cc.name AS cost_code_name, cc.category AS cost_code_category
FROM (((((time_logs tl
    LEFT JOIN workers w ON ((tl.worker_id = w.id)))
    LEFT JOIN trades tr ON ((tl.trade_id = tr.id)))
    LEFT JOIN projects p ON ((tl.project_id = p.id)))
    LEFT JOIN companies co ON ((tl.company_id = co.id)))
    LEFT JOIN cost_codes cc ON ((tl.cost_code_id = cc.id)));
```

### work_schedule_grid_view
```sql
SELECT ws.id, ws.worker_id, ws.project_id, ws.company_id, ws.trade_id,
    ws.cost_code_id, ws.scheduled_date, ws.scheduled_hours, ws.notes,
    ws.status, ws.converted_to_timelog, ws.last_synced_at,
    ws.created_by, ws.created_at, ws.updated_at,
    w.name AS worker_name, w.hourly_rate AS worker_rate,
    t.name AS trade_name, p.project_name, c.name AS company_name,
    cc.code AS cost_code, cc.name AS cost_code_name
FROM (((((work_schedules ws
    LEFT JOIN workers w ON ((ws.worker_id = w.id)))
    LEFT JOIN trades t ON ((ws.trade_id = t.id)))
    LEFT JOIN projects p ON ((ws.project_id = p.id)))
    LEFT JOIN companies c ON ((ws.company_id = c.id)))
    LEFT JOIN cost_codes cc ON ((ws.cost_code_id = cc.id)));
```

### worker_day_summary
```sql
SELECT dc.id AS day_card_id, dc.worker_id, dc.date, dc.logged_hours,
    dc.pay_rate, dc.pay_status, w.name AS worker_name,
    array_agg(DISTINCT dcj.project_id) AS project_ids,
    array_agg(DISTINCT p.project_name) AS project_names
FROM (((day_cards dc
    JOIN workers w ON ((dc.worker_id = w.id)))
    LEFT JOIN day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
    LEFT JOIN projects p ON ((dcj.project_id = p.id)))
WHERE ((dc.logged_hours IS NOT NULL) AND (dc.logged_hours > 0))
GROUP BY dc.id, dc.worker_id, dc.date, dc.logged_hours, dc.pay_rate, dc.pay_status, w.name;
```

### workers_public
```sql
SELECT w.id, w.name, w.hourly_rate, w.trade_id, w.company_id, w.is_active,
    w.phone, w.email, w.created_at, w.updated_at,
    t.name AS trade_name, c.name AS company_name
FROM ((workers w LEFT JOIN trades t ON ((w.trade_id = t.id)))
    LEFT JOIN companies c ON ((w.company_id = c.id)));
```

---

## Functions

| Function Name | Return Type |
|---------------|-------------|
| auto_assign_labor_cost_code | trigger |
| auto_assign_sub_cost_code | trigger |
| auto_create_past_logs | void |
| auto_populate_company_id | trigger |
| auto_populate_worker_rate | trigger |
| auto_set_schedule_trade | trigger |
| auto_set_time_log_trade_and_cost_code | trigger |
| calculate_scope_item_line_total | trigger |
| delete_old_archived_logs | void |
| generate_proposal_public_token | text |
| get_material_actuals_by_cost_code | numeric |
| get_material_actuals_by_project | numeric |
| handle_new_user | trigger |
| has_role | boolean |
| log_activity | trigger |
| log_proposal_created | trigger |
| log_proposal_event | uuid |
| mark_costs_paid_on_vendor_payment | trigger |
| mark_time_logs_paid_on_pay_run | trigger |
| migrate_to_day_cards | void |
| prevent_paid_time_log_mutation | trigger |
| set_timestamp | trigger |
| split_schedule_for_multi_project | record |
| split_time_log_for_multi_project | record |
| split_work_schedule_for_multi_project | record |
| sync_daily_log_to_cost_entry | trigger |
| sync_estimate_to_budget | void |
| sync_material_receipt_to_cost | trigger |
| sync_payment_to_logs | trigger |
| sync_time_log_to_work_schedule | trigger |
| sync_timelog_to_schedule | trigger |
| sync_work_schedule_to_time_log | trigger |
| trigger_log_proposal_created | trigger |
| update_proposal_acceptance | jsonb |
| update_scope_block_updated_at | trigger |
| update_sub_compliance_from_document | trigger |
| update_updated_at_column | trigger |

---

## Triggers

| Table | Trigger Name | Definition |
|-------|--------------|------------|
| bid_packages | update_bid_packages_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| cost_codes | update_cost_codes_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| cost_entries | cost_entries_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| costs | update_costs_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| customer_payments | customer_payments_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| daily_logs | auto_assign_labor_cost_code_trigger | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_assign_labor_cost_code() |
| daily_logs | sync_daily_log_cost_entry | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION sync_daily_log_to_cost_entry() |
| daily_logs | sync_timelog_to_schedule_trigger | AFTER UPDATE FOR EACH ROW EXECUTE FUNCTION sync_timelog_to_schedule() |
| daily_logs | trigger_auto_assign_labor_cost_code | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_assign_labor_cost_code() |
| daily_logs | trigger_sync_timelog_to_schedule | BEFORE UPDATE FOR EACH ROW WHEN (new.schedule_id IS NOT NULL) EXECUTE FUNCTION sync_timelog_to_schedule() |
| day_card_jobs | update_day_card_jobs_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| day_cards | day_cards_activity_log | AFTER INSERT OR DELETE OR UPDATE FOR EACH ROW EXECUTE FUNCTION log_activity('log') |
| day_cards | update_day_cards_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| documents | trigger_document_update_sub_compliance | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION update_sub_compliance_from_document() |
| documents | trigger_update_sub_compliance | AFTER INSERT OR UPDATE OF ai_doc_type, ai_expiration_date FOR EACH ROW EXECUTE FUNCTION update_sub_compliance_from_document() |
| documents | update_documents_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| estimates | update_estimates_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| invoices | update_invoices_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| labor_pay_runs | mark_logs_paid_trigger | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION mark_time_logs_paid_on_pay_run() |
| labor_pay_runs | update_labor_pay_runs_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| material_receipts | trigger_delete_material_receipt_cost | AFTER DELETE FOR EACH ROW EXECUTE FUNCTION sync_material_receipt_to_cost() |
| material_receipts | trigger_sync_material_receipt_cost | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION sync_material_receipt_to_cost() |
| material_receipts | update_material_receipts_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| material_vendors | update_material_vendors_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| project_budget_groups | update_project_budget_groups_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| project_budget_lines | update_project_budget_lines_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| project_budgets | update_project_budgets_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| project_todos | update_project_todos_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| projects | update_projects_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| proposal_sections | update_proposal_sections_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| proposal_settings | update_proposal_settings_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| proposal_templates | update_proposal_templates_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| proposals | log_proposal_created | AFTER INSERT FOR EACH ROW EXECUTE FUNCTION trigger_log_proposal_created() |
| proposals | update_proposals_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| schedule_of_values | update_schedule_of_values_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| scope_block_cost_items | trigger_calculate_scope_item_line_total | BEFORE INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION calculate_scope_item_line_total() |
| scope_block_cost_items | update_scope_block_cost_items_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| scope_blocks | update_scope_blocks_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_scope_block_updated_at() |
| sub_contracts | update_sub_contracts_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| sub_invoices | auto_assign_sub_cost_code_trigger | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_assign_sub_cost_code() |
| sub_invoices | update_sub_invoices_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| sub_scheduled_shifts | update_sub_scheduled_shifts_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| subs | update_subs_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| time_log_allocations | update_time_log_allocations_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| time_logs | auto_set_time_log_trade_trigger | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_set_time_log_trade_and_cost_code() |
| time_logs | prevent_paid_time_log_mutation_trigger | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION prevent_paid_time_log_mutation() |
| time_logs | sync_time_log_to_schedule_trigger | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION sync_time_log_to_work_schedule() |
| time_logs | time_logs_auto_populate_company | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_populate_company_id() |
| time_logs | time_logs_auto_populate_rate | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_populate_worker_rate() |
| time_logs | update_time_logs_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| trades | update_trades_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| vendor_payments | mark_costs_paid_trigger | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION mark_costs_paid_on_vendor_payment() |
| vendor_payments | update_vendor_payments_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| work_schedules | auto_set_schedule_trade_trigger | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_set_schedule_trade() |
| work_schedules | sync_schedule_to_timelog_trigger | AFTER INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION sync_work_schedule_to_time_log() |
| work_schedules | update_work_schedules_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |
| work_schedules | work_schedules_auto_populate_company | BEFORE INSERT FOR EACH ROW EXECUTE FUNCTION auto_populate_company_id() |
| workers | update_workers_updated_at | BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |

---

## Indexes

### activity_log
- `activity_log_pkey` (id)
- `idx_activity_log_created` (created_at DESC)
- `idx_activity_log_entity` (entity_type, entity_id)

### bid_invitations
- `bid_invitations_pkey` (id)
- `bid_invitations_bid_package_id_sub_id_key` UNIQUE (bid_package_id, sub_id)
- `idx_bid_invitations_package` (bid_package_id)

### bid_packages
- `bid_packages_pkey` (id)
- `idx_bid_packages_project` (project_id)

### budget_revisions
- `budget_revisions_pkey` (id)
- `idx_budget_revisions_project` (project_id)

### companies
- `companies_pkey` (id)
- `companies_name_key` UNIQUE (name)

### cost_codes
- `cost_codes_pkey` (id)
- `cost_codes_code_key` UNIQUE (code)
- `idx_cost_codes_trade_id` (trade_id)
- `idx_cost_codes_trade_category_unique` UNIQUE (trade_id, category) WHERE is_active = true AND trade_id IS NOT NULL

### cost_entries
- `cost_entries_pkey` (id)
- `idx_cost_entries_code` (cost_code_id)
- `idx_cost_entries_date` (entry_date)
- `idx_cost_entries_project` (project_id)
- `idx_cost_entries_type` (entry_type)

### costs
- `costs_pkey` (id)
- `idx_costs_category` (category)
- `idx_costs_category_subs` (category, project_id) WHERE category = 'subs'
- `idx_costs_company_id` (company_id)
- `idx_costs_cost_code_project` (project_id, cost_code_id)
- `idx_costs_date_incurred` (date_incurred)
- `idx_costs_linked_receipt` (vendor_type) WHERE vendor_type = 'material_vendor'
- `idx_costs_project_category` (project_id, category)
- `idx_costs_project_category_status` (project_id, category, status)
- `idx_costs_project_id` (project_id)
- `idx_costs_status` (status)
- `idx_costs_vendor` (vendor_type, vendor_id)

### customer_payments
- `customer_payments_pkey` (id)
- `idx_customer_payments_invoice` (invoice_id)
- `idx_customer_payments_project` (project_id)

### daily_logs
- `daily_logs_pkey` (id)
- `idx_daily_logs_date` (date)
- `idx_daily_logs_payment_status` (payment_status)
- `idx_daily_logs_project` (project_id)
- `idx_daily_logs_schedule` (schedule_id)
- `idx_daily_logs_worker` (worker_id)
- `idx_daily_logs_worker_date` (worker_id, date)

### day_card_jobs
- `day_card_jobs_pkey` (id)
- `idx_day_card_jobs_card` (day_card_id)
- `idx_day_card_jobs_cost_code` (cost_code_id)
- `idx_day_card_jobs_project` (project_id)

### day_cards
- `day_cards_pkey` (id)
- `day_cards_worker_id_date_key` UNIQUE (worker_id, date)
- `idx_day_cards_company` (company_id)
- `idx_day_cards_date` (date)
- `idx_day_cards_pay_status` (pay_status)
- `idx_day_cards_worker` (worker_id)

### documents
- `documents_pkey` (id)
- `idx_documents_ai_status` (ai_status)
- `idx_documents_doc_type` (doc_type)
- `idx_documents_owner` (owner_type, owner_id)
- `idx_documents_project` (project_id)

### entity_change_log
- `entity_change_log_pkey` (id)
- `idx_entity_change_log_entity` (entity_type, entity_id)
- `idx_entity_change_log_version` (entity_id, version)

### estimate_items
- `estimate_items_pkey` (id)
- `idx_estimate_items_cost_code` (cost_code_id)
- `idx_estimate_items_estimate` (estimate_id)

### estimates
- `estimates_pkey` (id)
- `idx_estimates_project` (project_id)
- `idx_estimates_status` (status)

### invitations
- `invitations_pkey` (id)
- `invitations_email_key` UNIQUE (email)

### invoice_items
- `invoice_items_pkey` (id)
- `idx_invoice_items_cost_code` (cost_code_id)
- `idx_invoice_items_invoice` (invoice_id)

### invoices
- `invoices_pkey` (id)
- `idx_invoices_project` (project_id)
- `idx_invoices_project_status` (project_id, status)
- `idx_invoices_status` (status)
- `invoices_invoice_number_key` UNIQUE (invoice_number)

### labor_pay_run_items
- `labor_pay_run_items_pkey` (id)
- `idx_labor_pay_run_items_pay_run` (pay_run_id)
- `idx_labor_pay_run_items_time_log` (time_log_id)
- `labor_pay_run_items_time_log_id_key` UNIQUE (time_log_id)

### labor_pay_runs
- `labor_pay_runs_pkey` (id)
- `idx_labor_pay_runs_created_at` (created_at DESC)
- `idx_labor_pay_runs_payer_company` (payer_company_id)
- `idx_labor_pay_runs_payment_date_status` (payment_date, status)

### material_receipts
- `material_receipts_pkey` (id)
- `idx_material_receipts_cost_code` (cost_code_id)
- `idx_material_receipts_project` (project_id)
- `idx_material_receipts_vendor` (vendor_id)

### material_vendors
- `material_vendors_pkey` (id)
- `idx_material_vendors_trade` (trade_id)

### measurement_units
- `measurement_units_code_key` UNIQUE (code)
- `measurement_units_pkey` (id)

### payments
- `payments_pkey` (id)
- `idx_payments_company` (company_id)
- `idx_payments_date_range` (start_date, end_date)

### project_budget_groups
- `project_budget_groups_pkey` (id)
- `idx_project_budget_groups_budget` (project_budget_id)

### project_budget_lines
- `project_budget_lines_pkey` (id)
- `idx_project_budget_lines_budget` (project_budget_id)
- `idx_project_budget_lines_category` (category)
- `idx_project_budget_lines_code` (cost_code_id)
- `idx_project_budget_lines_project` (project_id)

### project_budgets
- `project_budgets_pkey` (id)
- `idx_project_budgets_project` (project_id)
- `project_budgets_project_id_key` UNIQUE (project_id)

### project_todos
- `project_todos_pkey` (id)
- `idx_project_todos_assigned_to` (assigned_to)
- `idx_project_todos_due_date` (due_date)
- `idx_project_todos_project` (project_id)
- `idx_project_todos_status` (status)

### projects
- `projects_pkey` (id)
- `idx_projects_company` (company_id)
- `idx_projects_status` (status)

### proposal_events
- `proposal_events_pkey` (id)
- `idx_proposal_events_proposal` (proposal_id)
- `idx_proposal_events_type` (event_type)

### proposal_sections
- `proposal_sections_pkey` (id)
- `idx_proposal_sections_proposal` (proposal_id)

### proposal_settings
- `proposal_settings_pkey` (id)

### proposal_templates
- `proposal_templates_pkey` (id)

### proposals
- `proposals_pkey` (id)
- `idx_proposals_acceptance_status` (acceptance_status)
- `idx_proposals_estimate` (estimate_id)
- `idx_proposals_project` (project_id)
- `idx_proposals_public_token` (public_token)
- `idx_proposals_status` (status)
- `proposals_public_token_key` UNIQUE (public_token)

### scheduled_shifts
- `scheduled_shifts_pkey` (id)
- `idx_scheduled_shifts_date` (scheduled_date)
- `idx_scheduled_shifts_project` (project_id)
- `idx_scheduled_shifts_worker` (worker_id)
- `idx_scheduled_shifts_worker_date` (worker_id, scheduled_date)

### schedule_of_values
- `schedule_of_values_pkey` (id)
- `idx_schedule_of_values_project` (project_id)

### scope_block_cost_items
- `scope_block_cost_items_pkey` (id)
- `idx_scope_block_cost_items_block` (scope_block_id)
- `idx_scope_block_cost_items_cost_code` (cost_code_id)

### scope_blocks
- `scope_blocks_pkey` (id)
- `idx_scope_blocks_entity` (entity_type, entity_id)

### sub_contracts
- `sub_contracts_pkey` (id)
- `idx_sub_contracts_project` (project_id)
- `idx_sub_contracts_sub` (sub_id)

### sub_invoices
- `sub_invoices_pkey` (id)
- `idx_sub_invoices_contract` (sub_contract_id)
- `idx_sub_invoices_cost_code` (cost_code_id)
- `idx_sub_invoices_project` (project_id)
- `idx_sub_invoices_status` (status)
- `idx_sub_invoices_sub` (sub_id)

### sub_scheduled_shifts
- `sub_scheduled_shifts_pkey` (id)
- `idx_sub_scheduled_shifts_date` (scheduled_date)
- `idx_sub_scheduled_shifts_project` (project_id)
- `idx_sub_scheduled_shifts_sub` (sub_id)

### subs
- `subs_pkey` (id)
- `idx_subs_trade` (trade_id)

### time_log_allocations
- `time_log_allocations_pkey` (id)
- `idx_time_log_allocations_card` (day_card_id)
- `idx_time_log_allocations_cost_code` (cost_code_id)
- `idx_time_log_allocations_project` (project_id)

### time_logs
- `time_logs_pkey` (id)
- `idx_time_logs_cost_code_project` (project_id, cost_code_id)
- `idx_time_logs_date` (date)
- `idx_time_logs_payment_status_date` (payment_status, date)
- `idx_time_logs_project_date` (project_id, date)
- `idx_time_logs_source_schedule` (source_schedule_id)
- `idx_time_logs_unpaid_company` (company_id, payment_status) WHERE payment_status = 'unpaid'
- `idx_time_logs_worker_date` (worker_id, date)

### trades
- `trades_pkey` (id)
- `trades_name_key` UNIQUE (name)

### user_roles
- `user_roles_pkey` (id)
- `user_roles_user_id_role_key` UNIQUE (user_id, role)

### vendor_payment_items
- `vendor_payment_items_pkey` (id)
- `idx_vendor_payment_items_cost` (cost_id)
- `idx_vendor_payment_items_payment` (payment_id)

### vendor_payments
- `vendor_payments_pkey` (id)
- `idx_vendor_payments_company` (company_id)
- `idx_vendor_payments_vendor` (vendor_type, vendor_id)

### work_schedules
- `work_schedules_pkey` (id)
- `idx_work_schedules_project` (project_id)
- `idx_work_schedules_scheduled_date` (scheduled_date)
- `idx_work_schedules_status_date` (status, scheduled_date)
- `idx_work_schedules_worker` (worker_id)
- `idx_work_schedules_worker_date` (worker_id, scheduled_date)
- `idx_work_schedules_worker_status` (worker_id, status)

### workers
- `workers_pkey` (id)
- `idx_workers_company` (company_id)
- `idx_workers_trade` (trade_id)

---

## RLS Policies

| Table | Policy | Command | Using/With Check |
|-------|--------|---------|------------------|
| activity_log | Anyone can insert activity log | INSERT | WITH CHECK: true |
| activity_log | Anyone can view activity log | SELECT | USING: true |
| bid_invitations | Anyone can delete/insert/update/view | ALL | true |
| bid_packages | Anyone can delete/insert/update/view | ALL | true |
| budget_revisions | Anyone can insert/update/view | INSERT/UPDATE/SELECT | true |
| cost_codes | Anyone can delete/insert/update/view | ALL | true |
| cost_entries | Anyone can delete/insert/update/view | ALL | true |
| costs | Anyone can delete/insert/update/view | ALL | true |
| customer_payments | Anyone can delete/insert/update/view | ALL | true |
| day_card_jobs | Anyone can delete/insert/update/view | ALL | true |
| day_cards | Anyone can delete/insert/update/view | ALL | true |
| documents | Anyone can delete/insert/update/view | ALL | true |
| entity_change_log | Anyone can insert/view | INSERT/SELECT | true |
| estimate_items | Anyone can delete/insert/update/view | ALL | true |
| estimates | Anyone can delete/insert/update/view | ALL | true |
| invoice_items | Anyone can delete/insert/update/view | ALL | true |
| invoices | Anyone can delete/insert/update/view | ALL | true |
| labor_pay_run_items | Anyone can delete/insert/update/view | ALL | true |
| labor_pay_runs | Anyone can delete/insert/update/view | ALL | true |
| material_receipts | Anyone can delete/insert/update/view | ALL | true |
| material_vendors | Anyone can delete/insert/update/view | ALL | true |
| measurement_units | measurement_units_select_all | SELECT | true |
| project_budget_lines | Anyone can delete/insert/update/view | ALL | true |
| project_budgets | Anyone can delete/insert/update/view | ALL | true |
| project_todos | Anyone can delete/insert/update/view | ALL | true |
| projects | Anyone can delete/insert/update/view | ALL | true |
| proposal_events | Anyone can insert/view | INSERT/SELECT | true |
| proposal_sections | Anyone can delete/insert/update/view | ALL | true |
| proposal_settings | Anyone can delete/insert/update/view | ALL | true |
| proposal_templates | Anyone can delete/insert/update/view | ALL | true |
| proposals | Anyone can delete/insert/update/view | ALL | true |
| scheduled_shifts | Anyone can delete/insert/update/view | ALL | true |
| schedule_of_values | Anyone can delete/insert/update/view | ALL | true |
| scope_block_cost_items | Anyone can delete/insert/update/view | ALL | true |
| scope_blocks | Anyone can delete/insert/update/view | ALL | true |
| sub_contracts | Anyone can delete/insert/update/view | ALL | true |
| sub_invoices | Anyone can delete/insert/update/view | ALL | true |
| sub_scheduled_shifts | Anyone can delete/insert/update/view | ALL | true |
| subs | Anyone can delete/insert/update/view | ALL | true |
| time_log_allocations | Anyone can delete/insert/update/view | ALL | true |
| time_logs | Anyone can delete/insert/update/view | ALL | true |
| trades | Anyone can delete/insert/update/view | ALL | true |
| vendor_payment_items | Anyone can delete/insert/update/view | ALL | true |
| vendor_payments | Anyone can delete/insert/update/view | ALL | true |
| work_schedules | Anyone can delete/insert/update/view | ALL | true |
| workers | Anyone can delete/insert/update/view | ALL | true |

---

## Enums

### app_role
- `admin`
- `field_user`

---

*End of Schema Dump*
