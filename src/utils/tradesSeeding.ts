/**
 * Standard trades for residential + high-end remodeling GC
 * Each trade will auto-generate 3 cost codes: {KEY}-L, {KEY}-M, {KEY}-S
 */
export interface StandardTrade {
  key: string;
  name: string;
  description: string;
}

export const STANDARD_REMODELING_TRADES: StandardTrade[] = [
  {
    key: 'DEMO',
    name: 'Demolition',
    description: 'Selective and structural demolition, haul-off',
  },
  {
    key: 'CONC',
    name: 'Concrete & Foundations',
    description: 'Footings, slabs, foundations, flatwork',
  },
  {
    key: 'FRAM',
    name: 'Framing & Rough Carpentry',
    description: 'Structural framing, blocking, sheathing',
  },
  {
    key: 'STEEL',
    name: 'Structural Steel',
    description: 'Structural steel, moment frames, lintels',
  },
  {
    key: 'WPF',
    name: 'Waterproofing',
    description: 'Membranes, deck and wall waterproofing, below-grade systems',
  },
  {
    key: 'ROOF',
    name: 'Roofing',
    description: 'Roofing systems and related flashings',
  },
  {
    key: 'WD',
    name: 'Windows & Exterior Doors',
    description: 'Supply and install windows, sliders, exterior doors',
  },
  {
    key: 'EXT',
    name: 'Exterior Cladding',
    description: 'Stucco, siding, exterior trim and façade systems',
  },
  {
    key: 'INSL',
    name: 'Insulation',
    description: 'Thermal and acoustic insulation',
  },
  {
    key: 'DRYW',
    name: 'Drywall & Taping',
    description: 'Board, tape, mud, texture',
  },
  {
    key: 'PAINT',
    name: 'Interior Painting',
    description: 'Interior paint, stain, coatings',
  },
  {
    key: 'TILE',
    name: 'Tile & Stone',
    description: 'Floor and wall tile, stone, shower pans',
  },
  {
    key: 'FLR',
    name: 'Flooring',
    description: 'Hardwood, engineered, LVP, carpet, underlayments',
  },
  {
    key: 'CAB',
    name: 'Cabinets & Millwork',
    description: 'Custom and semi-custom cabinetry, millwork',
  },
  {
    key: 'TOPS',
    name: 'Countertops',
    description: 'Stone, quartz, solid surface, installation',
  },
  {
    key: 'PLUM',
    name: 'Plumbing',
    description: 'Rough and finish plumbing',
  },
  {
    key: 'HVAC',
    name: 'HVAC',
    description: 'Heating, cooling, ventilation',
  },
  {
    key: 'ELEC',
    name: 'Electrical',
    description: 'Rough and finish electrical',
  },
  {
    key: 'LV',
    name: 'Low Voltage',
    description: 'Data, AV, security, low-voltage wiring and devices',
  },
  {
    key: 'GLASS',
    name: 'Glass & Shower Enclosures',
    description: 'Glass railings, shower doors, mirrors',
  },
  {
    key: 'LAND',
    name: 'Landscaping',
    description: 'Exterior landscape, irrigation, pavers, site walls',
  },
  {
    key: 'FENCE',
    name: 'Fencing & Gates',
    description: 'Site fencing, gates, railings',
  },
  {
    key: 'POOL',
    name: 'Pools & Spas',
    description: 'Pool / spa construction and equipment',
  },
  {
    key: 'APPL',
    name: 'Appliances Install',
    description: 'Install of appliances, specialty fixtures',
  },
  {
    key: 'GC',
    name: 'General Conditions',
    description: 'Supervision, project management, temp facilities',
  },
];

/**
 * Generate cost code details from trade key
 */
export function generateCostCodesForTrade(tradeKey: string, tradeName: string) {
  return [
    {
      code: `${tradeKey}-L`,
      name: `Labor – ${tradeName}`,
      category: 'labor' as const,
    },
    {
      code: `${tradeKey}-M`,
      name: `Materials – ${tradeName}`,
      category: 'materials' as const,
    },
    {
      code: `${tradeKey}-S`,
      name: `Subcontract – ${tradeName}`,
      category: 'subs' as const,
    },
  ];
}
