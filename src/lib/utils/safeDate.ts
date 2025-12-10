/**
 * Safe Date Utilities
 * 
 * Defensive helpers for date parsing and formatting.
 * Prevents crashes from invalid date strings or undefined values.
 */

import { 
  format, 
  parseISO, 
  isValid, 
  formatDistance, 
  formatRelative,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns';

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Safely parse a date string or Date object.
 * Returns null for invalid dates instead of throwing.
 * 
 * @example
 * const date = safeParseDate(user.createdAt);
 * if (date) {
 *   // Use date safely
 * }
 */
export function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  
  try {
    // Already a Date object
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }
    
    // Try ISO format first (most common from APIs)
    const isoDate = parseISO(value);
    if (isValid(isoDate)) {
      return isoDate;
    }
    
    // Try native Date parsing as fallback
    const nativeDate = new Date(value);
    if (isValid(nativeDate)) {
      return nativeDate;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse date with a guaranteed Date return (uses current date as fallback).
 */
export function safeParseDateOrNow(value: string | Date | null | undefined): Date {
  return safeParseDate(value) ?? new Date();
}

/**
 * Parse date with a custom fallback.
 */
export function safeParseDateOr(value: string | Date | null | undefined, fallback: Date): Date {
  return safeParseDate(value) ?? fallback;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Safely format a date with a fallback string for invalid dates.
 * 
 * @example
 * // Instead of: format(parseISO(date), 'MMM d, yyyy')
 * safeFormat(date, 'MMM d, yyyy')
 * 
 * Common format patterns:
 * - 'MMM d, yyyy' → Dec 9, 2024
 * - 'MM/dd/yyyy' → 12/09/2024
 * - 'yyyy-MM-dd' → 2024-12-09
 * - 'h:mm a' → 9:30 AM
 * - 'EEE, MMM d' → Mon, Dec 9
 * - 'EEEE' → Monday
 */
export function safeFormat(
  value: string | Date | null | undefined,
  formatStr: string,
  fallback: string = '—'
): string {
  const date = safeParseDate(value);
  if (!date) {
    return fallback;
  }
  
  try {
    return format(date, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Format date as a short date (Dec 9, 2024).
 */
export function formatShortDate(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'MMM d, yyyy', fallback);
}

/**
 * Format date as a numeric date (12/09/2024).
 */
export function formatNumericDate(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'MM/dd/yyyy', fallback);
}

/**
 * Format date as ISO date (2024-12-09).
 */
export function formatISODate(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'yyyy-MM-dd', fallback);
}

/**
 * Format time (9:30 AM).
 */
export function formatTime(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'h:mm a', fallback);
}

/**
 * Format full date and time (Dec 9, 2024 at 9:30 AM).
 */
export function formatDateTime(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, "MMM d, yyyy 'at' h:mm a", fallback);
}

/**
 * Format day of week (Monday).
 */
export function formatDayName(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'EEEE', fallback);
}

/**
 * Format short day of week (Mon).
 */
export function formatShortDayName(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'EEE', fallback);
}

/**
 * Format month name (December).
 */
export function formatMonthName(value: string | Date | null | undefined, fallback: string = '—'): string {
  return safeFormat(value, 'MMMM', fallback);
}

// ============================================================================
// RELATIVE DATES
// ============================================================================

/**
 * Safely format relative time (e.g., "2 days ago", "in 3 hours").
 */
export function safeFormatDistance(
  value: string | Date | null | undefined,
  baseDate: Date = new Date(),
  options?: { addSuffix?: boolean }
): string {
  const date = safeParseDate(value);
  if (!date) {
    return '—';
  }
  
  try {
    return formatDistance(date, baseDate, { addSuffix: true, ...options });
  } catch {
    return '—';
  }
}

/**
 * Safely format relative date (e.g., "yesterday at 9:30 AM", "last Friday").
 */
export function safeFormatRelative(
  value: string | Date | null | undefined,
  baseDate: Date = new Date()
): string {
  const date = safeParseDate(value);
  if (!date) {
    return '—';
  }
  
  try {
    return formatRelative(date, baseDate);
  } catch {
    return '—';
  }
}

/**
 * Smart date formatting that shows relative for recent dates, absolute for older.
 */
export function formatSmartDate(value: string | Date | null | undefined): string {
  const date = safeParseDate(value);
  if (!date) {
    return '—';
  }
  
  const now = new Date();
  const daysDiff = differenceInDays(now, date);
  
  // Today: show time
  if (isSameDay(date, now)) {
    return `Today at ${safeFormat(date, 'h:mm a')}`;
  }
  
  // Yesterday
  if (isSameDay(date, subDays(now, 1))) {
    return `Yesterday at ${safeFormat(date, 'h:mm a')}`;
  }
  
  // Within last week: show day name
  if (daysDiff <= 7 && daysDiff > 0) {
    return safeFormat(date, "EEEE 'at' h:mm a");
  }
  
  // Within this year: show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return safeFormat(date, 'MMM d');
  }
  
  // Older: show full date
  return formatShortDate(date);
}

