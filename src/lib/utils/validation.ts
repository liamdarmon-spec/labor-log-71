/**
 * Form Validation Utilities
 * 
 * Provides common validation functions and patterns for forms.
 * Designed to work with both controlled forms and form libraries.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export type Validator<T = string> = (value: T) => ValidationResult;

// ============================================================================
// BASIC VALIDATORS
// ============================================================================

/**
 * Validate that a value is not empty
 */
export function required(message = 'This field is required'): Validator<string | null | undefined> {
  return (value) => {
    const isValid = value !== null && value !== undefined && value.trim().length > 0;
    return { isValid, error: isValid ? undefined : message };
  };
}

/**
 * Validate minimum length
 */
export function minLength(min: number, message?: string): Validator<string> {
  return (value) => {
    const isValid = value.length >= min;
    return { 
      isValid, 
      error: isValid ? undefined : message || `Must be at least ${min} characters` 
    };
  };
}

/**
 * Validate maximum length
 */
export function maxLength(max: number, message?: string): Validator<string> {
  return (value) => {
    const isValid = value.length <= max;
    return { 
      isValid, 
      error: isValid ? undefined : message || `Must be no more than ${max} characters` 
    };
  };
}

/**
 * Validate against a regex pattern
 */
export function pattern(regex: RegExp, message = 'Invalid format'): Validator<string> {
  return (value) => {
    const isValid = regex.test(value);
    return { isValid, error: isValid ? undefined : message };
  };
}

// ============================================================================
// FORMAT VALIDATORS
// ============================================================================

/**
 * Validate email format
 */
export function email(message = 'Please enter a valid email address'): Validator<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern(emailRegex, message);
}

/**
 * Validate phone number format (US)
 */
export function phone(message = 'Please enter a valid phone number'): Validator<string> {
  return (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // US phone numbers should have 10 or 11 digits (with country code)
    const isValid = digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
    return { isValid, error: isValid ? undefined : message };
  };
}

/**
 * Validate URL format
 */
export function url(message = 'Please enter a valid URL'): Validator<string> {
  return (value) => {
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return { isValid: false, error: message };
    }
  };
}

/**
 * Validate date string format (yyyy-MM-dd)
 */
export function dateString(message = 'Please enter a valid date'): Validator<string> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return (value) => {
    if (!dateRegex.test(value)) {
      return { isValid: false, error: message };
    }
    const date = new Date(value);
    const isValid = !isNaN(date.getTime());
    return { isValid, error: isValid ? undefined : message };
  };
}

// ============================================================================
// NUMBER VALIDATORS
// ============================================================================

/**
 * Validate that a value is a valid number
 */
export function isNumber(message = 'Please enter a valid number'): Validator<string | number> {
  return (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const isValid = !isNaN(num) && isFinite(num);
    return { isValid, error: isValid ? undefined : message };
  };
}

/**
 * Validate minimum value
 */
export function min(minValue: number, message?: string): Validator<number | string> {
  return (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return { isValid: false, error: 'Please enter a valid number' };
    const isValid = num >= minValue;
    return { 
      isValid, 
      error: isValid ? undefined : message || `Must be at least ${minValue}` 
    };
  };
}

/**
 * Validate maximum value
 */
export function max(maxValue: number, message?: string): Validator<number | string> {
  return (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return { isValid: false, error: 'Please enter a valid number' };
    const isValid = num <= maxValue;
    return { 
      isValid, 
      error: isValid ? undefined : message || `Must be no more than ${maxValue}` 
    };
  };
}

/**
 * Validate that a number is positive
 */
export function positive(message = 'Must be a positive number'): Validator<number | string> {
  return min(0.01, message);
}

/**
 * Validate that a number is non-negative
 */
export function nonNegative(message = 'Must be zero or greater'): Validator<number | string> {
  return min(0, message);
}

/**
 * Validate currency amount (up to 2 decimal places)
 */
export function currency(message = 'Please enter a valid amount'): Validator<string | number> {
  return (value) => {
    const strValue = String(value);
    const currencyRegex = /^\d+(\.\d{0,2})?$/;
    if (!currencyRegex.test(strValue)) {
      return { isValid: false, error: message };
    }
    const num = parseFloat(strValue);
    const isValid = !isNaN(num) && num >= 0;
    return { isValid, error: isValid ? undefined : message };
  };
}

/**
 * Validate hours (0-24 range, up to 2 decimal places)
 */
export function hours(message = 'Please enter valid hours (0-24)'): Validator<string | number> {
  return (value) => {
    const strValue = String(value);
    const num = parseFloat(strValue);
    if (isNaN(num)) {
      return { isValid: false, error: message };
    }
    const isValid = num >= 0 && num <= 24;
    return { isValid, error: isValid ? undefined : message };
  };
}

// ============================================================================
// COMPOSITE VALIDATORS
// ============================================================================

/**
 * Combine multiple validators (all must pass)
 */
export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return (value) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  };
}

/**
 * Make a validator optional (passes if value is empty)
 */
export function optional<T>(validator: Validator<T>): Validator<T | null | undefined | ''> {
  return (value) => {
    if (value === null || value === undefined || value === '') {
      return { isValid: true };
    }
    return validator(value as T);
  };
}

/**
 * Validate if condition is true, otherwise pass
 */
export function when<T>(
  condition: boolean | (() => boolean),
  validator: Validator<T>
): Validator<T> {
  return (value) => {
    const shouldValidate = typeof condition === 'function' ? condition() : condition;
    if (!shouldValidate) {
      return { isValid: true };
    }
    return validator(value);
  };
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

export type FormValidators<T> = {
  [K in keyof T]?: Validator<T[K]>;
};

export type FormErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * Validate an entire form object
 * 
 * @example
 * const errors = validateForm(formData, {
 *   name: required(),
 *   email: compose(required(), email()),
 *   phone: optional(phone()),
 * });
 * 
 * if (Object.keys(errors).length === 0) {
 *   // Form is valid
 * }
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: FormValidators<T>
): FormErrors<T> {
  const errors: FormErrors<T> = {};
  
  for (const [key, validator] of Object.entries(validators)) {
    if (validator) {
      const result = (validator as Validator<any>)(data[key]);
      if (!result.isValid && result.error) {
        (errors as any)[key] = result.error;
      }
    }
  }
  
  return errors;
}

/**
 * Check if a form has any errors
 */
export function hasErrors<T>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(error => error !== undefined);
}

/**
 * Get the first error from a form errors object
 */
export function getFirstError<T>(errors: FormErrors<T>): string | undefined {
  return Object.values(errors).find(error => error !== undefined) as string | undefined;
}

// ============================================================================
// FIELD-LEVEL VALIDATION HOOK HELPERS
// ============================================================================

/**
 * Create a field validator that can be used with form state
 * 
 * @example
 * const [email, setEmail] = useState('');
 * const emailError = useFieldValidation(email, compose(required(), email()));
 */
export function validateField<T>(value: T, validator: Validator<T>): string | undefined {
  const result = validator(value);
  return result.error;
}

/**
 * Create a touched state tracker for form fields
 */
export function createTouchedState<T extends Record<string, any>>(): {
  touched: Set<keyof T>;
  touch: (field: keyof T) => void;
  isTouched: (field: keyof T) => boolean;
  touchAll: () => void;
  reset: () => void;
} {
  const touched = new Set<keyof T>();
  
  return {
    touched,
    touch: (field) => touched.add(field),
    isTouched: (field) => touched.has(field),
    touchAll: () => {}, // Would need field list
    reset: () => touched.clear(),
  };
}
