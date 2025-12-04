// SortableRow.tsx - Reusable drag handle and sortable wrapper for estimate items
import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SortableRow = memo(function SortableRow({
  id,
  children,
  disabled = false,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 shadow-lg scale-[1.02] bg-background rounded-lg",
        isOver && "ring-2 ring-primary/30 rounded-lg"
      )}
    >
      <div className="flex items-stretch">
        {/* Drag handle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={setActivatorNodeRef}
              type="button"
              className={cn(
                "flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing",
                "text-muted-foreground/40 hover:text-muted-foreground transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded",
                disabled && "cursor-not-allowed opacity-30"
              )}
              {...attributes}
              {...listeners}
              tabIndex={disabled ? -1 : 0}
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Drag to reorder
          </TooltipContent>
        </Tooltip>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
});

// Drag overlay component for rendering during drag
interface DragOverlayItemProps {
  children: React.ReactNode;
}

export const DragOverlayItem = memo(function DragOverlayItem({
  children,
}: DragOverlayItemProps) {
  return (
    <div className="opacity-95 shadow-2xl scale-[1.02] bg-background rounded-lg border border-primary/20">
      <div className="flex items-stretch">
        <div className="flex items-center justify-center w-6 shrink-0 text-primary">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
});

// Section drag handle
interface SectionDragHandleProps {
  listeners?: Record<string, Function>;
  attributes?: Record<string, any>;
}

export const SectionDragHandle = memo(function SectionDragHandle({
  listeners,
  attributes,
}: SectionDragHandleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -ml-1",
            "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
          )}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder section"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Drag to reorder section
      </TooltipContent>
    </Tooltip>
  );
});

// Area drag handle
interface AreaDragHandleProps {
  listeners?: Record<string, Function>;
  attributes?: Record<string, any>;
}

export const AreaDragHandle = memo(function AreaDragHandle({
  listeners,
  attributes,
}: AreaDragHandleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-grab active:cursor-grabbing p-0.5",
            "text-muted-foreground/50 hover:text-muted-foreground transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
          )}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder area"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Drag to reorder area
      </TooltipContent>
    </Tooltip>
  );
});

export default SortableRow;
