// src/components/estimates/SaveStatusIndicator.tsx
// Row-level and global save status indicators

import React, { memo } from "react";
import { Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SaveStatus } from "@/hooks/useItemAutosave";

interface RowSaveIndicatorProps {
  status: SaveStatus;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export const RowSaveIndicator = memo(function RowSaveIndicator({
  status,
  error,
  onRetry,
  className,
}: RowSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {status === "saving" && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {status === "saved" && (
        <Check className="h-3 w-3 text-emerald-500 animate-in fade-in duration-200" />
      )}
      {status === "dirty" && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      )}
      {status === "error" && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors"
                onClick={onRetry}
              >
                <AlertCircle className="h-3 w-3" />
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{error || "Save failed"} - Click to retry</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

interface GlobalSaveStatusProps {
  status: SaveStatus;
  className?: string;
}

export const GlobalSaveStatus = memo(function GlobalSaveStatus({
  status,
  className,
}: GlobalSaveStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-all duration-200",
        className
      )}
    >
      {status === "idle" && (
        <span className="text-muted-foreground">All changes saved</span>
      )}
      {status === "dirty" && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          <span className="text-blue-600 dark:text-blue-400">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Some changes failed</span>
        </>
      )}
    </div>
  );
});
