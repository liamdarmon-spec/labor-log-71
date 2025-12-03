// Smart Checklist Planner
// Maps context to planned checklists

import { ChecklistContext, DerivedFlags, DetectedArea, ProjectType } from './intel';

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  phase: string;
  tags: string[];
  is_active: boolean;
  items?: { id: string; label: string; sort_order: number; required: boolean }[];
}

export interface PlannedChecklist {
  id: string;
  phase: string;
  title: string;
  templateIds: string[];
  scopeBlockId?: string;
  reasonTags: string[];
  riskLevel: 'low' | 'medium' | 'high';
  itemCount: number;
  enabled: boolean;
}

interface PlannerInput {
  projectType: ProjectType;
  context: ChecklistContext;
  templates: ChecklistTemplate[];
}

// Generate unique temp ID
function tempId(): string {
  return `temp-${Math.random().toString(36).substr(2, 9)}`;
}

// Determine risk level for a checklist
function determineRiskLevel(
  reasonTags: string[],
  globalRiskScore: number
): 'low' | 'medium' | 'high' {
  // High-risk tags
  if (reasonTags.some(tag => ['waterproofing', 'structural', 'curbless'].includes(tag))) {
    return 'high';
  }
  
  // Medium if global risk is high
  if (globalRiskScore >= 60) {
    return 'medium';
  }
  
  // Some tags warrant medium
  if (reasonTags.some(tag => ['electrical', 'occupied', 'hvac'].includes(tag))) {
    return 'medium';
  }
  
  return 'low';
}

