/**
 * IntegrityIndicator - Shows data health and relationship integrity
 * 
 * North Star Alignment:
 * - "Integrity (no broken relationships)" as #1 priority
 * - "Actuals must always map back to canonical budget rows"
 * - "Every cost must map to a cost code. No exceptions."
 */

import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Button } from "./button";

export type IntegrityLevel = "healthy" | "warning" | "error" | "info";

export interface IntegrityIssue {
  id: string;
  level: IntegrityLevel;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface IntegrityIndicatorProps {
  issues: IntegrityIssue[];
  className?: string;
  /** Show even when healthy */
  showWhenHealthy?: boolean;
}

const LEVEL_CONFIG: Record<IntegrityLevel, {
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  label: string;
}> = {
  healthy: {
    icon: CheckCircle,
    badgeClass: "bg-success/10 text-success border-success/20",
    label: "Healthy",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    label: "Warning",
  },
  error: {
    icon: AlertCircle,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Issue",
  },
  info: {
    icon: Info,
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    label: "Info",
  },
};

export function IntegrityIndicator({
  issues,
  className,
  showWhenHealthy = false,
}: IntegrityIndicatorProps) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  // Determine overall status
  const overallLevel: IntegrityLevel = 
    errors.length > 0 ? "error" :
    warnings.length > 0 ? "warning" :
    infos.length > 0 ? "info" : "healthy";

  const hasIssues = issues.length > 0;
  
  // Don't show anything if healthy and showWhenHealthy is false
  if (!hasIssues && !showWhenHealthy) {
    return null;
  }

  const config = LEVEL_CONFIG[overallLevel];
  const Icon = config.icon;

  // Simple case: healthy with no issues
  if (!hasIssues) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-success", className)}>
        <CheckCircle className="w-3 h-3" />
        <span>Data healthy</span>
      </div>
    );
  }

  // Single issue: show inline
  if (issues.length === 1) {
    const issue = issues[0];
    const issueConfig = LEVEL_CONFIG[issue.level];
    const IssueIcon = issueConfig.icon;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 font-normal cursor-help",
              issueConfig.badgeClass,
              className
            )}
          >
            <IssueIcon className="w-3 h-3" />
            <span>1 {issueConfig.label.toLowerCase()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{issue.message}</p>
          {issue.action && (
            <Button
              variant="link"
              size="sm"
              onClick={issue.action.onClick}
              className="h-auto p-0 mt-1 text-xs"
            >
              {issue.action.label}
            </Button>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Multiple issues: use popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-normal cursor-pointer",
            config.badgeClass,
            className
          )}
        >
          <Icon className="w-3 h-3" />
          <span>
            {errors.length > 0 && `${errors.length} issue${errors.length > 1 ? "s" : ""}`}
            {errors.length > 0 && warnings.length > 0 && ", "}
            {warnings.length > 0 && `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`}
          </span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Data Integrity</h4>
          <div className="space-y-2">
            {issues.map((issue) => {
              const issueConfig = LEVEL_CONFIG[issue.level];
              const IssueIcon = issueConfig.icon;
              
              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <IssueIcon className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    issue.level === "error" && "text-destructive",
                    issue.level === "warning" && "text-amber-600 dark:text-amber-400",
                    issue.level === "info" && "text-blue-600 dark:text-blue-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground">{issue.message}</p>
                    {issue.action && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={issue.action.onClick}
                        className="h-auto p-0 mt-0.5 text-xs"
                      >
                        {issue.action.label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact indicator for table rows
 */
export function IntegrityDot({ level }: { level: IntegrityLevel }) {
  if (level === "healthy") return null;

  const colors: Record<IntegrityLevel, string> = {
    healthy: "",
    warning: "bg-amber-500",
    error: "bg-destructive",
    info: "bg-blue-500",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            colors[level]
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {level === "error" && "Data integrity issue"}
        {level === "warning" && "Needs attention"}
        {level === "info" && "Info available"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Pre-built integrity checks for common scenarios
 */
export function MissingCostCodeIndicator({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal bg-destructive/10 text-destructive border-destructive/20",
        className
      )}
    >
      <AlertCircle className="w-3 h-3" />
      <span>No cost code</span>
    </Badge>
  );
}

export function UnbudgetedIndicator({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal bg-amber-500/10 text-amber-600 border-amber-500/20",
        className
      )}
    >
      <AlertTriangle className="w-3 h-3" />
      <span>Unbudgeted</span>
    </Badge>
  );
}
