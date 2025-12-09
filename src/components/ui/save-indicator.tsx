/**
 * SaveIndicator - Visual feedback for autosave status
 * 
 * North Star Alignment:
 * - "Autosave everything" 
 * - "Transparent errors"
 * - "If a user has to guess → UI is wrong"
 */

import { Check, AlertCircle, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { SaveStatus } from "@/hooks/useItemAutosave";

interface SaveIndicatorProps {
  status: SaveStatus;
  onRetry?: () => void;
  className?: string;
  showIdle?: boolean;
}

const STATUS_CONFIG: Record<SaveStatus, {
  icon: React.ReactNode;
  label: string;
  className: string;
}> = {
  idle: {
    icon: <Check className="w-3 h-3" />,
    label: "All changes saved",
    className: "text-muted-foreground",
  },
  dirty: {
    icon: <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />,
    label: "Unsaved changes",
    className: "text-amber-600 dark:text-amber-400",
  },
  saving: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    label: "Saving...",
    className: "text-muted-foreground",
  },
  saved: {
    icon: <Check className="w-3 h-3" />,
    label: "Saved",
    className: "text-success",
  },
  error: {
    icon: <AlertCircle className="w-3 h-3" />,
    label: "Save failed",
    className: "text-destructive",
  },
};

export function SaveIndicator({ 
  status, 
  onRetry,
  className,
  showIdle = false 
}: SaveIndicatorProps) {
  // Don't show anything for idle state unless explicitly requested
  if (status === "idle" && !showIdle) {
    return null;
  }

  const config = STATUS_CONFIG[status];

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        config.className,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.label}</span>
      
      {status === "error" && onRetry && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="h-5 px-1.5 text-xs ml-1"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version for inline use (e.g., in table rows)
 */
export function SaveIndicatorDot({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const dotColors: Record<SaveStatus, string> = {
    idle: "",
    dirty: "bg-amber-500",
    saving: "bg-blue-500 animate-pulse",
    saved: "bg-success",
    error: "bg-destructive",
  };

  return (
    <div 
      className={cn(
        "w-2 h-2 rounded-full transition-colors",
        dotColors[status]
      )}
      title={STATUS_CONFIG[status].label}
    />
  );
}

/**
 * Header-level save indicator with more context
 */
export function SaveIndicatorBanner({ 
  status,
  errorCount = 0,
  pendingCount = 0,
  onRetryAll,
}: {
  status: SaveStatus;
  errorCount?: number;
  pendingCount?: number;
  onRetryAll?: () => void;
}) {
  if (status === "idle") {
    return null;
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <CloudOff className="w-4 h-4" />
          <span>
            {errorCount > 1 
              ? `${errorCount} items failed to save` 
              : "Failed to save changes"
            }
          </span>
        </div>
        {onRetryAll && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetryAll}
            className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Retry All
          </Button>
        )}
      </div>
    );
  }

  if (status === "saving" || status === "dirty") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        {status === "saving" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving changes...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              {pendingCount > 1 
                ? `${pendingCount} unsaved changes` 
                : "Unsaved changes"
              }
            </span>
          </>
        )}
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg text-sm text-success">
        <Check className="w-4 h-4" />
        <span>All changes saved</span>
      </div>
    );
  }

  return null;
}
