// Area × Trade Matrix Detection
// Pure functions - no network calls

export type AreaType = 'kitchen' | 'bath' | 'bedroom' | 'living' | 'hall' | 'exterior' | 'other';
export type TradeType = 
  | 'demo' | 'plumbing' | 'electrical' | 'hvac' | 'cabinets' | 'countertops'
  | 'flooring' | 'floor_leveling' | 'tile' | 'waterproofing' | 'paint'
  | 'framing' | 'drywall' | 'insulation' | 'roofing' | 'windows' | 'doors'
  | 'appliances' | 'trim' | 'hardware' | 'other';

export interface AreaTradeInput {
  scopeBlocks: {
    id: string;
    title: string | null;
    costItems: {
      id: string;
      cost_code_id: string | null;
      cost_code_code: string | null;
      cost_code_name: string | null;
      area_label: string | null;
    }[];
  }[];
}

export interface DetectedAreaWithKey {
  key: string;
  type: AreaType;
  scopeBlockId: string;
}

export interface AreaTradeScope {
  areaKey: string;
  trades: TradeType[];
}

export interface AreaTradeMatrix {
  areas: DetectedAreaWithKey[];
  areaTradeScopes: AreaTradeScope[];
}

// Detect area type from text
function detectAreaTypeFromText(text: string): AreaType {
  const lower = (text || '').toLowerCase();
  
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('bath') || lower.includes('powder') || lower.includes('shower')) return 'bath';
  if (lower.includes('living') || lower.includes('family') || lower.includes('great room')) return 'living';
  if (lower.includes('bed') || lower.includes('primary') || lower.includes('guest') || lower.includes('master')) return 'bedroom';
  if (lower.includes('hall') || lower.includes('corridor') || lower.includes('entry') || lower.includes('foyer')) return 'hall';
  if (lower.includes('deck') || lower.includes('balcony') || lower.includes('patio') || lower.includes('exterior') || lower.includes('porch')) return 'exterior';
  
  return 'other';
}

// Trade detection patterns
const TRADE_PATTERNS: Record<TradeType, string[]> = {
  demo: ['demo', 'demolition', 'dem-', 'haul', 'abatement'],
  plumbing: ['plumb', 'pl-', 'fixture', 'faucet', 'toilet', 'sink', 'drain', 'pipe', 'valve', 'water heater'],
  electrical: ['elec', 'el-', 'lighting', 'light', 'panel', 'circuit', 'wire', 'outlet', 'switch', 'gfci', 'afci'],
  hvac: ['hvac', 'mechanical', 'furnace', 'ac', 'duct', 'mini split', 'heat pump', 'vent', 'exhaust'],
  cabinets: ['cab', 'cabinet', 'cabs'],
  countertops: ['ct-', 'counter', 'quartz', 'granite', 'marble', 'stone', 'solid surface', 'laminate top'],
  flooring: ['flr', 'floor', 'lvp', 'lvt', 'engineered', 'hardwood', 'carpet', 'vinyl plank'],
  floor_leveling: ['level', 'floor level', 'self-level', 'gypcrete', 'underlayment'],
  tile: ['tile', 'ceramic', 'porcelain', 'mosaic', 'backsplash'],
  waterproofing: ['waterproof', 'hot mop', 'pan liner', 'schluter', 'kerdi', 'redguard', 'laticrete', 'membrane'],
  paint: ['paint', 'pnt', 'primer', 'finish coat', 'stain', 'lacquer'],
  framing: ['fram', 'frm', 'stud', 'header', 'beam', 'structural', 'lvl', 'post', 'joist'],
  drywall: ['drywall', 'drw', 'gypsum', 'sheetrock', 'texture', 'tape and mud'],
  insulation: ['insul', 'ins-', 'batt', 'blown', 'foam', 'r-value'],
  roofing: ['roof', 'shingle', 'flashing', 'gutter'],
  windows: ['window', 'wnd', 'glazing', 'skylight'],
  doors: ['door', 'dr-', 'entry', 'slider', 'pocket door', 'bi-fold'],
  appliances: ['appl', 'appliance', 'range', 'oven', 'dishwasher', 'refrigerator', 'microwave', 'hood'],
  trim: ['trim', 'molding', 'baseboard', 'crown', 'casing', 'millwork'],
  hardware: ['hardware', 'hdw', 'knob', 'pull', 'hinge'],
  other: [],
};

