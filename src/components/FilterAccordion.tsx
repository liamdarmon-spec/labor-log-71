import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterAccordionProps {
  summary: string;
  children: React.ReactNode;
  onClear?: () => void;
  className?: string;
}

export const FilterAccordion = ({
  summary,
  children,
  onClear,
  className,
}: FilterAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('border border-border rounded-lg bg-card', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">Filters</span>
          <span className="text-xs text-muted-foreground">({summary})</span>
        </div>
        
        <div className="flex items-center gap-2">
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-7 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-4 py-4 border-t border-border space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};
