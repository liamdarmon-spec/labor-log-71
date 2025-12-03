import React from 'react';
import { Home, Bath, UtensilsCrossed, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectType, useUpdateEstimateProjectType } from '@/hooks/useChecklists';

const PROJECT_TYPES: { value: ProjectType; label: string; icon: React.ElementType }[] = [
  { value: 'kitchen_remodel', label: 'Kitchen', icon: UtensilsCrossed },
  { value: 'bath_remodel', label: 'Bath', icon: Bath },
  { value: 'full_home_remodel', label: 'Full Home', icon: Home },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

interface ProjectTypePickerProps {
  estimateId: string;
  currentType: ProjectType | null;
  onTypeChange?: (type: ProjectType) => void;
}

export function ProjectTypePicker({ estimateId, currentType, onTypeChange }: ProjectTypePickerProps) {
  const updateProjectType = useUpdateEstimateProjectType();

  const handleSelect = (type: ProjectType) => {
    if (type === currentType) return;
    
    updateProjectType.mutate(
      { estimateId, projectType: type },
      { onSuccess: () => onTypeChange?.(type) }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {PROJECT_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            disabled={updateProjectType.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              currentType === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Project type helps generate smart checklists and QA steps.
      </p>
    </div>
  );
}
