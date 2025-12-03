/**
 * Schedule Summary Bar
 * Shows KPI cards for quick overview of scheduled activities
 * Derives all metrics from existing scheduler data - no new queries
 */

import { Users, Clock, Briefcase, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleSummaryBarProps {
  totalWorkers: number;
  totalHours: number;
  totalSubs: number;
  totalMeetings: number;
  periodLabel: string;
  loading?: boolean;
}

export function ScheduleSummaryBar({
  totalWorkers,
  totalHours,
  totalSubs,
  totalMeetings,
  periodLabel,
  loading = false,
}: ScheduleSummaryBarProps) {
  const cards = [
    {
      label: "Workers",
      value: totalWorkers,
      subLabel: periodLabel,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Hours",
      value: `${totalHours}h`,
      subLabel: "scheduled",
      icon: Clock,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Subs",
      value: totalSubs,
      subLabel: periodLabel,
      icon: Briefcase,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Events",
      value: totalMeetings,
      subLabel: periodLabel,
      icon: CalendarCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-xl border border-border bg-card p-3 sm:p-4 flex items-center gap-3 transition-all",
            loading && "animate-pulse"
          )}
        >
          <div className={cn("rounded-lg p-2", card.bgColor)}>
            <card.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", card.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none">
              {loading ? "—" : card.value}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {card.label} {card.subLabel}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
