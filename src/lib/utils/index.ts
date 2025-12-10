/**
 * Utility Functions Index
 * 
 * Export all utility functions for easy importing.
 * 
 * @example
 * import { safeArray, safeFormat, formatShortDate } from '@/lib/utils';
 */

// Safe data utilities
export {
  // Arrays
  safeArray,
  safeFirst,
  safeLast,
  safeAt,
  safeSum,
  safeLength,
  // Strings
  safeString,
  safeTrim,
  safeLower,
  safeUpper,
  hasValue,
  // Numbers
  safeNumber,
  safeInt,
  safeDivide,
  safePercent,
  clamp,
  // Objects
  safeGet,
  safeKeys,
  safeValues,
  safeEntries,
  // Booleans
  safeBool,
  // Type guards
  isDefined,
  isNonEmptyString,
  isValidNumber,
  isNonEmptyArray,
  // JSON
  safeJsonParse,
  safeJsonStringify,
} from './safeData';

// Safe date utilities
export {
  // Parsing
  safeParseDate,
  safeParseDateOrNow,
  safeParseDateOr,
  // Formatting
  safeFormat,
  formatShortDate,
  formatNumericDate,
  formatISODate,
  formatTime,
  formatDateTime,
  formatDayName,
  formatShortDayName,
  formatMonthName,
  // Relative dates
  safeFormatDistance,
  safeFormatRelative,
  formatSmartDate,
  // Comparisons
  safeIsBefore,
  safeIsAfter,
  safeIsSameDay,
  isToday,
  isPast,
  isFuture,
  // Calculations
  safeDiffInDays,
  safeDiffInHours,
  safeDiffInMinutes,
  safeAddDays,
  safeSubDays,
  safeStartOfDay,
  safeEndOfDay,
  // Range
  isWithinRange,
  formatDateRange,
} from './safeDate';

// Re-export existing utilities
export { projectColorScale, getProjectColor } from './projectColors';
export { createUndoableAction } from './undoableAction';

// Pagination utilities
export {
  fetchAllPages,
  fetchPage,
  fetchWithCursor,
  getInfiniteRange,
  getNextPageParam,
  calculateTotalPages,
  isValidPage,
  clampPage,
  type PaginationParams,
  type PaginatedResult,
  type InfiniteScrollParams,
  type CursorPaginationParams,
  type CursorPaginatedResult,
} from './pagination';

// Validation utilities
export {
  required,
  minLength,
  maxLength,
  pattern,
  email,
  phone,
  url,
  dateString,
  isNumber,
  min,
  max,
  positive,
  nonNegative,
  currency,
  hours,
  compose,
  optional,
  when,
  validateForm,
  hasErrors,
  getFirstError,
  validateField,
  type ValidationResult,
  type Validator,
  type FormValidators,
  type FormErrors,
} from './validation';

// Sanitization utilities
export {
  sanitizeString,
  stripHtml,
  escapeHtml,
  sanitizeForDisplay,
  removeNonPrintable,
  normalizeLineEndings,
  truncate,
  sanitizeName,
  sanitizeProjectName,
  sanitizeNumber,
  sanitizeCurrency,
  sanitizeHours,
  sanitizePercent,
  sanitizeInteger,
  sanitizePositiveInteger,
  extractPhoneDigits,
  formatPhoneNumber,
  sanitizePhoneE164,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeDateString,
  sanitizeFormData,
  escapeSqlString,
  escapeLikePattern,
  sanitizeFilename,
} from './sanitize';
