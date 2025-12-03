// Smart Checklist Intelligence Engine
// Pure functions - no network calls

export type ProjectType = 'kitchen_remodel' | 'bath_remodel' | 'full_home_remodel' | 'other';

export interface ScopeBlockInput {
  id: string;
  title: string;
  costItems: {
    id: string;
    cost_code_id: string | null;
    cost_code_category: 'labor' | 'subs' | 'materials' | 'other' | null;
    cost_code_code: string | null;
    cost_code_name: string | null;
    area_label: string | null;
    group_label: string | null;
  }[];
}

export interface ChecklistContextInput {
  projectType: ProjectType;
  scopeBlocks: ScopeBlockInput[];
  answers: Record<string, any>;
}

export interface DerivedFlags {
  hasStructural: boolean;
  hasWallRemovals: boolean;
  hasNewShowerPan: boolean;
  hasCurblessShower: boolean;
  hasSteamShower: boolean;
  hasWaterproofingScope: boolean;
  hasExteriorWork: boolean;
  hasTileFloor: boolean;
  hasEngineeredFloor: boolean;
  hasCustomCabinets: boolean;
  isOccupiedDuringWork: boolean;
  hasMultipleWetAreas: boolean;
  includesKitchen: boolean;
  includesBaths: boolean;
  includesElectricalHeavy: boolean;
  includesHVAC: boolean;
}

export interface DetectedArea {
  label: string;
  type: 'kitchen' | 'bath' | 'bedroom' | 'living' | 'hall' | 'exterior' | 'other';
  scopeBlockId: string;
}

export interface RiskFlags {
  structuralRisk: boolean;
  waterproofingRisk: boolean;
  inspectionHeavy: boolean;
  scheduleComplex: boolean;
}

export interface ChecklistContext {
  derivedFlags: DerivedFlags;
  detectedAreas: DetectedArea[];
  riskScore: number;
  riskFlags: RiskFlags;
}

