/**
 * Scheduler Constants
 * Color system and shared configuration
 */

// Deterministic color hashing for projects
export function getProjectColor(projectId: string) {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
    "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800",
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800",
  ];
  const hash = projectId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return colors[hash % colors.length];
}

// Entity type colors
export const ENTITY_COLORS = {
  worker: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    card: "border-blue-200 dark:border-blue-800",
    accent: "text-blue-600 dark:text-blue-400"
  },
  sub: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
    card: "border-orange-200 dark:border-orange-800",
    accent: "text-orange-600 dark:text-orange-400"
  },
  meeting: {
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
    card: "border-purple-200 dark:border-purple-800",
    accent: "text-purple-600 dark:text-purple-400"
  },
  task: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300",
    card: "border-slate-200 dark:border-slate-800",
    accent: "text-slate-600 dark:text-slate-400"
  }
};

// Payment status colors
export const PAYMENT_STATUS = {
  paid: {
    badge: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300",
    indicator: "bg-green-500"
  },
  unpaid: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300",
    indicator: "bg-red-500"
  },
  partial: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300",
    indicator: "bg-yellow-500"
  }
};
