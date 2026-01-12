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
  const progressPercent = (currentIndex / (PHASES.length - 1)) * 100;

  return (
    <div className={cn('w-full relative py-1', className)}>
      {/* Background Line */}
      <div className="absolute top-[1.2rem] left-0 right-0 h-0.5 bg-border -z-10" />
      
      {/* Active Line (progress) */}
      <div 
        className="absolute top-[1.2rem] left-0 h-0.5 bg-emerald-600 -z-10 transition-all duration-500 ease-in-out"
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex justify-between items-start w-full">
        {PHASES.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = index < currentIndex;
          const Icon = phase.icon;

          return (
            <div key={phase.id} className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10',
                  // Ensure background covers the line
                  'bg-background', 
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isActive
                      ? phase.id === 'approved'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-primary text-primary ring-4 ring-primary/10'
                      : 'border-muted-foreground/20 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              
              <div className="flex flex-col items-center mt-2">
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {phase.label}
                </span>
                {/* Optional description - hidden on small screens or keep minimal */}
                <span className="hidden sm:inline-block text-[10px] text-muted-foreground">
                  {phase.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lock warning for approved phase - adjusted margin */}
      {currentPhase === 'approved' && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full py-1 px-3 w-fit mx-auto border border-emerald-200/50">
          <Lock className="h-3 w-3" />
          <span className="font-medium">Contract locked</span>
        </div>
      )}
    </div>
  );
}