// Helper: check if any cost code matches a pattern
function hasCostCodeMatch(
  scopeBlocks: ScopeBlockInput[],
  patterns: string[]
): boolean {
  const lowerPatterns = patterns.map(p => p.toLowerCase());
  
  for (const block of scopeBlocks) {
    for (const item of block.costItems) {
      const codeName = (item.cost_code_name || '').toLowerCase();
      const codeCode = (item.cost_code_code || '').toLowerCase();
      
      for (const pattern of lowerPatterns) {
        if (codeName.includes(pattern) || codeCode.includes(pattern)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Helper: check if any scope block title matches a pattern
function hasTitleMatch(scopeBlocks: ScopeBlockInput[], patterns: string[]): boolean {
  const lowerPatterns = patterns.map(p => p.toLowerCase());
  
  for (const block of scopeBlocks) {
    const title = block.title.toLowerCase();
    for (const pattern of lowerPatterns) {
      if (title.includes(pattern)) {
        return true;
      }
    }
  }
  return false;
}

// Helper: count cost codes matching pattern
function countCostCodeMatches(scopeBlocks: ScopeBlockInput[], patterns: string[]): number {
  const lowerPatterns = patterns.map(p => p.toLowerCase());
  let count = 0;
  
  for (const block of scopeBlocks) {
    for (const item of block.costItems) {
      const codeName = (item.cost_code_name || '').toLowerCase();
      const codeCode = (item.cost_code_code || '').toLowerCase();
      
      for (const pattern of lowerPatterns) {
        if (codeName.includes(pattern) || codeCode.includes(pattern)) {
          count++;
          break;
        }
      }
    }
  }
  return count;
}

// Detect area type from text
function detectAreaType(text: string): DetectedArea['type'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('bath') || lower.includes('shower') || lower.includes('powder') || lower.includes('toilet')) return 'bath';
  if (lower.includes('bedroom') || lower.includes('master')) return 'bedroom';
  if (lower.includes('living') || lower.includes('family') || lower.includes('great')) return 'living';
  if (lower.includes('hall') || lower.includes('entry') || lower.includes('foyer')) return 'hall';
  if (lower.includes('exterior') || lower.includes('deck') || lower.includes('balcony') || lower.includes('porch') || lower.includes('patio')) return 'exterior';
  
  return 'other';
}

/**
 * Main intelligence function - builds context from project data
 * PURE function - no network calls
 */
export function buildChecklistContext(input: ChecklistContextInput): ChecklistContext {
  const { projectType, scopeBlocks, answers } = input;
  
  // Derive all flags
  const hasWallRemovals = 
    answers['has_wall_removals'] === true ||
    hasCostCodeMatch(scopeBlocks, ['wall removal', 'demo wall', 'header', 'wall demo']) ||
    (hasTitleMatch(scopeBlocks, ['wall']) && hasTitleMatch(scopeBlocks, ['demo']));
  
  const hasStructural = 
    hasWallRemovals ||
    hasCostCodeMatch(scopeBlocks, ['beam', 'header', 'structural', 'moment frame', 'lvl', 'glulam', 'post', 'shear wall']) ||
    (answers['structural_scope'] && Array.isArray(answers['structural_scope']) && answers['structural_scope'].length > 0 && !answers['structural_scope'].includes('none'));
  
  const hasNewShowerPan = 
    (answers['wet_area_scope'] && Array.isArray(answers['wet_area_scope']) && answers['wet_area_scope'].includes('new shower pan')) ||
    hasCostCodeMatch(scopeBlocks, ['shower pan', 'mud pan', 'mortar bed']);
  
  const hasCurblessShower = 
    (answers['wet_area_scope'] && Array.isArray(answers['wet_area_scope']) && answers['wet_area_scope'].includes('curbless')) ||
    (answers['waterproofing_level'] === 'curbless / linear drain') ||
    hasCostCodeMatch(scopeBlocks, ['linear drain', 'curbless', 'barrier free']);
  
  const hasSteamShower = 
    (answers['wet_area_scope'] && Array.isArray(answers['wet_area_scope']) && answers['wet_area_scope'].includes('steam shower')) ||
    hasCostCodeMatch(scopeBlocks, ['steam', 'steam shower', 'steam generator']);
  
  const hasWaterproofingScope = 
    hasNewShowerPan ||
    hasCurblessShower ||
    hasCostCodeMatch(scopeBlocks, ['waterproof', 'pan', 'hot mop', 'sheet membrane', 'kerdi', 'redguard', 'laticrete']) ||
    (projectType === 'bath_remodel' && answers['wet_area_scope'] && Array.isArray(answers['wet_area_scope']) && answers['wet_area_scope'].length > 0);
  
  const hasExteriorWork = 
    (answers['exterior_scope'] && Array.isArray(answers['exterior_scope']) && answers['exterior_scope'].length > 0) ||
    hasTitleMatch(scopeBlocks, ['exterior', 'deck', 'balcony', 'porch', 'patio', 'siding', 'stucco', 'roof']);
  
  const hasTileFloor = 
    answers['flooring_scope'] === 'new tile' ||
    hasCostCodeMatch(scopeBlocks, ['tile floor', 'floor tile', 'porcelain', 'ceramic floor']);
  
  const hasEngineeredFloor = 
    answers['flooring_scope'] === 'new engineered wood' ||
    hasCostCodeMatch(scopeBlocks, ['engineered', 'lvp', 'vinyl plank', 'laminate']);
  
  const hasCustomCabinets = 
    hasCostCodeMatch(scopeBlocks, ['custom cabinet', 'semi-custom', 'cabinet install']);
  
  const isOccupiedDuringWork = answers['is_occupied'] === true;
  
  // Count wet areas
  const wetAreaCount = scopeBlocks.filter(block => {
    const title = block.title.toLowerCase();
    return title.includes('bath') || title.includes('shower') || title.includes('powder');
  }).length;
  const hasMultipleWetAreas = wetAreaCount > 1;
  
  const includesKitchen = 
    projectType === 'kitchen_remodel' ||
    (answers['interior_scope'] && Array.isArray(answers['interior_scope']) && answers['interior_scope'].includes('kitchen')) ||
    hasTitleMatch(scopeBlocks, ['kitchen']);
  
  const includesBaths = 
    projectType === 'bath_remodel' ||
    (answers['interior_scope'] && Array.isArray(answers['interior_scope']) && answers['interior_scope'].includes('baths')) ||
    hasTitleMatch(scopeBlocks, ['bath', 'shower', 'powder']);
  
  const electricalCodeCount = countCostCodeMatches(scopeBlocks, ['elec', 'lighting', 'panel', 'circuit', 'wire', 'outlet', 'switch']);
  const includesElectricalHeavy = 
    electricalCodeCount >= 3 ||
    (answers['interior_scope'] && Array.isArray(answers['interior_scope']) && answers['interior_scope'].includes('lighting'));
  
  const includesHVAC = 
    hasCostCodeMatch(scopeBlocks, ['hvac', 'furnace', 'ac', 'duct', 'mini split', 'heat pump']);
  
  const derivedFlags: DerivedFlags = {
    hasStructural,
    hasWallRemovals,
    hasNewShowerPan,
    hasCurblessShower,
    hasSteamShower,
    hasWaterproofingScope,
    hasExteriorWork,
    hasTileFloor,
    hasEngineeredFloor,
    hasCustomCabinets,
    isOccupiedDuringWork,
    hasMultipleWetAreas,
    includesKitchen,
    includesBaths,
    includesElectricalHeavy,
    includesHVAC,
  };
  
  // Detect areas from scope blocks
  const detectedAreas: DetectedArea[] = [];
  const seenLabels = new Set<string>();
  
  for (const block of scopeBlocks) {
    // From block title
    const titleType = detectAreaType(block.title);
    if (!seenLabels.has(block.title)) {
      seenLabels.add(block.title);
      detectedAreas.push({
        label: block.title,
        type: titleType,
        scopeBlockId: block.id,
      });
    }
    
    // From cost item area labels
    for (const item of block.costItems) {
      if (item.area_label && !seenLabels.has(item.area_label)) {
        seenLabels.add(item.area_label);
        detectedAreas.push({
          label: item.area_label,
          type: detectAreaType(item.area_label),
          scopeBlockId: block.id,
        });
      }
    }
  }
  
  // Calculate risk score
  let riskScore = 10;
  if (hasStructural) riskScore += 20;
  if (hasWaterproofingScope) riskScore += 20;
  if (isOccupiedDuringWork) riskScore += 15;
  if (includesElectricalHeavy) riskScore += 10;
  if (projectType === 'full_home_remodel') riskScore += 10;
  if (hasCurblessShower) riskScore += 10;
  if (hasSteamShower) riskScore += 5;
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // Risk flags
  const riskFlags: RiskFlags = {
    structuralRisk: hasStructural,
    waterproofingRisk: hasWaterproofingScope,
    inspectionHeavy: hasStructural || hasWaterproofingScope || includesElectricalHeavy,
    scheduleComplex: projectType === 'full_home_remodel' || hasMultipleWetAreas || (includesKitchen && includesBaths),
  };
  
  return {
    derivedFlags,
    detectedAreas,
    riskScore,
    riskFlags,
  };
}

/**
 * Get risk level label from score
 */
export function getRiskLabel(riskScore: number): { label: string; level: 'low' | 'medium' | 'high' } {
  if (riskScore < 40) return { label: 'Low complexity', level: 'low' };
  if (riskScore < 70) return { label: 'Moderate risk', level: 'medium' };
  return { label: 'High risk – pay extra attention', level: 'high' };
}

/**
 * Get key insight bullets from context
 */
export function getInsightBullets(context: ChecklistContext): string[] {
  const bullets: string[] = [];
  const { derivedFlags, detectedAreas } = context;
  
  if (derivedFlags.hasStructural) {
    bullets.push('Structural elements detected');
  }
  if (derivedFlags.hasWaterproofingScope) {
    bullets.push('Waterproofing / wet area scope detected');
  }
  if (derivedFlags.isOccupiedDuringWork) {
    bullets.push('Occupied during work');
  }
  if (derivedFlags.includesElectricalHeavy) {
    bullets.push('Heavy electrical scope');
  }
  if (derivedFlags.hasCurblessShower) {
    bullets.push('Curbless shower (critical waterproofing)');
  }
  if (derivedFlags.hasSteamShower) {
    bullets.push('Steam shower installation');
  }
  
  // Count area types
  const kitchenCount = detectedAreas.filter(a => a.type === 'kitchen').length;
  const bathCount = detectedAreas.filter(a => a.type === 'bath').length;
  
  if (kitchenCount > 0 || bathCount > 0) {
    const parts: string[] = [];
    if (kitchenCount > 0) parts.push(`${kitchenCount} kitchen${kitchenCount > 1 ? 's' : ''}`);
    if (bathCount > 0) parts.push(`${bathCount} bath${bathCount > 1 ? 's' : ''}`);
    bullets.push(`Multi-area project: ${parts.join(', ')}`);
  }
  
  return bullets;
}
