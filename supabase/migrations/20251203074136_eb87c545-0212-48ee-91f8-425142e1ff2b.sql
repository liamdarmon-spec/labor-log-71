-- Add project_type to estimates table
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Create checklist_templates table
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL, -- 'kitchen_remodel' | 'bath_remodel' | 'full_home_remodel' | 'global'
  phase TEXT NOT NULL, -- 'precon' | 'rough' | 'finish' | 'punch' | 'warranty'
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create checklist_template_items table
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  default_assignee_role TEXT, -- 'pm', 'super', 'plumber', 'electrician', etc.
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create project_checklists table
CREATE TABLE IF NOT EXISTS project_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  scope_block_id UUID REFERENCES scope_blocks(id) ON DELETE SET NULL,
  project_type TEXT,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open' | 'in_progress' | 'done'
  progress_cached INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create project_checklist_items table
CREATE TABLE IF NOT EXISTS project_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_checklist_id UUID NOT NULL REFERENCES project_checklists(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES checklist_template_items(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  assignee_user_id UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID,
  notes TEXT,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create checklist_questions table
CREATE TABLE IF NOT EXISTS checklist_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  input_type TEXT NOT NULL, -- 'boolean' | 'single_select' | 'multi_select' | 'text'
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_type, code)
);

