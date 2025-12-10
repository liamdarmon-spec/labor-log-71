/**
 * Input Sanitization Utilities
 * 
 * Provides functions to clean and normalize user input.
 * Helps prevent XSS, injection attacks, and data quality issues.
 */

// ============================================================================
// STRING SANITIZATION
// ============================================================================

/**
 * Remove leading/trailing whitespace and normalize internal whitespace
 */
export function sanitizeString(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Remove all HTML tags from a string
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize a string for safe display (strip HTML, escape special chars)
 */
export function sanitizeForDisplay(value: string | null | undefined): string {
  return escapeHtml(stripHtml(sanitizeString(value)));
}

/**
 * Remove non-printable characters
 */
export function removeNonPrintable(value: string | null | undefined): string {
  if (!value) return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Normalize line endings to \n
 */
export function normalizeLineEndings(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Truncate string to max length, adding ellipsis if needed
 */
export function truncate(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// NAME SANITIZATION
// ============================================================================

/**
 * Sanitize a person's name (capitalize, trim, remove extra spaces)
 */
export function sanitizeName(value: string | null | undefined): string {
  if (!value) return '';
  return sanitizeString(value)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Sanitize a project/company name (trim, normalize spaces, preserve case)
 */
export function sanitizeProjectName(value: string | null | undefined): string {
  return sanitizeString(value);
}

// ============================================================================
// NUMBER SANITIZATION
// ============================================================================

/**
 * Parse and sanitize a number input
 * Returns NaN for invalid inputs
 */
export function sanitizeNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  if (typeof value === 'number') {
    return isFinite(value) ? value : NaN;
  }
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isFinite(num) ? num : NaN;
}

/**
 * Sanitize a currency input (returns number or 0)
 */
export function sanitizeCurrency(value: string | number | null | undefined): number {
  const num = sanitizeNumber(value);
  if (isNaN(num)) return 0;
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Sanitize hours input (0-24 range)
 */
export function sanitizeHours(value: string | number | null | undefined): number {
  const num = sanitizeNumber(value);
  if (isNaN(num)) return 0;
  // Clamp to 0-24 range and round to 2 decimal places
  return Math.round(Math.max(0, Math.min(24, num)) * 100) / 100;
}

/**
 * Sanitize a percentage input (0-100 range)
 */
export function sanitizePercent(value: string | number | null | undefined): number {
  const num = sanitizeNumber(value);
  if (isNaN(num)) return 0;
  return Math.round(Math.max(0, Math.min(100, num)) * 100) / 100;
}

/**
 * Sanitize an integer input
 */
export function sanitizeInteger(value: string | number | null | undefined): number {
  const num = sanitizeNumber(value);
  if (isNaN(num)) return 0;
  return Math.round(num);
}

/**
 * Sanitize a positive integer (returns 0 for negative/invalid)
 */
export function sanitizePositiveInteger(value: string | number | null | undefined): number {
  const num = sanitizeInteger(value);
  return Math.max(0, num);
}

// ============================================================================
// PHONE NUMBER SANITIZATION
// ============================================================================

/**
 * Extract digits from a phone number
 */
export function extractPhoneDigits(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Format a phone number as (XXX) XXX-XXXX
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  const digits = extractPhoneDigits(value);
  if (digits.length === 0) return '';
  
  // Handle 11-digit numbers starting with 1
  const normalizedDigits = digits.length === 11 && digits.startsWith('1') 
    ? digits.slice(1) 
    : digits;
  
  if (normalizedDigits.length !== 10) {
    return value || ''; // Return original if not a valid US number
  }
  
  return `(${normalizedDigits.slice(0, 3)}) ${normalizedDigits.slice(3, 6)}-${normalizedDigits.slice(6)}`;
}

/**
 * Sanitize phone number to E.164 format (+1XXXXXXXXXX)
 */
export function sanitizePhoneE164(value: string | null | undefined): string {
  const digits = extractPhoneDigits(value);
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return ''; // Invalid phone number
}

// ============================================================================
// EMAIL SANITIZATION
// ============================================================================

/**
 * Sanitize an email address (lowercase, trim)
 */
export function sanitizeEmail(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

// ============================================================================
// URL SANITIZATION
// ============================================================================

/**
 * Sanitize a URL (add protocol if missing, validate format)
 */
export function sanitizeUrl(value: string | null | undefined): string {
  if (!value) return '';
  let url = value.trim();
  
  // Add https:// if no protocol specified
  if (url && !url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  
  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch {
    return ''; // Invalid URL
  }
}

// ============================================================================
// DATE SANITIZATION
// ============================================================================

/**
 * Sanitize a date string to ISO format (yyyy-MM-dd)
 */
export function sanitizeDateString(value: string | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

// ============================================================================
// FORM DATA SANITIZATION
// ============================================================================

/**
 * Sanitize an entire form data object
 * 
 * @example
 * const sanitizedData = sanitizeFormData(formData, {
 *   name: sanitizeName,
 *   email: sanitizeEmail,
 *   phone: formatPhoneNumber,
 *   amount: sanitizeCurrency,
 * });
 */
export function sanitizeFormData<T extends Record<string, any>>(
  data: T,
  sanitizers: { [K in keyof T]?: (value: T[K]) => T[K] }
): T {
  const result = { ...data };
  
  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    if (sanitizer && key in result) {
      (result as any)[key] = (sanitizer as any)(result[key]);
    }
  }
  
  return result;
}

// ============================================================================
// SQL/INJECTION PREVENTION
// ============================================================================

/**
 * Escape single quotes for safe SQL interpolation
 * NOTE: Always prefer parameterized queries over string interpolation
 */
export function escapeSqlString(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/'/g, "''");
}

/**
 * Sanitize a value for use in a LIKE query
 */
export function escapeLikePattern(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\\/g, '\\\\');
}

// ============================================================================
// FILE NAME SANITIZATION
// ============================================================================

/**
 * Sanitize a filename (remove special characters, limit length)
 */
export function sanitizeFilename(value: string | null | undefined): string {
  if (!value) return 'unnamed';
  
  // Remove or replace unsafe characters
  let filename = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove unsafe chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Collapse multiple dots
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
  
  // Limit length (preserving extension)
  const maxLength = 200;
  if (filename.length > maxLength) {
    const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
    const baseName = filename.slice(0, filename.length - ext.length);
    filename = baseName.slice(0, maxLength - ext.length) + ext;
  }
  
  return filename || 'unnamed';
}