// Detect trade from cost code
function detectTradeFromCostCode(code: string | null, name: string | null): TradeType | null {
  const searchText = `${code || ''} ${name || ''}`.toLowerCase();
  
  for (const [trade, patterns] of Object.entries(TRADE_PATTERNS)) {
    if (trade === 'other') continue;
    for (const pattern of patterns) {
      if (searchText.includes(pattern)) {
        return trade as TradeType;
      }
    }
  }
  
  return null;
}

/**
 * Build Area × Trade Matrix from scope blocks
 * PURE function - no network calls
 */
export function buildAreaTradeMatrix(input: AreaTradeInput): AreaTradeMatrix {
  const { scopeBlocks } = input;
  const areas: DetectedAreaWithKey[] = [];
  const areaTradeMap = new Map<string, Set<TradeType>>();
  const seenAreaKeys = new Set<string>();
  
  for (const block of scopeBlocks) {
    const blockTitle = block.title || 'Unnamed Section';
    
    // Detect area from block title
    if (!seenAreaKeys.has(blockTitle)) {
      seenAreaKeys.add(blockTitle);
      const areaType = detectAreaTypeFromText(blockTitle);
      areas.push({
        key: blockTitle,
        type: areaType,
        scopeBlockId: block.id,
      });
      areaTradeMap.set(blockTitle, new Set());
    }
    
    // Process cost items
    for (const item of block.costItems) {
      // Also detect areas from area_label
      if (item.area_label && !seenAreaKeys.has(item.area_label)) {
        seenAreaKeys.add(item.area_label);
        const areaType = detectAreaTypeFromText(item.area_label);
        areas.push({
          key: item.area_label,
          type: areaType,
          scopeBlockId: block.id,
        });
        areaTradeMap.set(item.area_label, new Set());
      }
      
      // Detect trade from cost code
      const trade = detectTradeFromCostCode(item.cost_code_code, item.cost_code_name);
      if (trade) {
        // Add trade to block's area
        const blockTrades = areaTradeMap.get(blockTitle);
        if (blockTrades) {
          blockTrades.add(trade);
        }
        
        // Also add to area_label's area if different
        if (item.area_label && item.area_label !== blockTitle) {
          const areaTrades = areaTradeMap.get(item.area_label);
          if (areaTrades) {
            areaTrades.add(trade);
          }
        }
      }
    }
  }
  
  // Convert map to array
  const areaTradeScopes: AreaTradeScope[] = [];
  for (const [areaKey, trades] of areaTradeMap) {
    areaTradeScopes.push({
      areaKey,
      trades: Array.from(trades),
    });
  }
  
  return { areas, areaTradeScopes };
}

/**
 * Get trades for a specific area
 */
export function getTradesForArea(matrix: AreaTradeMatrix, areaKey: string): TradeType[] {
  const scope = matrix.areaTradeScopes.find(s => s.areaKey === areaKey);
  return scope?.trades || [];
}

/**
 * Check if a specific area has a specific trade
 */
export function areaHasTrade(matrix: AreaTradeMatrix, areaKey: string, trade: TradeType): boolean {
  const trades = getTradesForArea(matrix, areaKey);
  return trades.includes(trade);
}

/**
 * Get all areas of a specific type
 */
export function getAreasByType(matrix: AreaTradeMatrix, type: AreaType): DetectedAreaWithKey[] {
  return matrix.areas.filter(a => a.type === type);
}

/**
 * Get summary of matrix for display
 */
export function getAreaTradeSummary(matrix: AreaTradeMatrix): {
  totalAreas: number;
  totalTrades: number;
  areaTypeCounts: Record<AreaType, number>;
  tradeCounts: Record<TradeType, number>;
} {
  const areaTypeCounts: Record<AreaType, number> = {
    kitchen: 0, bath: 0, bedroom: 0, living: 0, hall: 0, exterior: 0, other: 0,
  };
  
  const tradeCounts: Partial<Record<TradeType, number>> = {};
  const allTrades = new Set<TradeType>();
  
  for (const area of matrix.areas) {
    areaTypeCounts[area.type]++;
  }
  
  for (const scope of matrix.areaTradeScopes) {
    for (const trade of scope.trades) {
      allTrades.add(trade);
      tradeCounts[trade] = (tradeCounts[trade] || 0) + 1;
    }
  }
  
  return {
    totalAreas: matrix.areas.length,
    totalTrades: allTrades.size,
    areaTypeCounts,
    tradeCounts: tradeCounts as Record<TradeType, number>,
  };
}
