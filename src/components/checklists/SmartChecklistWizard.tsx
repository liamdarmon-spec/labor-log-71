import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ProjectType,
  ChecklistQuestion,
  ChecklistTemplate,
  useChecklistQuestions,
  useChecklistTemplates,
  useChecklistAnswers,
  useSaveChecklistAnswers,
  useGenerateChecklists,
} from '@/hooks/useChecklists';

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

interface PlannedChecklist {
  templateId: string;
  title: string;
  phase: string;
  itemCount: number;
  enabled: boolean;
}

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

  const { data: questions = [], isLoading: questionsLoading } = useChecklistQuestions(projectType);
  const { data: templates = [], isLoading: templatesLoading } = useChecklistTemplates(projectType);
  const { data: existingAnswers = [] } = useChecklistAnswers(estimateId);
  const saveAnswers = useSaveChecklistAnswers();
  const generateChecklists = useGenerateChecklists();

  // Initialize answers from existing
  React.useEffect(() => {
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

  // Compute planned checklists based on project type, templates, and answers
  const computePlannedChecklists = useMemo(() => {
    if (!templates.length) return [];

    const planned: PlannedChecklist[] = [];

    templates.forEach((template) => {
      // Include templates that match project type or are global
      const shouldInclude = 
        template.project_type === projectType ||
        template.project_type === 'global';

      // Additional logic based on answers
      let includeBasedOnAnswers = true;

      // Kitchen structural checklist only if wall removals
      if (template.name.toLowerCase().includes('structural') && projectType === 'kitchen_remodel') {
        const wallAnswer = answers[questions.find(q => q.code === 'has_wall_removals')?.id || ''];
        includeBasedOnAnswers = wallAnswer?.valueBoolean === true;
      }

      // Bath waterproofing checklist only if wet area work
      if (template.name.toLowerCase().includes('waterproofing') && projectType === 'bath_remodel') {
        const wetAreaAnswer = answers[questions.find(q => q.code === 'wet_area_scope')?.id || ''];
        const hasWetWork = wetAreaAnswer?.valueJson?.some(v => 
          v.includes('shower pan') || v.includes('curbless')
        );
        includeBasedOnAnswers = hasWetWork ?? false;
      }

      // Occupied home checklist
      if (template.name.toLowerCase().includes('occupied') && projectType === 'full_home_remodel') {
        const occupiedAnswer = answers[questions.find(q => q.code === 'is_occupied')?.id || ''];
        includeBasedOnAnswers = occupiedAnswer?.valueBoolean === true;
      }

      if (shouldInclude && includeBasedOnAnswers) {
        planned.push({
          templateId: template.id,
          title: template.name,
          phase: template.phase,
          itemCount: template.items?.length || 0,
          enabled: true,
        });
      }
    });

    return planned;
  }, [templates, projectType, answers, questions]);

  // Update planned checklists when computed
  React.useEffect(() => {
    setPlannedChecklists(computePlannedChecklists);
  }, [computePlannedChecklists]);

  const handleAnswerChange = (questionId: string, value: AnswerState[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    if (step === 'confirm') {
      setStep('questions');
    } else if (step === 'questions') {
      // Save answers
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
      // Generate checklists
      const selectedTemplateIds = plannedChecklists
        .filter((c) => c.enabled)
        .map((c) => c.templateId);

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
    setPlannedChecklists((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return updated;
    });
  };

  const isLoading = questionsLoading || templatesLoading || saveAnswers.isPending || generateChecklists.isPending;

  const projectTypeLabel = {
    kitchen_remodel: 'Kitchen Remodel',
    bath_remodel: 'Bath Remodel',
    full_home_remodel: 'Full Home Remodel',
    other: 'Custom Project',
  }[projectType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
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
              <p className="text-sm text-muted-foreground">
                Next, we'll ask a few quick questions to customize your checklists.
              </p>
            </div>
          )}

          {step === 'questions' && (
            <div className="space-y-6">
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No questions for this project type. Proceeding with default checklists.
                </p>
              ) : (
                questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(val) => handleAnswerChange(q.id, val)}
                  />
                ))
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Based on your answers, we'll create these checklists. Toggle off any you don't need.
              </p>
              <div className="space-y-2">
                {plannedChecklists.map((checklist, index) => (
                  <div
                    key={checklist.templateId}
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
                        <p className="font-medium text-sm">{checklist.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {checklist.itemCount} items · {checklist.phase}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {checklist.phase}
                    </Badge>
                  </div>
                ))}
              </div>
              {plannedChecklists.filter((c) => c.enabled).length === 0 && (
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
                Your smart checklists have been generated. View them in the project's Checklists tab.
              </p>
            </div>
          )}
        </div>

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
            disabled={isLoading || (step === 'preview' && plannedChecklists.filter((c) => c.enabled).length === 0)}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {step === 'confirm' && 'Next'}
            {step === 'questions' && 'Continue'}
            {step === 'preview' && 'Generate Checklists'}
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
}: {
  question: ChecklistQuestion;
  value?: AnswerState[string];
  onChange: (val: AnswerState[string]) => void;
}) {
  const options = question.options || [];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{question.label}</Label>
      {question.help_text && (
        <p className="text-xs text-muted-foreground">{question.help_text}</p>
      )}

      {question.input_type === 'boolean' && (
        <div className="flex items-center gap-2">
          <Switch
            checked={value?.valueBoolean ?? false}
            onCheckedChange={(checked) => onChange({ valueBoolean: checked })}
          />
          <span className="text-sm">{value?.valueBoolean ? 'Yes' : 'No'}</span>
        </div>
      )}

      {question.input_type === 'single_select' && (
        <RadioGroup
          value={value?.valueText || ''}
          onValueChange={(val) => onChange({ valueText: val })}
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
