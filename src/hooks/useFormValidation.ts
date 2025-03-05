import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

interface UseFormValidationProps {
  initialValues: Record<string, any>;
  rules: ValidationRules;
  onSubmit: (values: Record<string, any>) => void;
  debounceTime?: number;
}

interface ValidationErrors {
  [key: string]: string;
}

export function useFormValidation({
  initialValues,
  rules,
  onSubmit,
  debounceTime = 150
}: UseFormValidationProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingValidations = useRef<Set<string>>(new Set());
  const previousValues = useRef(initialValues);

  // Memoize validation functions
  const validators = useMemo(() => {
    const validatorMap = new Map<string, (value: any) => string>();
    
    Object.entries(rules).forEach(([field, fieldRules]) => {
      validatorMap.set(field, (value: any) => {
        for (const rule of fieldRules) {
          if (!rule.validate(value)) {
            return rule.message;
          }
        }
        return '';
      });
    });
    
    return validatorMap;
  }, [rules]);

  // Batch validate fields
  const batchValidate = useCallback((fieldsToValidate: Set<string>) => {
    const newErrors: ValidationErrors = { ...errors };
    let hasChanges = false;

    fieldsToValidate.forEach(field => {
      const validator = validators.get(field);
      if (validator) {
        const error = validator(values[field]);
        if (error !== newErrors[field]) {
          newErrors[field] = error;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setErrors(newErrors);
    }
    pendingValidations.current.clear();
  }, [validators, values, errors]);

  // Debounced change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;

    setValues(prev => {
      const newValues = { ...prev, [name]: processedValue };
      previousValues.current = newValues;
      return newValues;
    });

    // Only validate if field was touched
    if (touched[name]) {
      pendingValidations.current.add(name);

      if (debounceTimers.current[name]) {
        clearTimeout(debounceTimers.current[name]);
      }

      debounceTimers.current[name] = setTimeout(() => {
        batchValidate(pendingValidations.current);
      }, debounceTime);
    }
  }, [touched, debounceTime, batchValidate]);

  // Optimized blur handler
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Clear any pending debounced validation
    if (debounceTimers.current[name]) {
      clearTimeout(debounceTimers.current[name]);
    }

    // Immediate validation on blur
    const validator = validators.get(name);
    if (validator) {
      const error = validator(values[name]);
      if (error !== errors[name]) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  }, [validators, values, errors]);

  // Optimized submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any pending validations
    Object.values(debounceTimers.current).forEach(clearTimeout);
    pendingValidations.current.clear();

    // Validate all fields synchronously
    const newErrors: ValidationErrors = {};
    let isValid = true;

    validators.forEach((validator, field) => {
      const error = validator(values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    if (isValid) {
      setIsSubmitting(true);
      try {
        await Promise.resolve(onSubmit(values));
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Find first error and scroll to it
      const firstErrorField = document.querySelector(
        `[name="${Object.keys(newErrors)[0]}"]`
      );
      if (firstErrorField instanceof HTMLElement) {
        const headerOffset = 80; // Adjust based on your header height
        const elementPosition = firstErrorField.getBoundingClientRect().top;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollBy({
          top: offsetPosition,
          behavior: 'smooth'
        });
        firstErrorField.focus();
      }
    }
  }, [validators, values, onSubmit]);

  const reset = useCallback(() => {
    // Clear all pending operations
    Object.values(debounceTimers.current).forEach(clearTimeout);
    pendingValidations.current.clear();
    
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    previousValues.current = initialValues;
  }, [initialValues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues)
  };
}