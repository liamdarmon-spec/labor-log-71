import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableSectionProps {
  section: any;
  isSelected: boolean;
  onSelect: () => void;
}

export function SortableSection({ section, isSelected, onSelect }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'p-4 cursor-pointer transition-all',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onSelect}
      >
        <div className="flex items-start gap-3">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium mb-1">{section.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {section.content_richtext || 'No content yet'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Handle delete
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
