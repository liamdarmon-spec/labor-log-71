-- Seed additional high-quality checklist template items
-- Kitchen Precon items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Verify final cabinet layout against plans and appliance specs', true, 'pm'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon' AND NOT EXISTS (
  SELECT 1 FROM public.checklist_template_items WHERE checklist_template_id = checklist_templates.id AND sort_order = 1
);

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Confirm venting path for hood (CFM, make-up air if required)', true, 'pm'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Verify electrical panel capacity for all kitchen appliances', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Confirm countertop material, edge profile, and splash height', true, 'pm'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Confirm flooring transitions at all doorways and adjacent rooms', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Review plumbing rough locations with cabinet layout', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Confirm undercabinet lighting locations and switch positions', false, 'electrician'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 8, 'Verify island dimensions and electrical/plumbing needs', true, 'pm'
FROM public.checklist_templates WHERE name = 'Kitchen – Precon';

-- Kitchen Rough items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Confirm all appliance circuits are correctly sized and labeled', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Verify plumbing locations vs cabinet drawings', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Photo-document all wall blocking (cabinets, accessories)', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Capture photos of rough MEP before insulation', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Confirm GFCI/AFCI requirements are met', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Schedule and pass rough electrical inspection', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Schedule and pass rough plumbing inspection', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 8, 'Verify hood vent duct run is properly sized and routed', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Rough-In & Inspections';

-- Kitchen Finish items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Verify cabinet installation is level, plumb, and per plan', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Check countertop seams and edge quality', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Test all appliances for proper operation', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Check for leaks at sink, dishwasher, and ice maker', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Verify backsplash installation quality and grout lines', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Test all outlets and undercabinet lighting', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Final clean and protect counters before turnover', true, 'super'
FROM public.checklist_templates WHERE name = 'Kitchen – Finish & Punch';

-- Bath Waterproofing items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Confirm slope to drain before waterproofing (1/4" per foot)', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Verify curb height and shower opening layout', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Photo-document pan test with standing water + timestamps', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Confirm waterproofing system matches specified product', true, 'pm'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Verify all penetrations (niches, valves) are properly sealed', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Check membrane overlap at all corners and seams', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Schedule waterproofing inspection if required by jurisdiction', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 8, 'Verify drain flange is bonded to waterproofing membrane', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Bath – Waterproofing & Pan';

-- Create additional templates for structural and occupied home
INSERT INTO public.checklist_templates (name, description, project_type, phase, tags, is_active)
VALUES 
  ('Structural – Engineering & Inspection', 'Checklist for structural modifications', 'global', 'rough', ARRAY['structural', 'engineering', 'inspection'], true),
  ('Occupied Home – Daily Closeout', 'Daily safety and cleanliness for occupied homes', 'global', 'rough', ARRAY['occupied', 'daily', 'safety'], true),
  ('Curbless Shower – Critical Details', 'Special attention items for barrier-free showers', 'bath_remodel', 'rough', ARRAY['curbless', 'waterproofing', 'ada'], true)
ON CONFLICT DO NOTHING;

-- Structural checklist items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Verify structural drawings are approved and on-site', true, 'pm'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Confirm temporary shoring is installed per plan', true, 'super'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Photo-document existing conditions before demo', true, 'super'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Verify beam/header size matches structural specs', true, 'super'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Check post-to-beam connections per engineer detail', true, 'super'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Schedule structural inspection before covering framing', true, 'super'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Obtain engineer sign-off on special inspection items', true, 'pm'
FROM public.checklist_templates WHERE name = 'Structural – Engineering & Inspection';

-- Occupied Home Daily Closeout items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'All walk paths swept and free of trip hazards', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'No tools left plugged in or energized overnight', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'All rooms used by client are broom-clean', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Daily photos added to log with brief notes', false, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Dust barriers are intact and properly sealed', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Utilities functioning for client (water, power, HVAC)', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Construction area secured with appropriate signage', true, 'super'
FROM public.checklist_templates WHERE name = 'Occupied Home – Daily Closeout';

-- Curbless Shower items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Verify shower floor is lowered per structural requirements', true, 'super'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Confirm linear drain is properly sloped (min 2%)', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Verify transition strip/dam prevents water migration', true, 'super'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Check waterproofing extends beyond splash zone', true, 'super'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Verify tile layout accommodates drain position', true, 'super'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Flood test entire wet area for 24 hours minimum', true, 'super'
FROM public.checklist_templates WHERE name = 'Curbless Shower – Critical Details';

-- Update template tags for better matching
UPDATE public.checklist_templates 
SET tags = ARRAY['kitchen', 'precon'] 
WHERE name = 'Kitchen – Precon';

UPDATE public.checklist_templates 
SET tags = ARRAY['kitchen', 'rough', 'inspection'] 
WHERE name = 'Kitchen – Rough-In & Inspections';

UPDATE public.checklist_templates 
SET tags = ARRAY['kitchen', 'finish', 'punch'] 
WHERE name = 'Kitchen – Finish & Punch';

UPDATE public.checklist_templates 
SET tags = ARRAY['bath', 'waterproofing', 'pan', 'inspection'] 
WHERE name = 'Bath – Waterproofing & Pan';

UPDATE public.checklist_templates 
SET tags = ARRAY['final', 'walkthrough', 'punch', 'client'] 
WHERE name = 'Final Client Walkthrough';

-- Add Bath Precon template
INSERT INTO public.checklist_templates (name, description, project_type, phase, tags, is_active)
VALUES ('Bath – Precon', 'Bathroom pre-construction verification checklist', 'bath_remodel', 'precon', ARRAY['bath', 'precon'], true)
ON CONFLICT DO NOTHING;

-- Bath Precon items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Verify fixture locations against plan', true, 'pm'
FROM public.checklist_templates WHERE name = 'Bath – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Confirm shower/tub dimensions and configuration', true, 'pm'
FROM public.checklist_templates WHERE name = 'Bath – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Review tile selections and layout with client', true, 'pm'
FROM public.checklist_templates WHERE name = 'Bath – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Verify vanity dimensions and plumbing requirements', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Bath – Precon';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Confirm ventilation requirements and fan location', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Bath – Precon';

-- Add Bath Finish template
INSERT INTO public.checklist_templates (name, description, project_type, phase, tags, is_active)
VALUES ('Bath – Finish & Punch', 'Bathroom finish and punch list checklist', 'bath_remodel', 'finish', ARRAY['bath', 'finish', 'punch'], true)
ON CONFLICT DO NOTHING;

-- Bath Finish items
INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 1, 'Confirm all fixtures operate with no leaks or drips', true, 'plumber'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 2, 'Check tile lippage and grout joints in multiple lighting conditions', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 3, 'Verify caulking at all wet transitions (tub, counters, glass)', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 4, 'Confirm fan is venting to exterior and operating quietly', true, 'electrician'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 5, 'Test shower door/enclosure for proper operation', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 6, 'Verify mirror and accessory installation', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';

INSERT INTO public.checklist_template_items (checklist_template_id, sort_order, label, required, default_assignee_role)
SELECT id, 7, 'Final clean and inspection before turnover', true, 'super'
FROM public.checklist_templates WHERE name = 'Bath – Finish & Punch';