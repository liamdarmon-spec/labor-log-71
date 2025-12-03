import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectChecklists, ChecklistPhase, ProjectChecklist } from '@/hooks/useChecklists';
import { ChecklistDetailDrawer } from './ChecklistDetailDrawer';
import { SmartChecklistWizard } from './SmartChecklistWizard';
import { useEstimatesV2 } from '@/hooks/useEstimatesV2';
import { useScopeBlocks } from '@/hooks/useScopeBlocks';
import { ProjectType } from '@/hooks/useChecklists';

const PHASES: { value: ChecklistPhase | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'precon', label: 'Precon' },
  { value: 'rough', label: 'Rough' },
  { value: 'finish', label: 'Finish' },
  { value: 'punch', label: 'Punch' },
  { value: 'warranty', label: 'Warranty' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

interface ProjectChecklistsTabProps {
  projectId: string;
}

export function ProjectChecklistsTab({ projectId }: ProjectChecklistsTabProps) {
  const [phaseFilter, setPhaseFilter] = useState<ChecklistPhase | 'all'>('all');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: checklists = [], isLoading } = useProjectChecklists(projectId);
  const { data: estimates = [] } = useEstimatesV2(projectId);
  
  // Get the active estimate (budget source or most recent)
  const activeEstimate = estimates.find((e) => e.is_budget_source) || estimates[0];
  const { data: scopeBlocks = [] } = useScopeBlocks('estimate', activeEstimate?.id);

  const filteredChecklists = phaseFilter === 'all'
    ? checklists
    : checklists.filter((c) => c.phase === phaseFilter);

  // Group by phase
  const groupedChecklists = filteredChecklists.reduce((acc, checklist) => {
    const phase = checklist.phase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(checklist);
    return acc;
  }, {} as Record<string, ProjectChecklist[]>);

  const canGenerateChecklists = activeEstimate && 
    activeEstimate.project_type && 
    activeEstimate.project_type !== 'other' &&
    scopeBlocks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Project Checklists</h2>
          <p className="text-sm text-muted-foreground">
            Phase-based checklists for quality and completion tracking
          </p>
        </div>
        <Button
          onClick={() => setWizardOpen(true)}
          disabled={!canGenerateChecklists}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Smart Checklist
        </Button>
      </div>

      {!canGenerateChecklists && activeEstimate && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {!activeEstimate.project_type || activeEstimate.project_type === 'other' ? (
            <>Select a project type on the estimate to generate smart checklists.</>
          ) : scopeBlocks.length === 0 ? (
            <>Add scope sections to your estimate to generate smart checklists.</>
          ) : null}
        </div>
      )}

      {/* Phase Filter */}
      <Tabs value={phaseFilter} onValueChange={(v) => setPhaseFilter(v as ChecklistPhase | 'all')}>
        <TabsList>
          {PHASES.map((phase) => (
            <TabsTrigger key={phase.value} value={phase.value} className="capitalize">
              {phase.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Checklists */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No checklists yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Generate smart checklists based on your estimate scope
            </p>
            {canGenerateChecklists && (
              <Button onClick={() => setWizardOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Checklists
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedChecklists).map(([phase, phaseChecklists]) => (
            <div key={phase}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 capitalize">
                {phase} Phase
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {phaseChecklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    onClick={() => setSelectedChecklistId(checklist.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist Detail Drawer */}
      <ChecklistDetailDrawer
        checklistId={selectedChecklistId}
        open={!!selectedChecklistId}
        onOpenChange={(open) => !open && setSelectedChecklistId(null)}
      />

      {/* Smart Checklist Wizard */}
      {activeEstimate && (
        <SmartChecklistWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          projectId={projectId}
          estimateId={activeEstimate.id}
          projectType={(activeEstimate.project_type as ProjectType) || 'other'}
          scopeBlockCount={scopeBlocks.length}
          scopeBlockTitles={scopeBlocks.map((b) => b.title)}
          onComplete={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

// Checklist Card Component
function ChecklistCard({
  checklist,
  onClick,
}: {
  checklist: ProjectChecklist;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{checklist.title}</CardTitle>
          <Badge className={cn('capitalize', STATUS_COLORS[checklist.status])}>
            {checklist.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{checklist.progress_cached}%</span>
          </div>
          <Progress value={checklist.progress_cached} className="h-2" />
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize">
              {checklist.phase}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