// Find templates matching criteria
function findTemplates(
  templates: ChecklistTemplate[],
  criteria: {
    projectType?: string;
    phase?: string;
    tags?: string[];
    nameContains?: string;
  }
): ChecklistTemplate[] {
  return templates.filter(t => {
    if (criteria.projectType && t.project_type !== criteria.projectType && t.project_type !== 'global') {
      return false;
    }
    if (criteria.phase && t.phase !== criteria.phase) {
      return false;
    }
    if (criteria.tags && criteria.tags.length > 0) {
      const templateTags = t.tags || [];
      if (!criteria.tags.some(tag => templateTags.includes(tag))) {
        return false;
      }
    }
    if (criteria.nameContains) {
      if (!t.name.toLowerCase().includes(criteria.nameContains.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Plan checklists based on project context
 */
export function planChecklists(input: PlannerInput): PlannedChecklist[] {
  const { projectType, context, templates } = input;
  const { derivedFlags, detectedAreas, riskScore } = context;
  const planned: PlannedChecklist[] = [];
  const addedTemplateIds = new Set<string>();
  
  // Helper to add a planned checklist
  const addPlanned = (
    template: ChecklistTemplate,
    reasonTags: string[],
    scopeBlockId?: string
  ) => {
    if (addedTemplateIds.has(template.id)) return;
    addedTemplateIds.add(template.id);
    
    const riskLevel = determineRiskLevel(reasonTags, riskScore);
    
    planned.push({
      id: tempId(),
      phase: template.phase,
      title: template.name,
      templateIds: [template.id],
      scopeBlockId,
      reasonTags,
      riskLevel,
      itemCount: template.items?.length || 0,
      enabled: true,
    });
  };
  
  // === KITCHEN REMODEL ===
  if (projectType === 'kitchen_remodel' || derivedFlags.includesKitchen) {
    // Always include precon and finish for kitchen
    const kitchenPrecon = findTemplates(templates, { 
      tags: ['kitchen'], 
      phase: 'precon' 
    });
    kitchenPrecon.forEach(t => addPlanned(t, ['kitchen', 'precon']));
    
    const kitchenRough = findTemplates(templates, { 
      tags: ['kitchen'], 
      phase: 'rough' 
    });
    kitchenRough.forEach(t => addPlanned(t, ['kitchen', 'rough']));
    
    const kitchenFinish = findTemplates(templates, { 
      tags: ['kitchen'], 
      phase: 'finish' 
    });
    kitchenFinish.forEach(t => addPlanned(t, ['kitchen', 'finish']));
    
    // Structural checklist if walls/structural work
    if (derivedFlags.hasStructural) {
      const structural = findTemplates(templates, { 
        tags: ['structural'] 
      });
      structural.forEach(t => addPlanned(t, ['structural', 'walls']));
    }
    
    // Electrical heavy
    if (derivedFlags.includesElectricalHeavy) {
      const electrical = findTemplates(templates, { 
        tags: ['electrical'] 
      });
      electrical.forEach(t => addPlanned(t, ['electrical', 'kitchen']));
    }
  }
  
  // === BATH REMODEL ===
  if (projectType === 'bath_remodel' || derivedFlags.includesBaths) {
    // Always include precon and finish for bath
    const bathPrecon = findTemplates(templates, { 
      tags: ['bath'], 
      phase: 'precon' 
    });
    bathPrecon.forEach(t => addPlanned(t, ['bath', 'precon']));
    
    const bathFinish = findTemplates(templates, { 
      tags: ['bath'], 
      phase: 'finish' 
    });
    bathFinish.forEach(t => addPlanned(t, ['bath', 'finish']));
    
    // Waterproofing checklist
    if (derivedFlags.hasWaterproofingScope) {
      const waterproofing = findTemplates(templates, { 
        tags: ['waterproofing'] 
      });
      waterproofing.forEach(t => addPlanned(t, ['waterproofing', 'bath']));
    }
    
    // Curbless shower special checklist
    if (derivedFlags.hasCurblessShower) {
      const curbless = findTemplates(templates, { 
        tags: ['curbless'] 
      });
      if (curbless.length > 0) {
        curbless.forEach(t => addPlanned(t, ['curbless', 'waterproofing']));
      } else {
        // Fallback to waterproofing template with curbless reason
        const waterproofing = findTemplates(templates, { 
          tags: ['waterproofing'] 
        });
        waterproofing.forEach(t => addPlanned(t, ['curbless', 'waterproofing']));
      }
    }
    
    // Rough plumbing
    if (derivedFlags.hasNewShowerPan || derivedFlags.hasCurblessShower) {
      const roughPlumbing = findTemplates(templates, { 
        tags: ['plumbing'], 
        phase: 'rough' 
      });
      roughPlumbing.forEach(t => addPlanned(t, ['plumbing', 'rough']));
    }
  }
  
  // === FULL HOME REMODEL ===
  if (projectType === 'full_home_remodel') {
    // Add templates based on detected areas
    const kitchenAreas = detectedAreas.filter(a => a.type === 'kitchen');
    const bathAreas = detectedAreas.filter(a => a.type === 'bath');
    
    // For each kitchen area
    kitchenAreas.forEach(area => {
      const kitchenTemplates = findTemplates(templates, { tags: ['kitchen'] });
      kitchenTemplates.forEach(t => addPlanned(t, ['kitchen', area.label], area.scopeBlockId));
    });
    
    // For each bath area
    bathAreas.forEach(area => {
      const bathTemplates = findTemplates(templates, { tags: ['bath'] });
      bathTemplates.forEach(t => addPlanned(t, ['bath', area.label], area.scopeBlockId));
    });
    
    // General precon for full home
    const generalPrecon = findTemplates(templates, { 
      projectType: 'full_home_remodel',
      phase: 'precon' 
    });
    generalPrecon.forEach(t => addPlanned(t, ['full_home', 'precon']));
    
    // Structural if needed
    if (derivedFlags.hasStructural) {
      const structural = findTemplates(templates, { tags: ['structural'] });
      structural.forEach(t => addPlanned(t, ['structural']));
    }
    
    // Exterior if needed
    if (derivedFlags.hasExteriorWork) {
      const exterior = findTemplates(templates, { tags: ['exterior'] });
      exterior.forEach(t => addPlanned(t, ['exterior']));
    }
  }
  
  // === OCCUPIED HOME (any project type) ===
  if (derivedFlags.isOccupiedDuringWork) {
    const occupiedTemplates = findTemplates(templates, { tags: ['occupied'] });
    if (occupiedTemplates.length > 0) {
      occupiedTemplates.forEach(t => addPlanned(t, ['occupied']));
    } else {
      // Try to find by name
      const byName = templates.filter(t => 
        t.name.toLowerCase().includes('occupied') || 
        t.name.toLowerCase().includes('daily closeout')
      );
      byName.forEach(t => addPlanned(t, ['occupied']));
    }
  }
  
  // === FINAL WALKTHROUGH (always for any project) ===
  const finalWalkthrough = findTemplates(templates, { 
    phase: 'punch',
    tags: ['final', 'walkthrough']
  });
  if (finalWalkthrough.length === 0) {
    // Try by name
    const byName = templates.filter(t => 
      t.name.toLowerCase().includes('walkthrough') || 
      t.name.toLowerCase().includes('punch')
    );
    byName.forEach(t => addPlanned(t, ['final', 'punch']));
  } else {
    finalWalkthrough.forEach(t => addPlanned(t, ['final', 'punch']));
  }
  
  // Sort by phase order, then by risk level
  const phaseOrder = ['precon', 'rough', 'finish', 'punch', 'warranty'];
  const riskOrder = { high: 0, medium: 1, low: 2 };
  
  planned.sort((a, b) => {
    const phaseA = phaseOrder.indexOf(a.phase);
    const phaseB = phaseOrder.indexOf(b.phase);
    if (phaseA !== phaseB) return phaseA - phaseB;
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
  
  return planned;
}

/**
 * Get recommended checklists that are missing
 */
export function getRecommendedMissing(
  context: ChecklistContext,
  existingChecklists: { title: string; phase: string }[],
  templates: ChecklistTemplate[]
): PlannedChecklist[] {
  const { derivedFlags, riskScore } = context;
  const missing: PlannedChecklist[] = [];
  
  // Check for missing high-risk checklists
  if (derivedFlags.hasWaterproofingScope) {
    const hasWaterproofing = existingChecklists.some(c => 
      c.title.toLowerCase().includes('waterproof')
    );
    if (!hasWaterproofing) {
      const waterproofTemplates = templates.filter(t => 
        (t.tags || []).includes('waterproofing')
      );
      waterproofTemplates.forEach(t => {
        missing.push({
          id: tempId(),
          phase: t.phase,
          title: t.name,
          templateIds: [t.id],
          reasonTags: ['waterproofing', 'recommended'],
          riskLevel: 'high',
          itemCount: t.items?.length || 0,
          enabled: true,
        });
      });
    }
  }
  
  if (derivedFlags.hasStructural) {
    const hasStructural = existingChecklists.some(c => 
      c.title.toLowerCase().includes('structural')
    );
    if (!hasStructural) {
      const structuralTemplates = templates.filter(t => 
        (t.tags || []).includes('structural')
      );
      structuralTemplates.forEach(t => {
        missing.push({
          id: tempId(),
          phase: t.phase,
          title: t.name,
          templateIds: [t.id],
          reasonTags: ['structural', 'recommended'],
          riskLevel: 'high',
          itemCount: t.items?.length || 0,
          enabled: true,
        });
      });
    }
  }
  
  return missing;
}