// ============================================================================
// DATE COMPARISONS
// ============================================================================

/**
 * Safely check if date is before another date.
 */
export function safeIsBefore(
  date: string | Date | null | undefined,
  compareDate: string | Date | null | undefined
): boolean {
  const d1 = safeParseDate(date);
  const d2 = safeParseDate(compareDate);
  if (!d1 || !d2) {
    return false;
  }
  return isBefore(d1, d2);
}

/**
 * Safely check if date is after another date.
 */
export function safeIsAfter(
  date: string | Date | null | undefined,
  compareDate: string | Date | null | undefined
): boolean {
  const d1 = safeParseDate(date);
  const d2 = safeParseDate(compareDate);
  if (!d1 || !d2) {
    return false;
  }
  return isAfter(d1, d2);
}

/**
 * Safely check if two dates are the same day.
 */
export function safeIsSameDay(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): boolean {
  const d1 = safeParseDate(date1);
  const d2 = safeParseDate(date2);
  if (!d1 || !d2) {
    return false;
  }
  return isSameDay(d1, d2);
}

/**
 * Check if a date is today.
 */
export function isToday(value: string | Date | null | undefined): boolean {
  return safeIsSameDay(value, new Date());
}

/**
 * Check if a date is in the past.
 */
export function isPast(value: string | Date | null | undefined): boolean {
  const date = safeParseDate(value);
  if (!date) {
    return false;
  }
  return isBefore(date, new Date());
}

/**
 * Check if a date is in the future.
 */
export function isFuture(value: string | Date | null | undefined): boolean {
  const date = safeParseDate(value);
  if (!date) {
    return false;
  }
  return isAfter(date, new Date());
}

// ============================================================================
// DATE CALCULATIONS
// ============================================================================

/**
 * Safely calculate difference in days between two dates.
 */
export function safeDiffInDays(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): number {
  const d1 = safeParseDate(date1);
  const d2 = safeParseDate(date2);
  if (!d1 || !d2) {
    return 0;
  }
  return differenceInDays(d1, d2);
}

/**
 * Safely calculate difference in hours between two dates.
 */
export function safeDiffInHours(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): number {
  const d1 = safeParseDate(date1);
  const d2 = safeParseDate(date2);
  if (!d1 || !d2) {
    return 0;
  }
  return differenceInHours(d1, d2);
}

/**
 * Safely calculate difference in minutes between two dates.
 */
export function safeDiffInMinutes(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): number {
  const d1 = safeParseDate(date1);
  const d2 = safeParseDate(date2);
  if (!d1 || !d2) {
    return 0;
  }
  return differenceInMinutes(d1, d2);
}

/**
 * Safely add days to a date.
 */
export function safeAddDays(value: string | Date | null | undefined, days: number): Date | null {
  const date = safeParseDate(value);
  if (!date) {
    return null;
  }
  return addDays(date, days);
}

/**
 * Safely subtract days from a date.
 */
export function safeSubDays(value: string | Date | null | undefined, days: number): Date | null {
  const date = safeParseDate(value);
  if (!date) {
    return null;
  }
  return subDays(date, days);
}

/**
 * Get start of day for a date.
 */
export function safeStartOfDay(value: string | Date | null | undefined): Date | null {
  const date = safeParseDate(value);
  if (!date) {
    return null;
  }
  return startOfDay(date);
}

/**
 * Get end of day for a date.
 */
export function safeEndOfDay(value: string | Date | null | undefined): Date | null {
  const date = safeParseDate(value);
  if (!date) {
    return null;
  }
  return endOfDay(date);
}

// ============================================================================
// DATE RANGE UTILITIES
// ============================================================================

/**
 * Check if a date falls within a range (inclusive).
 */
export function isWithinRange(
  date: string | Date | null | undefined,
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): boolean {
  const d = safeParseDate(date);
  const s = safeParseDate(start);
  const e = safeParseDate(end);
  
  if (!d || !s || !e) {
    return false;
  }
  
  return (isAfter(d, s) || isSameDay(d, s)) && (isBefore(d, e) || isSameDay(d, e));
}

/**
 * Format a date range.
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  fallback: string = '—'
): string {
  const s = safeParseDate(start);
  const e = safeParseDate(end);
  
  if (!s && !e) {
    return fallback;
  }
  
  if (s && !e) {
    return `${formatShortDate(s)} – Present`;
  }
  
  if (!s && e) {
    return `Until ${formatShortDate(e)}`;
  }
  
  // Same day
  if (s && e && isSameDay(s, e)) {
    return formatShortDate(s);
  }
  
  // Same year
  if (s && e && s.getFullYear() === e.getFullYear()) {
    return `${safeFormat(s, 'MMM d')} – ${formatShortDate(e)}`;
  }
  
  return `${formatShortDate(s)} – ${formatShortDate(e)}`;
}
