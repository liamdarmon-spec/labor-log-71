/**
 * Safe Data Utilities
 * 
 * Defensive helpers to prevent crashes from undefined/null values.
 * Use these when working with data from APIs, forms, or any external source.
 */

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Ensures a value is always an array. Returns empty array for null/undefined.
 * Use before .map(), .filter(), .reduce(), etc.
 * 
 * @example
 * // Instead of: items?.map(...) || []
 * safeArray(items).map(...)
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

/**
 * Safely get the first item from an array, with optional default.
 * 
 * @example
 * const first = safeFirst(users, { name: 'Unknown' });
 */
export function safeFirst<T>(arr: T[] | null | undefined, defaultValue?: T): T | undefined {
  const safe = safeArray(arr);
  return safe.length > 0 ? safe[0] : defaultValue;
}

/**
 * Safely get the last item from an array, with optional default.
 */
export function safeLast<T>(arr: T[] | null | undefined, defaultValue?: T): T | undefined {
  const safe = safeArray(arr);
  return safe.length > 0 ? safe[safe.length - 1] : defaultValue;
}

/**
 * Safely get an item at a specific index.
 */
export function safeAt<T>(arr: T[] | null | undefined, index: number, defaultValue?: T): T | undefined {
  const safe = safeArray(arr);
  if (index < 0) {
    // Support negative indices like Array.at()
    const actualIndex = safe.length + index;
    return actualIndex >= 0 ? safe[actualIndex] : defaultValue;
  }
  return index < safe.length ? safe[index] : defaultValue;
}

/**
 * Safely sum numeric values in an array.
 * Handles null/undefined arrays and non-numeric values.
 */
export function safeSum(arr: (number | null | undefined)[] | null | undefined): number {
  return safeArray(arr).reduce((sum, val) => sum + (typeof val === 'number' && !isNaN(val) ? val : 0), 0);
}

/**
 * Safely get array length, returns 0 for null/undefined.
 */
export function safeLength(arr: unknown[] | null | undefined): number {
  return safeArray(arr).length;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Ensures a value is always a string. Returns empty string for null/undefined.
 * 
 * @example
 * // Instead of: user?.name || ''
 * safeString(user?.name)
 */
export function safeString(value: string | null | undefined, defaultValue: string = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

/**
 * Safely trim a string, handling null/undefined.
 */
export function safeTrim(value: string | null | undefined): string {
  return safeString(value).trim();
}

/**
 * Safely lowercase a string, handling null/undefined.
 */
export function safeLower(value: string | null | undefined): string {
  return safeString(value).toLowerCase();
}

/**
 * Safely uppercase a string, handling null/undefined.
 */
export function safeUpper(value: string | null | undefined): string {
  return safeString(value).toUpperCase();
}

/**
 * Check if a string is non-empty after trimming.
 */
export function hasValue(value: string | null | undefined): boolean {
  return safeTrim(value).length > 0;
}

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

/**
 * Ensures a value is always a number. Returns 0 for null/undefined/NaN.
 * 
 * @example
 * // Instead of: Number(value) || 0
 * safeNumber(value)
 */
export function safeNumber(value: number | string | null | undefined, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Safely parse an integer, handling null/undefined/NaN.
 */
export function safeInt(value: number | string | null | undefined, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Safely divide numbers, avoiding division by zero.
 */
export function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined, defaultValue: number = 0): number {
  const num = safeNumber(numerator);
  const denom = safeNumber(denominator);
  if (denom === 0) {
    return defaultValue;
  }
  return num / denom;
}

/**
 * Safely calculate a percentage.
 */
export function safePercent(value: number | null | undefined, total: number | null | undefined): number {
  return safeDivide(safeNumber(value) * 100, total, 0);
}

/**
 * Clamp a number between min and max values.
 */
export function clamp(value: number | null | undefined, min: number, max: number): number {
  const num = safeNumber(value);
  return Math.min(Math.max(num, min), max);
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Safely access a nested object property.
 * 
 * @example
 * // Instead of: obj?.deeply?.nested?.value
 * safeGet(obj, 'deeply.nested.value', 'default')
 */
export function safeGet<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  path: string,
  defaultValue?: T
): T | undefined {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return (current === undefined ? defaultValue : current) as T;
}

/**
 * Safely get object keys, returns empty array for null/undefined.
 */
export function safeKeys(obj: Record<string, unknown> | null | undefined): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.keys(obj);
}

/**
 * Safely get object values, returns empty array for null/undefined.
 */
export function safeValues<T>(obj: Record<string, T> | null | undefined): T[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.values(obj);
}

/**
 * Safely get object entries, returns empty array for null/undefined.
 */
export function safeEntries<T>(obj: Record<string, T> | null | undefined): [string, T][] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.entries(obj);
}

// ============================================================================
// BOOLEAN UTILITIES
// ============================================================================

/**
 * Safely convert to boolean, with explicit handling of various falsy values.
 */
export function safeBool(value: unknown, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === 'false' || value === '0' || value === 0) {
    return false;
  }
  return defaultValue;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if value is not null or undefined.
 * Useful as a type guard in filter operations.
 * 
 * @example
 * const validItems = items.filter(isDefined);
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid number (not NaN, not Infinity).
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a non-empty array.
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// ============================================================================
// JSON UTILITIES
// ============================================================================

/**
 * Safely parse JSON, returning undefined on failure.
 */
export function safeJsonParse<T = unknown>(json: string | null | undefined, defaultValue?: T): T | undefined {
  if (!json || typeof json !== 'string') {
    return defaultValue;
  }
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely stringify to JSON, returning empty string on failure.
 */
export function safeJsonStringify(value: unknown, defaultValue: string = ''): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}