-- Create checklist_question_answers table
CREATE TABLE IF NOT EXISTS checklist_question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES checklist_questions(id) ON DELETE CASCADE,
  value_boolean BOOLEAN,
  value_text TEXT,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estimate_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_project_type ON checklist_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_phase ON checklist_templates(phase);
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template ON checklist_template_items(checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_project_checklists_project ON project_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_project_checklists_estimate ON project_checklists(estimate_id);
CREATE INDEX IF NOT EXISTS idx_project_checklist_items_checklist ON project_checklist_items(project_checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_questions_project_type ON checklist_questions(project_type);
CREATE INDEX IF NOT EXISTS idx_checklist_question_answers_estimate ON checklist_question_answers(estimate_id);

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_question_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for now (matches existing app pattern)
CREATE POLICY "Anyone can view checklist_templates" ON checklist_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checklist_templates" ON checklist_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_templates" ON checklist_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_templates" ON checklist_templates FOR DELETE USING (true);

CREATE POLICY "Anyone can view checklist_template_items" ON checklist_template_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checklist_template_items" ON checklist_template_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_template_items" ON checklist_template_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_template_items" ON checklist_template_items FOR DELETE USING (true);

CREATE POLICY "Anyone can view project_checklists" ON project_checklists FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_checklists" ON project_checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_checklists" ON project_checklists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_checklists" ON project_checklists FOR DELETE USING (true);

CREATE POLICY "Anyone can view project_checklist_items" ON project_checklist_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_checklist_items" ON project_checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_checklist_items" ON project_checklist_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_checklist_items" ON project_checklist_items FOR DELETE USING (true);

CREATE POLICY "Anyone can view checklist_questions" ON checklist_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checklist_questions" ON checklist_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_questions" ON checklist_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_questions" ON checklist_questions FOR DELETE USING (true);

CREATE POLICY "Anyone can view checklist_question_answers" ON checklist_question_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checklist_question_answers" ON checklist_question_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_question_answers" ON checklist_question_answers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_question_answers" ON checklist_question_answers FOR DELETE USING (true);

-- Seed initial checklist questions
INSERT INTO checklist_questions (project_type, code, label, help_text, input_type, options, sort_order) VALUES
-- Kitchen questions
('kitchen_remodel', 'has_wall_removals', 'Are you removing or moving any walls or headers?', 'This affects structural and permit requirements', 'boolean', NULL, 1),
('kitchen_remodel', 'layout_complexity', 'How complex is the layout change?', NULL, 'single_select', '["simple – same layout", "moderate – move a few items", "complex – full re-layout"]', 2),
('kitchen_remodel', 'appliance_scope', 'Which appliances are included?', 'Select all that apply', 'multi_select', '["range/oven", "cooktop", "hood", "refrigerator", "dishwasher", "microwave", "built-in coffee/other"]', 3),
('kitchen_remodel', 'flooring_scope', 'What flooring work is planned?', NULL, 'single_select', '["no change", "refinish existing hardwood", "new tile", "new engineered wood", "other"]', 4),
('kitchen_remodel', 'countertop_material', 'What countertop material?', NULL, 'single_select', '["quartz", "stone slab (granite/marble)", "tile", "other"]', 5),

-- Bath questions
('bath_remodel', 'wet_area_scope', 'What wet area work is planned?', 'Select all that apply', 'multi_select', '["new shower pan", "new tub", "convert tub to shower", "steam shower"]', 1),
('bath_remodel', 'waterproofing_level', 'What level of waterproofing is needed?', NULL, 'single_select', '["basic tub surround", "full shower with mud pan", "curbless / linear drain"]', 2),
('bath_remodel', 'plumbing_relocation', 'Are you relocating plumbing?', NULL, 'single_select', '["no relocation", "move valve only", "move drain/fixtures"]', 3),
('bath_remodel', 'has_fan_upgrade', 'Are you adding or upgrading a bath fan?', NULL, 'boolean', NULL, 4),

-- Full home questions
('full_home_remodel', 'interior_scope', 'Which interior areas are included?', 'Select all that apply', 'multi_select', '["kitchen", "baths", "flooring", "lighting", "paint", "doors/trim", "windows"]', 1),
('full_home_remodel', 'structural_scope', 'Any structural work planned?', 'Select all that apply', 'multi_select', '["none", "beam / header changes", "new openings", "stair modifications"]', 2),
('full_home_remodel', 'exterior_scope', 'Which exterior areas are included?', 'Select all that apply', 'multi_select', '["paint", "stucco", "windows/doors", "decks/balconies", "roof"]', 3),
('full_home_remodel', 'is_occupied', 'Will the home be occupied during work?', 'This affects daily cleanup and access requirements', 'boolean', NULL, 4)
ON CONFLICT (project_type, code) DO NOTHING;

-- Seed initial checklist templates
INSERT INTO checklist_templates (name, description, project_type, phase, tags) VALUES
-- Kitchen templates
('Kitchen – Precon', 'Pre-construction checklist for kitchen remodels', 'kitchen_remodel', 'precon', ARRAY['kitchen', 'precon']),
('Kitchen – Rough-In & Inspections', 'Rough-in phase checklist for kitchen', 'kitchen_remodel', 'rough', ARRAY['kitchen', 'rough']),
('Kitchen – Finish & Punch', 'Finish and punch list for kitchen', 'kitchen_remodel', 'finish', ARRAY['kitchen', 'finish']),
('Kitchen – Structural', 'Structural work checklist for kitchen wall removals', 'kitchen_remodel', 'rough', ARRAY['kitchen', 'structural']),

-- Bath templates
('Bath – Precon', 'Pre-construction checklist for bathroom remodels', 'bath_remodel', 'precon', ARRAY['bath', 'precon']),
('Bath – Waterproofing & Pan', 'Waterproofing and pan installation checklist', 'bath_remodel', 'rough', ARRAY['bath', 'waterproofing']),
('Bath – Rough-In & Inspections', 'Rough-in phase checklist for bathroom', 'bath_remodel', 'rough', ARRAY['bath', 'rough', 'plumbing']),
('Bath – Finish & Punch', 'Finish and punch list for bathroom', 'bath_remodel', 'finish', ARRAY['bath', 'finish']),

-- Full home templates
('Full Home – Precon', 'Pre-construction checklist for whole home remodels', 'full_home_remodel', 'precon', ARRAY['full_home', 'precon']),
('Full Home – Rough Phase', 'Rough-in phase for whole home', 'full_home_remodel', 'rough', ARRAY['full_home', 'rough']),
('Full Home – Finish & Punch', 'Finish and punch list for whole home', 'full_home_remodel', 'finish', ARRAY['full_home', 'finish']),
('Occupied Home – Daily Closeout', 'Daily closeout checklist for occupied homes', 'global', 'rough', ARRAY['occupied', 'daily']),

-- Global templates
('Final Client Walkthrough', 'Final walkthrough checklist with client', 'global', 'punch', ARRAY['punch', 'walkthrough']);

-- Insert template items for Kitchen Precon
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'Verify cabinet layout with client', 'pm', true),
  (2, 'Confirm appliance selections and delivery dates', 'pm', true),
  (3, 'Review electrical plan with electrician', 'super', true),
  (4, 'Review plumbing plan with plumber', 'super', true),
  (5, 'Schedule permit application', 'pm', true),
  (6, 'Order long-lead items (cabinets, countertops)', 'pm', true),
  (7, 'Confirm demo scope and protection plan', 'super', true),
  (8, 'Schedule HVAC if ductwork changes needed', 'super', false),
  (9, 'Review flooring transitions with client', 'pm', false),
  (10, 'Set up job site protection and dust barriers', 'super', true)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Kitchen – Precon';

-- Insert template items for Kitchen Rough-In
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'Demo complete – verify scope matches plan', 'super', true),
  (2, 'Rough electrical complete', 'electrician', true),
  (3, 'Rough plumbing complete', 'plumber', true),
  (4, 'Schedule electrical rough inspection', 'super', true),
  (5, 'Schedule plumbing rough inspection', 'super', true),
  (6, 'Framing modifications complete (if any)', 'super', false),
  (7, 'Drywall patching complete', 'super', true),
  (8, 'Cabinet delivery scheduled', 'pm', true),
  (9, 'Countertop template scheduled', 'pm', true),
  (10, 'Review cabinet layout before install', 'super', true)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Kitchen – Rough-In & Inspections';

