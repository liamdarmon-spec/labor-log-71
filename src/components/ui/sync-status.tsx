/**
 * SyncStatusBadge - Shows relationship between linked entities
 * 
 * North Star Alignment:
 * - "Creating a schedule must create or sync to a time log... This connection must NEVER break"
 * - "If a user has to guess → UI is wrong"
 */

import { Link2, Unlink, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";

type SyncStatus = "synced" | "unsynced" | "pending" | "error" | "partial";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  /** What is being synced (e.g., "Time Log", "Budget") */
  targetLabel?: string;
  /** Additional context for tooltips */
  details?: string;
  className?: string;
  /** Compact mode - just shows icon */
  compact?: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  bgClass: string;
}> = {
  synced: {
    icon: Link2,
    label: "Synced",
    variant: "outline",
    bgClass: "bg-success/10 text-success border-success/20",
  },
  unsynced: {
    icon: Unlink,
    label: "Not synced",
    variant: "outline", 
    bgClass: "bg-muted text-muted-foreground border-border",
  },
  pending: {
    icon: Loader2,
    label: "Syncing...",
    variant: "outline",
    bgClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  error: {
    icon: AlertTriangle,
    label: "Sync failed",
    variant: "destructive",
    bgClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
  partial: {
    icon: AlertTriangle,
    label: "Partially synced",
    variant: "outline",
    bgClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
};

export function SyncStatusBadge({
  status,
  targetLabel,
  details,
  className,
  compact = false,
}: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        config.bgClass,
        status === "pending" && "[&_svg]:animate-spin",
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {!compact && (
        <span>
          {targetLabel 
            ? `${config.label} to ${targetLabel}` 
            : config.label
          }
        </span>
      )}
    </Badge>
  );

  if (details || compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          {details && <p className="text-xs text-muted-foreground">{details}</p>}
          {compact && targetLabel && (
            <p className="text-xs text-muted-foreground">
              {targetLabel}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

/**
 * Schedule-specific sync indicator
 * Shows whether a work schedule has been converted to a time log
 */
export function ScheduleSyncStatus({
  hasTimeLog,
  timeLogId,
  isPastDate,
  className,
}: {
  hasTimeLog: boolean;
  timeLogId?: string | null;
  isPastDate: boolean;
  className?: string;
}) {
  // Future dates don't need time logs yet
  if (!isPastDate && !hasTimeLog) {
    return null;
  }

  // Past date without time log is a problem
  if (isPastDate && !hasTimeLog) {
    return (
      <SyncStatusBadge
        status="unsynced"
        targetLabel="Time Log"
        details="This past schedule hasn't been logged yet"
        className={className}
      />
    );
  }

  // Has time log - good
  if (hasTimeLog) {
    return (
      <SyncStatusBadge
        status="synced"
        targetLabel="Time Log"
        details={timeLogId ? `Time log ID: ${timeLogId.slice(0, 8)}...` : undefined}
        className={className}
        compact
      />
    );
  }

  return null;
}

/**
 * Generic linked entity indicator
 */
export function LinkedEntityBadge({
  isLinked,
  entityType,
  entityName,
  className,
}: {
  isLinked: boolean;
  entityType: string;
  entityName?: string;
  className?: string;
}) {
  if (!isLinked) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 font-normal bg-amber-500/10 text-amber-600 border-amber-500/20",
          className
        )}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>No {entityType}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal bg-muted text-muted-foreground border-border",
        className
      )}
    >
      <Check className="w-3 h-3" />
      <span>{entityName || entityType}</span>
    </Badge>
  );
}
