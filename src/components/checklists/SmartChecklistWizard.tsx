import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, ClipboardList, 
  Sparkles, AlertTriangle, Shield, Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ProjectType,
  ChecklistQuestion,
  useChecklistQuestions,
  useChecklistTemplates,
  useChecklistAnswers,
  useSaveChecklistAnswers,
  useGenerateChecklists,
} from '@/hooks/useChecklists';
import { useScopeBlocks } from '@/hooks/useScopeBlocks';
import { 
  buildChecklistContext, 
  getRiskLabel, 
  ScopeBlockInput,
  ChecklistContext 
} from '@/lib/checklists/intel';
import { planChecklists, PlannedChecklist } from '@/lib/checklists/planner';

interface SmartChecklistWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  estimateId: string;
  projectType: ProjectType;
  scopeBlockCount: number;
  scopeBlockTitles: string[];
  onComplete?: () => void;
}

type WizardStep = 'confirm' | 'questions' | 'preview' | 'complete';

interface AnswerState {
  [questionId: string]: {
    valueBoolean?: boolean;
    valueText?: string;
    valueJson?: string[];
  };
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export function SmartChecklistWizard({
  open,
  onOpenChange,
  projectId,
  estimateId,
  projectType,
  scopeBlockCount,
  scopeBlockTitles,
  onComplete,
}: SmartChecklistWizardProps) {
  const [step, setStep] = useState<WizardStep>('confirm');
  const [answers, setAnswers] = useState<AnswerState>({});
  const [plannedChecklists, setPlannedChecklists] = useState<PlannedChecklist[]>([]);
  const [confirmingHighRisk, setConfirmingHighRisk] = useState<string | null>(null);

  const { data: questions = [], isLoading: questionsLoading } = useChecklistQuestions(projectType);
  const { data: templates = [], isLoading: templatesLoading } = useChecklistTemplates(projectType);
  const { data: existingAnswers = [] } = useChecklistAnswers(estimateId);
  const { data: scopeBlocksRaw = [] } = useScopeBlocks('estimate', estimateId);
  const saveAnswers = useSaveChecklistAnswers();
  const generateChecklists = useGenerateChecklists();

  // Transform scope blocks for intel
  const scopeBlocks: ScopeBlockInput[] = useMemo(() => {
    return scopeBlocksRaw.map(block => ({
      id: block.id,
      title: block.title || '',
      costItems: (block.scope_block_cost_items || []).map((item) => ({
        id: item.id,
        cost_code_id: item.cost_code_id,
        cost_code_category: item.category || null,
        cost_code_code: null,
        cost_code_name: item.description || null,
        area_label: null,
        group_label: null,
      })),
    }));
  }, [scopeBlocksRaw]);

  // Initialize answers from existing
  useEffect(() => {
    if (existingAnswers.length > 0) {
      const initial: AnswerState = {};
      existingAnswers.forEach((a) => {
        initial[a.question_id] = {
          valueBoolean: a.value_boolean ?? undefined,
          valueText: a.value_text ?? undefined,
          valueJson: (a.value_json as string[]) ?? undefined,
        };
      });
      setAnswers(initial);
    }
  }, [existingAnswers]);

  // Convert answers to flat object for intel
  const answersFlat = useMemo(() => {
    const flat: Record<string, any> = {};
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans) {
        if (q.input_type === 'boolean') {
          flat[q.code] = ans.valueBoolean;
        } else if (q.input_type === 'single_select') {
          flat[q.code] = ans.valueText;
        } else if (q.input_type === 'multi_select') {
          flat[q.code] = ans.valueJson;
        } else {
          flat[q.code] = ans.valueText;
        }
      }
    });
    return flat;
  }, [answers, questions]);

  // Build context using the intelligence engine
  const context: ChecklistContext = useMemo(() => {
    return buildChecklistContext({
      projectType,
      scopeBlocks,
      answers: answersFlat,
    });
  }, [projectType, scopeBlocks, answersFlat]);

  const riskInfo = useMemo(() => getRiskLabel(context.riskScore), [context.riskScore]);

  // Determine which questions are pre-answered by scope analysis
  const questionStatus = useMemo(() => {
    const status: Record<string, 'ask' | 'pre-answered' | 'hidden'> = {};
    
    questions.forEach(q => {
      if (q.code === 'has_wall_removals' && context.derivedFlags.hasWallRemovals) {
        status[q.id] = 'pre-answered';
      } else if (q.code === 'waterproofing_level' && context.derivedFlags.hasCurblessShower) {
        status[q.id] = 'pre-answered';
      } else {
        status[q.id] = 'ask';
      }
    });
    
    return status;
  }, [questions, context.derivedFlags]);

  // Plan checklists using the planner
  const computePlannedChecklists = useMemo(() => {
    if (!templates.length) return [];
    return planChecklists({
      projectType,
      context,
      templates: templates as any,
    });
  }, [templates, projectType, context]);

  // Update planned checklists when computed
  useEffect(() => {
    setPlannedChecklists(computePlannedChecklists);
  }, [computePlannedChecklists]);

  const handleAnswerChange = (questionId: string, value: AnswerState[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    if (step === 'confirm') {
      setStep('questions');
    } else if (step === 'questions') {
      const answerList = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        valueBoolean: value.valueBoolean,
        valueText: value.valueText,
        valueJson: value.valueJson,
      }));
      
      if (answerList.length > 0) {
        await saveAnswers.mutateAsync({ estimateId, answers: answerList });
      }
      
      setStep('preview');
    } else if (step === 'preview') {
      const selectedTemplateIds = plannedChecklists
        .filter((c) => c.enabled)
        .flatMap((c) => c.templateIds);

      if (selectedTemplateIds.length > 0) {
        await generateChecklists.mutateAsync({
          projectId,
          estimateId,
          projectType,
          templateIds: selectedTemplateIds,
        });
      }

      setStep('complete');
    } else if (step === 'complete') {
      onComplete?.();
      onOpenChange(false);
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'questions') setStep('confirm');
    else if (step === 'preview') setStep('questions');
  };

  const toggleChecklist = (index: number) => {
    const checklist = plannedChecklists[index];
    
    if (checklist.enabled && checklist.riskLevel === 'high') {
      setConfirmingHighRisk(checklist.id);
      return;
    }
    
    setPlannedChecklists((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return updated;
    });
  };

  const confirmDisableHighRisk = () => {
    if (!confirmingHighRisk) return;
    
    setPlannedChecklists((prev) => {
      return prev.map(c => 
        c.id === confirmingHighRisk ? { ...c, enabled: false } : c
      );
    });
    setConfirmingHighRisk(null);
  };

  const isLoading = questionsLoading || templatesLoading || saveAnswers.isPending || generateChecklists.isPending;

  const projectTypeLabel = {
    kitchen_remodel: 'Kitchen Remodel',
    bath_remodel: 'Bath Remodel',
    full_home_remodel: 'Full Home Remodel',
    other: 'Custom Project',
  }[projectType];

  const enabledCount = plannedChecklists.filter(c => c.enabled).length;
  const totalItems = plannedChecklists.filter(c => c.enabled).reduce((sum, c) => sum + c.itemCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Checklist Generator
          </DialogTitle>
          <DialogDescription>
            Generate phase-based checklists tailored to your project scope.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['confirm', 'questions', 'preview', 'complete'] as WizardStep[]).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : i < ['confirm', 'questions', 'preview', 'complete'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              {i < 3 && <div className="flex-1 h-0.5 bg-muted" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Risk Badge */}
              <div className={cn(
                'p-3 rounded-lg flex items-center gap-3',
                RISK_COLORS[riskInfo.level]
              )}>
                {riskInfo.level === 'high' ? (
                  <Shield className="h-5 w-5" />
                ) : riskInfo.level === 'medium' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <div>
                  <p className="font-medium text-sm">{riskInfo.label}</p>
                  <p className="text-xs opacity-80">Risk score: {context.riskScore}/100</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{projectTypeLabel}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>{scopeBlockCount}</strong> sections in this estimate:
                </div>
                <ul className="text-sm space-y-1">
                  {scopeBlockTitles.slice(0, 5).map((title, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      {title}
                    </li>
                  ))}
                  {scopeBlockTitles.length > 5 && (
                    <li className="text-muted-foreground">...and {scopeBlockTitles.length - 5} more</li>
                  )}
                </ul>
              </div>
              
              {/* Detected flags summary */}
              {(context.derivedFlags.hasStructural || context.derivedFlags.hasWaterproofingScope) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="font-medium text-amber-800 mb-2">Detected from scope:</p>
                  <ul className="space-y-1 text-amber-700">
                    {context.derivedFlags.hasStructural && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Structural work (walls, headers, beams)
                      </li>
                    )}
                    {context.derivedFlags.hasWaterproofingScope && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Waterproofing / wet area work
                      </li>
                    )}
                    {context.derivedFlags.includesElectricalHeavy && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Heavy electrical scope
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Next, we'll ask a few quick questions to customize your checklists.
              </p>
            </div>
          )}

          {step === 'questions' && (
            <div className="space-y-6">
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No additional questions needed. Proceeding with scope-based checklists.
                </p>
              ) : (
                questions.map((q) => {
                  const status = questionStatus[q.id];
                  if (status === 'hidden') return null;
                  
                  return (
                    <QuestionField
                      key={q.id}
                      question={q}
                      value={answers[q.id]}
                      onChange={(val) => handleAnswerChange(q.id, val)}
                      preAnswered={status === 'pre-answered'}
                    />
                  );
                })
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {enabledCount} checklists · {totalItems} items
                </p>
                <Badge className={RISK_COLORS[riskInfo.level]}>
                  {riskInfo.level.charAt(0).toUpperCase() + riskInfo.level.slice(1)} Risk
                </Badge>
              </div>
              
              <div className="space-y-2">
                {plannedChecklists.map((checklist, index) => (
                  <div
                    key={checklist.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      checklist.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={checklist.enabled}
                        onCheckedChange={() => toggleChecklist(index)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{checklist.title}</p>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', RISK_COLORS[checklist.riskLevel])}
                          >
                            {checklist.riskLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {checklist.itemCount} items · {checklist.phase}
                        </p>
                        {checklist.reasonTags.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-primary cursor-help flex items-center gap-1 mt-1">
                                  <Info className="h-3 w-3" />
                                  Why included
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Because: {checklist.reasonTags.join(', ')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {checklist.phase}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {enabledCount === 0 && (
                <p className="text-sm text-amber-600">
                  No checklists selected. Select at least one to continue.
                </p>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-lg font-semibold">Checklists Created!</h3>
              <p className="text-sm text-muted-foreground text-center">
                {enabledCount} checklists with {totalItems} items have been generated.
                View them in the project's Checklists tab.
              </p>
            </div>
          )}
        </div>

        {/* High-risk confirmation dialog */}
        {confirmingHighRisk && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Disable high-risk checklist?</p>
            </div>
            <p className="text-sm text-red-600">
              This checklist covers critical QA steps for waterproofing or structural work.
              Skipping it may lead to missed inspections.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setConfirmingHighRisk(null)}
              >
                Keep it
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={confirmDisableHighRisk}
              >
                Disable anyway
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-4">
          {step !== 'confirm' && step !== 'complete' ? (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleNext}
            disabled={isLoading || (step === 'preview' && enabledCount === 0)}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {step === 'confirm' && 'Next'}
            {step === 'questions' && 'Continue'}
            {step === 'preview' && `Generate ${enabledCount} Checklists`}
            {step === 'complete' && 'Done'}
            {step !== 'complete' && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Question field component
function QuestionField({
  question,
  value,
  onChange,
  preAnswered = false,
}: {
  question: ChecklistQuestion;
  value?: AnswerState[string];
  onChange: (val: AnswerState[string]) => void;
  preAnswered?: boolean;
}) {
  const options = question.options || [];

  return (
    <div className={cn('space-y-2', preAnswered && 'opacity-70')}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{question.label}</Label>
        {preAnswered && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            Auto-detected
          </Badge>
        )}
      </div>
      {question.help_text && (
        <p className="text-xs text-muted-foreground">{question.help_text}</p>
      )}

      {question.input_type === 'boolean' && (
        <div className="flex items-center gap-2">
          <Switch
            checked={value?.valueBoolean ?? false}
            onCheckedChange={(checked) => onChange({ valueBoolean: checked })}
            disabled={preAnswered}
          />
          <span className="text-sm">{value?.valueBoolean ? 'Yes' : 'No'}</span>
        </div>
      )}

      {question.input_type === 'single_select' && (
        <RadioGroup
          value={value?.valueText || ''}
          onValueChange={(val) => onChange({ valueText: val })}
          disabled={preAnswered}
        >
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
              <Label htmlFor={`${question.id}-${opt}`} className="text-sm font-normal">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.input_type === 'multi_select' && (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <Checkbox
                id={`${question.id}-${opt}`}
                checked={(value?.valueJson || []).includes(opt)}
                disabled={preAnswered}
                onCheckedChange={(checked) => {
                  const current = value?.valueJson || [];
                  const updated = checked
                    ? [...current, opt]
                    : current.filter((v) => v !== opt);
                  onChange({ valueJson: updated });
                }}
              />
              <Label htmlFor={`${question.id}-${opt}`} className="text-sm font-normal">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