-- Insert template items for Kitchen Finish
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'Cabinets installed and leveled', 'super', true),
  (2, 'Countertops installed', 'super', true),
  (3, 'Backsplash tile complete', 'super', true),
  (4, 'Sink and faucet installed', 'plumber', true),
  (5, 'Appliances installed and tested', 'super', true),
  (6, 'Final electrical – outlets, switches, lights', 'electrician', true),
  (7, 'Touch-up paint complete', 'super', true),
  (8, 'Hardware installed (pulls, knobs)', 'super', true),
  (9, 'Final cleaning', 'super', true),
  (10, 'Client walkthrough scheduled', 'pm', true)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Kitchen – Finish & Punch';

-- Insert template items for Bath Precon
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'Verify tile and fixture selections with client', 'pm', true),
  (2, 'Confirm vanity and mirror selections', 'pm', true),
  (3, 'Review plumbing plan with plumber', 'super', true),
  (4, 'Review electrical plan with electrician', 'super', true),
  (5, 'Schedule permit application', 'pm', true),
  (6, 'Order long-lead items (tile, vanity, fixtures)', 'pm', true),
  (7, 'Confirm demo scope', 'super', true),
  (8, 'Set up dust barriers and floor protection', 'super', true)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Bath – Precon';

-- Insert template items for Bath Waterproofing
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'Backer board installed', 'super', true),
  (2, 'Shower pan / mud bed formed', 'super', true),
  (3, 'Waterproofing membrane applied', 'super', true),
  (4, 'Flood test complete (24hr)', 'super', true),
  (5, 'Document waterproofing with photos', 'super', true),
  (6, 'Curb height verified', 'super', true),
  (7, 'Drain test complete', 'plumber', true),
  (8, 'Ready for tile installation', 'super', true)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Bath – Waterproofing & Pan';

-- Insert template items for Final Walkthrough
INSERT INTO checklist_template_items (checklist_template_id, sort_order, label, default_assignee_role, required)
SELECT t.id, i.sort_order, i.label, i.role, i.required
FROM checklist_templates t
CROSS JOIN (VALUES
  (1, 'All punch items complete', 'super', true),
  (2, 'Final clean complete', 'super', true),
  (3, 'All appliances demonstrated to client', 'pm', true),
  (4, 'Warranty info provided', 'pm', true),
  (5, 'Maintenance instructions reviewed', 'pm', true),
  (6, 'Client sign-off obtained', 'pm', true),
  (7, 'Final photos taken', 'pm', true),
  (8, 'Keys/access returned if applicable', 'pm', false)
) AS i(sort_order, label, role, required)
WHERE t.name = 'Final Client Walkthrough';