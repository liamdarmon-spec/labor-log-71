// src/components/proposals/ContractPhaseIndicator.tsx
// Visual phase indicator for proposal/contract workflow
//
// Phases:
// - Draft: proposal is being edited
// - Review: user is reviewing before approval (UI-only state)
// - Approved: contract is locked

import { cn } from '@/lib/utils';
import { Check, FileEdit, Eye, Lock } from 'lucide-react';

export type ContractPhase = 'draft' | 'review' | 'approved';

interface ContractPhaseIndicatorProps {
  currentPhase: ContractPhase;
  className?: string;
}

const PHASES = [
  {
    id: 'draft' as const,
    label: 'Draft',
    description: 'Editing proposal',
    icon: FileEdit,
  },
  {
    id: 'review' as const,
    label: 'Review',
    description: 'Ready to approve',
    icon: Eye,
  },
  {
    id: 'approved' as const,
    label: 'Approved',
    description: 'Contract locked',
    icon: Lock,
  },
];

export function ContractPhaseIndicator({
  currentPhase,
  className,
}: ContractPhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {PHASES.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = index < currentIndex;
          const Icon = phase.icon;

          return (
            <div key={phase.id} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isActive
                        ? phase.id === 'approved'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-primary border-primary text-primary-foreground'
                        : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {phase.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {phase.description}
                </span>
              </div>

              {/* Connector line */}
              {index < PHASES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mt-[-1.5rem]',
                    index < currentIndex ? 'bg-emerald-600' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Lock warning for approved phase */}
      {currentPhase === 'approved' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg py-2 px-4">
          <Lock className="h-4 w-4" />
          <span className="font-medium">Contract locked</span>
          <span className="text-muted-foreground">— Billing configuration is frozen</span>
        </div>
      )}
    </div>
  );
}

