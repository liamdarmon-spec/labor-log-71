import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle2, 
  Sparkles,
  Droplets,
  Hammer,
  Home,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  buildChecklistContext, 
  getRiskLabel, 
  getInsightBullets,
  ScopeBlockInput,
  ProjectType 
} from '@/lib/checklists/intel';
import { getRecommendedMissing, PlannedChecklist, ChecklistTemplate } from '@/lib/checklists/planner';

interface ChecklistInsightsPanelProps {
  projectType: ProjectType;
  scopeBlocks: ScopeBlockInput[];
  answers: Record<string, any>;
  existingChecklists: { title: string; phase: string }[];
  templates: ChecklistTemplate[];
  onGenerateClick: () => void;
  onAddRecommended?: (checklist: PlannedChecklist) => void;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

const RISK_ICONS = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: Shield,
};

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  'Structural elements detected': Hammer,
  'Waterproofing / wet area scope detected': Droplets,
  'Occupied during work': Home,
  'Heavy electrical scope': Zap,
  'Curbless shower (critical waterproofing)': Droplets,
  'Steam shower installation': Droplets,
};

export function ChecklistInsightsPanel({
  projectType,
  scopeBlocks,
  answers,
  existingChecklists,
  templates,
  onGenerateClick,
  onAddRecommended,
}: ChecklistInsightsPanelProps) {
  // Build context using memoization for performance
  const context = useMemo(() => {
    return buildChecklistContext({
      projectType,
      scopeBlocks,
      answers,
    });
  }, [projectType, scopeBlocks, answers]);
  
  const riskInfo = useMemo(() => getRiskLabel(context.riskScore), [context.riskScore]);
  const insights = useMemo(() => getInsightBullets(context), [context]);
  
  const recommendedMissing = useMemo(() => {
    return getRecommendedMissing(context, existingChecklists, templates);
  }, [context, existingChecklists, templates]);
  
  const RiskIcon = RISK_ICONS[riskInfo.level];
  
  if (!projectType || projectType === 'other') {
    return null;
  }
  
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Project Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg border',
            RISK_COLORS[riskInfo.level]
          )}>
            <RiskIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{riskInfo.label}</span>
              <span className="text-xs text-muted-foreground">{context.riskScore}/100</span>
            </div>
            <Progress 
              value={context.riskScore} 
              className={cn(
                'h-2',
                riskInfo.level === 'high' && '[&>div]:bg-red-500',
                riskInfo.level === 'medium' && '[&>div]:bg-amber-500',
                riskInfo.level === 'low' && '[&>div]:bg-green-500'
              )}
            />
          </div>
        </div>
        
        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight] || AlertTriangle;
              return (
                <div 
                  key={i} 
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{insight}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* CTA */}
        {existingChecklists.length === 0 ? (
          <Button onClick={onGenerateClick} className="w-full" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Smart Checklist
          </Button>
        ) : recommendedMissing.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Recommended additions:
            </p>
            {recommendedMissing.map((rec) => (
              <div 
                key={rec.id}
                className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    High Risk
                  </Badge>
                  <span className="text-sm">{rec.title}</span>
                </div>
                {onAddRecommended && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onAddRecommended(rec)}
                  >
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span>All recommended checklists created</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
