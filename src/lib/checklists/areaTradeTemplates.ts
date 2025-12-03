// Area × Trade Template Configuration
// High-quality checklist items and questions per area/trade combination

import { AreaType, TradeType } from './areaTrade';
import { ProjectType } from './intel';

export interface AreaTradeQuestion {
  code: string;
  text: string;
  helpText?: string;
  inputType?: 'boolean' | 'select' | 'multi-select' | 'text';
  options?: string[];
}

export interface AreaTradeChecklistItem {
  code: string;
  text: string;
  phase: 'precon' | 'rough' | 'finish' | 'punch';
  tags?: string[];
  defaultAssigneeRole?: 'PM' | 'Super' | 'Lead' | 'Sub' | string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface AreaTradeTemplate {
  id: string;
  name: string;
  projectTypes?: ProjectType[];
  areaTypes: AreaType[];
  trades: TradeType[];
  questions: AreaTradeQuestion[];
  checklistItems: AreaTradeChecklistItem[];
}

// High-quality templates seeded with real construction knowledge
export const AREA_TRADE_TEMPLATES: AreaTradeTemplate[] = [
  // ============================================
  // KITCHEN + DEMO
  // ============================================
  {
    id: 'kitchen-demo',
    name: 'Kitchen Demo',
    areaTypes: ['kitchen'],
    trades: ['demo'],
    questions: [
      {
        code: 'demo_haul_access',
        text: 'What is the haul-out access route?',
        helpText: 'Consider elevator, stairs, hallways',
        inputType: 'select',
        options: ['Direct exterior access', 'Through building common area', 'Through home living spaces', 'Elevator required'],
      },
      {
        code: 'demo_dumpster_location',
        text: 'Where will the dumpster be located?',
        inputType: 'select',
        options: ['Driveway', 'Street permit required', 'Building loading dock', 'No dumpster - haul off only'],
      },
      {
        code: 'demo_quiet_hours',
        text: 'Are there quiet hour restrictions?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'kd-01', text: 'Verify haul route protection plan is in place', phase: 'precon', tags: ['protection'], defaultAssigneeRole: 'Super' },
      { code: 'kd-02', text: 'Confirm elevator protection installed (if applicable)', phase: 'precon', tags: ['protection'], defaultAssigneeRole: 'Super' },
      { code: 'kd-03', text: 'HOA/building demo approval obtained', phase: 'precon', tags: ['permits'], defaultAssigneeRole: 'PM' },
      { code: 'kd-04', text: 'Disconnect and cap all utilities before demo', phase: 'rough', tags: ['safety'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'kd-05', text: 'Photo-document existing conditions before demo', phase: 'precon', tags: ['documentation'], defaultAssigneeRole: 'Super' },
      { code: 'kd-06', text: 'Dust barrier erected at all openings', phase: 'rough', tags: ['protection'], defaultAssigneeRole: 'Sub' },
    ],
  },

  // ============================================
  // KITCHEN + PLUMBING
  // ============================================
  {
    id: 'kitchen-plumbing',
    name: 'Kitchen Plumbing',
    areaTypes: ['kitchen'],
    trades: ['plumbing'],
    questions: [
      {
        code: 'plumb_shutoff_location',
        text: 'Where are the water shutoff valves?',
        inputType: 'select',
        options: ['Under sink', 'In basement/crawl', 'Main only', 'Unknown - need to locate'],
      },
      {
        code: 'plumb_shared_lines',
        text: 'Does the kitchen share supply lines with other areas?',
        inputType: 'boolean',
      },
      {
        code: 'plumb_gas_appliances',
        text: 'Are there gas appliances requiring relocation?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'kp-01', text: 'Confirm water and gas shutoff locations with client', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM' },
      { code: 'kp-02', text: 'Verify fixture locations vs cabinet shop drawings', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM', riskLevel: 'high' },
      { code: 'kp-03', text: 'Photo-document rough plumbing before close-up', phase: 'rough', tags: ['documentation'], defaultAssigneeRole: 'Super' },
      { code: 'kp-04', text: 'Test all supply and drain connections under pressure', phase: 'rough', tags: ['inspection'], defaultAssigneeRole: 'Sub' },
      { code: 'kp-05', text: 'Verify disposal and dishwasher connections match layout', phase: 'finish', tags: ['appliances'], defaultAssigneeRole: 'Sub' },
    ],
  },

  // ============================================
  // KITCHEN + CABINETS
  // ============================================
  {
    id: 'kitchen-cabinets',
    name: 'Kitchen Cabinets',
    areaTypes: ['kitchen'],
    trades: ['cabinets'],
    questions: [
      {
        code: 'cab_appliance_specs',
        text: 'Have all appliance cut sheets been received?',
        inputType: 'boolean',
      },
      {
        code: 'cab_ceiling_height',
        text: 'What is the ceiling height treatment?',
        inputType: 'select',
        options: ['Cabinets to ceiling', 'Crown molding above', 'Open soffit', 'Bulkhead/soffit'],
      },
      {
        code: 'cab_crown_riser',
        text: 'Is crown molding or riser trim planned?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'kc-01', text: 'Verify all appliance cut sheets received and reviewed', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM', riskLevel: 'high' },
      { code: 'kc-02', text: 'Confirm cabinet dimensions vs appliance clearances', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM', riskLevel: 'high' },
      { code: 'kc-03', text: 'Verify wall blocking locations before drywall', phase: 'rough', tags: ['structural'], defaultAssigneeRole: 'Super' },
      { code: 'kc-04', text: 'Check cabinet delivery for damage and completeness', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Super' },
      { code: 'kc-05', text: 'Verify all cabinets are level and plumb after install', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Lead' },
      { code: 'kc-06', text: 'Confirm door/drawer alignment and soft-close operation', phase: 'punch', tags: ['QA'], defaultAssigneeRole: 'Lead' },
    ],
  },

  // ============================================
  // KITCHEN + COUNTERTOPS
  // ============================================
  {
    id: 'kitchen-countertops',
    name: 'Kitchen Countertops',
    areaTypes: ['kitchen'],
    trades: ['countertops'],
    questions: [
      {
        code: 'ct_edge_profile',
        text: 'What edge profile is specified?',
        inputType: 'select',
        options: ['Eased/flat', 'Bullnose', 'Ogee', 'Mitered', 'Waterfall', 'Custom'],
      },
      {
        code: 'ct_overhang_seating',
        text: 'Is there seating overhang planned?',
        inputType: 'boolean',
      },
      {
        code: 'ct_waterfall',
        text: 'Does design include waterfall edges?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'kct-01', text: 'Confirm edge profile selection with client', phase: 'precon', tags: ['client-approval'], defaultAssigneeRole: 'PM' },
      { code: 'kct-02', text: 'Verify seam locations and get client sign-off', phase: 'precon', tags: ['client-approval'], defaultAssigneeRole: 'PM', riskLevel: 'medium' },
      { code: 'kct-03', text: 'Confirm sink/faucet cutout template matches fixtures', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM' },
      { code: 'kct-04', text: 'Verify support structure for overhangs per fabricator specs', phase: 'rough', tags: ['structural'], defaultAssigneeRole: 'Super' },
      { code: 'kct-05', text: 'Inspect countertops for chips/cracks upon delivery', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Super' },
      { code: 'kct-06', text: 'Verify backsplash fit and caulk joints', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Lead' },
    ],
  },

  // ============================================
  // ANY AREA + FLOORING
  // ============================================
  {
    id: 'general-flooring',
    name: 'Flooring',
    areaTypes: ['kitchen', 'bath', 'bedroom', 'living', 'hall', 'other'],
    trades: ['flooring'],
    questions: [
      {
        code: 'floor_hoa_sound',
        text: 'Are there HOA sound/underlayment requirements?',
        inputType: 'boolean',
      },
      {
        code: 'floor_underlayment',
        text: 'What underlayment is specified?',
        inputType: 'select',
        options: ['Cork', 'Foam', 'None required', 'Per HOA spec'],
      },
      {
        code: 'floor_transitions',
        text: 'Are there multiple flooring transitions to coordinate?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'fl-01', text: 'Confirm underlayment spec meets sound requirements', phase: 'precon', tags: ['compliance'], defaultAssigneeRole: 'PM' },
      { code: 'fl-02', text: 'Verify finished floor heights and transition details', phase: 'precon', tags: ['coordination'], defaultAssigneeRole: 'PM' },
      { code: 'fl-03', text: 'Acclimate flooring material per manufacturer specs', phase: 'finish', tags: ['materials'], defaultAssigneeRole: 'Sub' },
      { code: 'fl-04', text: 'Check subfloor flatness and moisture levels', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Sub', riskLevel: 'medium' },
      { code: 'fl-05', text: 'Confirm all transitions and thresholds installed', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Lead' },
    ],
  },

  // ============================================
  // ANY AREA + FLOOR LEVELING
  // ============================================
  {
    id: 'general-floor-leveling',
    name: 'Floor Leveling',
    areaTypes: ['kitchen', 'bath', 'bedroom', 'living', 'hall', 'other'],
    trades: ['floor_leveling'],
    questions: [
      {
        code: 'level_target_height',
        text: 'Has target finished floor height been agreed with client?',
        inputType: 'boolean',
      },
      {
        code: 'level_door_clearances',
        text: 'Have door/closet clearances been verified post-leveling?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'lv-01', text: 'Document pre-level floor variances with measurements', phase: 'precon', tags: ['documentation'], defaultAssigneeRole: 'Super' },
      { code: 'lv-02', text: 'Walk client through before/after level expectations', phase: 'precon', tags: ['client-approval'], defaultAssigneeRole: 'PM' },
      { code: 'lv-03', text: 'Verify all penetrations sealed before pour', phase: 'rough', tags: ['prep'], defaultAssigneeRole: 'Sub' },
      { code: 'lv-04', text: 'Check door swing clearances after leveling', phase: 'rough', tags: ['coordination'], defaultAssigneeRole: 'Super' },
    ],
  },

  // ============================================
  // BATH + WATERPROOFING
  // ============================================
  {
    id: 'bath-waterproofing',
    name: 'Bath Waterproofing',
    areaTypes: ['bath'],
    trades: ['waterproofing'],
    questions: [
      {
        code: 'wp_curb_type',
        text: 'What is the shower entry type?',
        inputType: 'select',
        options: ['Standard curb', 'Curbless/barrier-free', 'Tub surround'],
      },
      {
        code: 'wp_system',
        text: 'What waterproofing system is specified?',
        inputType: 'select',
        options: ['Hot mop', 'Sheet membrane (Kerdi/Laticrete)', 'Liquid membrane (RedGard)', 'CPE liner'],
      },
      {
        code: 'wp_linear_drain',
        text: 'Is a linear drain specified?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'wp-01', text: 'Verify slope to drain (1/4" per foot minimum)', phase: 'rough', tags: ['waterproofing', 'critical'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'wp-02', text: 'Confirm curb height and shower opening layout', phase: 'rough', tags: ['waterproofing'], defaultAssigneeRole: 'Super' },
      { code: 'wp-03', text: 'Photo-document pan test with standing water + timestamps', phase: 'rough', tags: ['waterproofing', 'documentation', 'critical'], defaultAssigneeRole: 'Super', riskLevel: 'high' },
      { code: 'wp-04', text: 'Verify waterproofing system matches specified product', phase: 'rough', tags: ['waterproofing', 'materials'], defaultAssigneeRole: 'PM' },
      { code: 'wp-05', text: 'All penetrations (niches, valves) properly sealed', phase: 'rough', tags: ['waterproofing', 'critical'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'wp-06', text: 'Curb wrapped and corners reinforced', phase: 'rough', tags: ['waterproofing'], defaultAssigneeRole: 'Sub' },
    ],
  },

  // ============================================
  // BATH + TILE
  // ============================================
  {
    id: 'bath-tile',
    name: 'Bath Tile',
    areaTypes: ['bath'],
    trades: ['tile'],
    questions: [
      {
        code: 'tile_layout_approval',
        text: 'Has tile layout been approved by client?',
        inputType: 'boolean',
      },
      {
        code: 'tile_accent_locations',
        text: 'Are there accent tiles or decorative details?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'bt-01', text: 'Tile layout approved by client before install', phase: 'precon', tags: ['client-approval'], defaultAssigneeRole: 'PM' },
      { code: 'bt-02', text: 'Verify tile cuts at edges and corners are acceptable', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Lead' },
      { code: 'bt-03', text: 'Check tile lippage in multiple lighting conditions', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Super' },
      { code: 'bt-04', text: 'Grout joints consistent and fully filled', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Lead' },
      { code: 'bt-05', text: 'Caulk all wet transitions (tub, counters, glass)', phase: 'finish', tags: ['waterproofing'], defaultAssigneeRole: 'Sub' },
    ],
  },

  // ============================================
  // BATH + PLUMBING (FINISH)
  // ============================================
  {
    id: 'bath-plumbing-finish',
    name: 'Bath Plumbing Fixtures',
    areaTypes: ['bath'],
    trades: ['plumbing'],
    questions: [
      {
        code: 'bath_fixture_brands',
        text: 'Have all fixture brands/models been confirmed?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'bp-01', text: 'All fixtures operate with no leaks or drips', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Sub' },
      { code: 'bp-02', text: 'Verify fan vents to exterior and operates quietly', phase: 'finish', tags: ['HVAC', 'code'], defaultAssigneeRole: 'Sub' },
      { code: 'bp-03', text: 'Hot/cold reversed check on all valves', phase: 'finish', tags: ['QA'], defaultAssigneeRole: 'Sub' },
      { code: 'bp-04', text: 'Confirm drain stoppers and overflow function', phase: 'punch', tags: ['QA'], defaultAssigneeRole: 'Lead' },
    ],
  },

  // ============================================
  // CURBLESS SHOWER SPECIFIC
  // ============================================
  {
    id: 'bath-curbless',
    name: 'Curbless Shower Details',
    areaTypes: ['bath'],
    trades: ['waterproofing', 'tile', 'floor_leveling'],
    questions: [
      {
        code: 'curbless_drain_type',
        text: 'What drain type is specified for curbless?',
        inputType: 'select',
        options: ['Linear drain', 'Point drain with 4-way slope', 'Trench drain'],
      },
      {
        code: 'curbless_floor_transition',
        text: 'How does bathroom floor transition to shower area?',
        inputType: 'select',
        options: ['Continuous tile', 'Different tile with transition', 'Threshold strip'],
      },
    ],
    checklistItems: [
      { code: 'cl-01', text: 'Verify shower floor is recessed correctly for drain', phase: 'rough', tags: ['waterproofing', 'critical'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'cl-02', text: 'Confirm slope consistency across entire shower floor', phase: 'rough', tags: ['waterproofing'], defaultAssigneeRole: 'Super', riskLevel: 'high' },
      { code: 'cl-03', text: 'Linear drain slope and alignment verified', phase: 'rough', tags: ['waterproofing'], defaultAssigneeRole: 'Sub' },
      { code: 'cl-04', text: 'Transition detail at shower entry waterproofed', phase: 'rough', tags: ['waterproofing', 'critical'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'cl-05', text: 'Water test: verify no water escapes shower area', phase: 'finish', tags: ['QA', 'critical'], defaultAssigneeRole: 'Super', riskLevel: 'high' },
    ],
  },

  // ============================================
  // OCCUPIED HOME
  // ============================================
  {
    id: 'occupied-daily',
    name: 'Occupied Home Daily Closeout',
    projectTypes: ['kitchen_remodel', 'bath_remodel', 'full_home_remodel', 'other'],
    areaTypes: ['kitchen', 'bath', 'bedroom', 'living', 'hall', 'other'],
    trades: ['demo', 'plumbing', 'electrical', 'hvac', 'cabinets', 'flooring', 'tile', 'paint', 'framing', 'drywall', 'other'],
    questions: [
      {
        code: 'occupied_living_areas',
        text: 'Which areas of the home are clients actively using?',
        inputType: 'multi-select',
        options: ['Kitchen', 'Primary bath', 'Other baths', 'Bedrooms', 'Living areas'],
      },
      {
        code: 'occupied_pets_children',
        text: 'Are there pets or children in the home?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'oc-01', text: 'All walk paths swept and free of trip hazards', phase: 'rough', tags: ['safety', 'occupied'], defaultAssigneeRole: 'Lead' },
      { code: 'oc-02', text: 'No tools left plugged in or energized overnight', phase: 'rough', tags: ['safety', 'occupied'], defaultAssigneeRole: 'Lead' },
      { code: 'oc-03', text: 'Client-accessible rooms are broom-clean', phase: 'rough', tags: ['courtesy', 'occupied'], defaultAssigneeRole: 'Lead' },
      { code: 'oc-04', text: 'Dust barriers intact and secured', phase: 'rough', tags: ['protection', 'occupied'], defaultAssigneeRole: 'Lead' },
      { code: 'oc-05', text: 'Daily photos added to log with brief notes', phase: 'rough', tags: ['documentation', 'occupied'], defaultAssigneeRole: 'Super' },
      { code: 'oc-06', text: 'Client updated on next day activities', phase: 'rough', tags: ['communication', 'occupied'], defaultAssigneeRole: 'Super' },
    ],
  },

  // ============================================
  // STRUCTURAL / FRAMING
  // ============================================
  {
    id: 'structural-framing',
    name: 'Structural & Framing',
    areaTypes: ['kitchen', 'bath', 'bedroom', 'living', 'hall', 'other'],
    trades: ['framing'],
    questions: [
      {
        code: 'struct_engineer_required',
        text: 'Are structural engineering plans required?',
        inputType: 'boolean',
      },
      {
        code: 'struct_permit_inspection',
        text: 'Is a structural framing inspection required?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'st-01', text: 'Structural engineering calcs approved by city', phase: 'precon', tags: ['permits', 'structural'], defaultAssigneeRole: 'PM', riskLevel: 'high' },
      { code: 'st-02', text: 'Verify beam/header sizes match engineering', phase: 'rough', tags: ['structural', 'critical'], defaultAssigneeRole: 'Super', riskLevel: 'high' },
      { code: 'st-03', text: 'Temporary shoring in place before cuts', phase: 'rough', tags: ['structural', 'safety'], defaultAssigneeRole: 'Sub', riskLevel: 'high' },
      { code: 'st-04', text: 'Photo-document all structural connections', phase: 'rough', tags: ['structural', 'documentation'], defaultAssigneeRole: 'Super' },
      { code: 'st-05', text: 'Framing inspection passed before close-up', phase: 'rough', tags: ['structural', 'inspection'], defaultAssigneeRole: 'PM', riskLevel: 'high' },
    ],
  },

  // ============================================
  // ELECTRICAL
  // ============================================
  {
    id: 'general-electrical',
    name: 'Electrical',
    areaTypes: ['kitchen', 'bath', 'bedroom', 'living', 'hall', 'exterior', 'other'],
    trades: ['electrical'],
    questions: [
      {
        code: 'elec_panel_capacity',
        text: 'Has panel capacity been verified for new loads?',
        inputType: 'boolean',
      },
      {
        code: 'elec_gfci_locations',
        text: 'Are GFCI/AFCI requirements understood?',
        inputType: 'boolean',
      },
    ],
    checklistItems: [
      { code: 'el-01', text: 'Verify electrical panel capacity for all new circuits', phase: 'precon', tags: ['electrical', 'code'], defaultAssigneeRole: 'PM' },
      { code: 'el-02', text: 'Confirm outlet/switch locations with client', phase: 'precon', tags: ['electrical', 'client-approval'], defaultAssigneeRole: 'PM' },
      { code: 'el-03', text: 'All circuits correctly sized and labeled', phase: 'rough', tags: ['electrical', 'inspection'], defaultAssigneeRole: 'Sub' },
      { code: 'el-04', text: 'GFCI/AFCI protection per current code', phase: 'rough', tags: ['electrical', 'code'], defaultAssigneeRole: 'Sub' },
      { code: 'el-05', text: 'Rough electrical inspection passed', phase: 'rough', tags: ['electrical', 'inspection'], defaultAssigneeRole: 'PM' },
    ],
  },
];

/**
 * Find templates matching area/trade criteria
 */
export function findAreaTradeTemplates(
  areaType: AreaType,
  trades: string[],
  projectType?: ProjectType
): AreaTradeTemplate[] {
  return AREA_TRADE_TEMPLATES.filter(template => {
    // Check area type match
    if (!template.areaTypes.includes(areaType)) return false;
    
    // Check trade intersection
    const hasTradeMatch = template.trades.some(t => trades.includes(t));
    if (!hasTradeMatch) return false;
    
    // Check project type if specified in template
    if (template.projectTypes && projectType) {
      if (!template.projectTypes.includes(projectType)) return false;
    }
    
    return true;
  });
}

/**
 * Get all questions for area/trade combination
 */
export function getAreaTradeQuestions(
  areaType: AreaType,
  trades: string[],
  projectType?: ProjectType
): AreaTradeQuestion[] {
  const templates = findAreaTradeTemplates(areaType, trades, projectType);
  const questions: AreaTradeQuestion[] = [];
  const seenCodes = new Set<string>();
  
  for (const template of templates) {
    for (const q of template.questions) {
      if (!seenCodes.has(q.code)) {
        seenCodes.add(q.code);
        questions.push(q);
      }
    }
  }
  
  return questions;
}

/**
 * Get all checklist items for area/trade combination
 */
export function getAreaTradeChecklistItems(
  areaType: AreaType,
  trades: string[],
  projectType?: ProjectType
): AreaTradeChecklistItem[] {
  const templates = findAreaTradeTemplates(areaType, trades, projectType);
  const items: AreaTradeChecklistItem[] = [];
  const seenCodes = new Set<string>();
  
  for (const template of templates) {
    for (const item of template.checklistItems) {
      if (!seenCodes.has(item.code)) {
        seenCodes.add(item.code);
        items.push(item);
      }
    }
  }
  
  // Sort by phase order
  const phaseOrder = ['precon', 'rough', 'finish', 'punch'];
  items.sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase));
  
  return items;
}
