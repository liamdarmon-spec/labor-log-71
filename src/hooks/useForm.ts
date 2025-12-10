/**
 * Form Management Hook
 * 
 * Provides a simple, type-safe form state management hook with:
 * - Validation on blur/submit
 * - Sanitization on change
 * - Touched state tracking
 * - Error management
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  validateForm, 
  hasErrors as checkHasErrors,
  type FormValidators, 
  type FormErrors 
} from '@/lib/utils/validation';

// ============================================================================
// TYPES
// ============================================================================

export interface UseFormOptions<T extends Record<string, any>> {
  /** Initial form values */
  initialValues: T;
  /** Validators for each field */
  validators?: FormValidators<T>;
  /** Sanitizers for each field (run on change) */
  sanitizers?: { [K in keyof T]?: (value: T[K]) => T[K] };
  /** Callback when form is submitted with valid data */
  onSubmit?: (values: T) => void | Promise<void>;
  /** Validate on change (default: false, only validates on blur/submit) */
  validateOnChange?: boolean;
}

export interface UseFormReturn<T extends Record<string, any>> {
  /** Current form values */
  values: T;
  /** Current validation errors */
  errors: FormErrors<T>;
  /** Fields that have been touched (blurred) */
  touched: Set<keyof T>;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Whether the form has any errors */
  hasErrors: boolean;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Set a single field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple field values */
  setValues: (values: Partial<T>) => void;
  /** Mark a field as touched */
  setTouched: (field: keyof T) => void;
  /** Get error for a field (only if touched) */
  getError: (field: keyof T) => string | undefined;
  /** Handle input change event */
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Handle input blur event */
  handleBlur: (field: keyof T) => () => void;
  /** Handle form submission */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Validate all fields */
  validate: () => FormErrors<T>;
  /** Set an error manually */
  setError: (field: keyof T, error: string | undefined) => void;
  /** Clear all errors */
  clearErrors: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const {
    initialValues,
    validators = {} as FormValidators<T>,
    sanitizers = {},
    onSubmit,
    validateOnChange = false,
  } = options;

  // State
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouchedState] = useState<Set<keyof T>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed
  const hasErrors = useMemo(() => checkHasErrors(errors), [errors]);
  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      key => values[key] !== initialValues[key]
    );
  }, [values, initialValues]);

  // Set a single field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    // Apply sanitizer if available
    const sanitizer = sanitizers[field];
    const sanitizedValue = sanitizer ? sanitizer(value) : value;

    setValuesState(prev => ({ ...prev, [field]: sanitizedValue }));

    // Validate on change if enabled
    if (validateOnChange && validators[field]) {
      const result = validators[field]!(sanitizedValue);
      setErrors(prev => ({
        ...prev,
        [field]: result.isValid ? undefined : result.error,
      }));
    }
  }, [sanitizers, validateOnChange, validators]);

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => {
      const updated = { ...prev };
      for (const [key, value] of Object.entries(newValues)) {
        const sanitizer = sanitizers[key as keyof T];
        (updated as any)[key] = sanitizer ? sanitizer(value) : value;
      }
      return updated;
    });
  }, [sanitizers]);

  // Mark a field as touched
  const setTouched = useCallback((field: keyof T) => {
    setTouchedState(prev => new Set([...prev, field]));
  }, []);

  // Get error for a field (only if touched)
  const getError = useCallback((field: keyof T): string | undefined => {
    if (!touched.has(field)) return undefined;
    return errors[field];
  }, [touched, errors]);

  // Handle input change event
  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setValue(field, value as T[keyof T]);
    };
  }, [setValue]);

  // Handle input blur event
  const handleBlur = useCallback((field: keyof T) => {
    return () => {
      setTouched(field);
      
      // Validate field on blur
      if (validators[field]) {
        const result = validators[field]!(values[field]);
        setErrors(prev => ({
          ...prev,
          [field]: result.isValid ? undefined : result.error,
        }));
      }
    };
  }, [setTouched, validators, values]);

  // Validate all fields
  const validate = useCallback((): FormErrors<T> => {
    const newErrors = validateForm(values, validators);
    setErrors(newErrors);
    // Mark all fields as touched
    setTouchedState(new Set(Object.keys(values) as (keyof T)[]));
    return newErrors;
  }, [values, validators]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validate all fields
    const validationErrors = validate();
    
    if (checkHasErrors(validationErrors)) {
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit, values]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState(new Set());
    setIsSubmitting(false);
  }, [initialValues]);

  // Set an error manually
  const setError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    hasErrors,
    isDirty,
    setValue,
    setValues,
    setTouched,
    getError,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validate,
    setError,
    clearErrors,
  };
}

// ============================================================================
// FIELD HELPER HOOK
// ============================================================================

/**
 * Get props for a form field
 * 
 * @example
 * const form = useForm({ initialValues: { email: '' }, validators: { email: required() } });
 * 
 * <Input {...getFieldProps(form, 'email')} />
 */
export function getFieldProps<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  field: keyof T
): {
  value: T[keyof T];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: () => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
} {
  const error = form.getError(field);
  return {
    value: form.values[field],
    onChange: form.handleChange(field),
    onBlur: form.handleBlur(field),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${String(field)}-error` : undefined,
  };
}

export default useForm;
