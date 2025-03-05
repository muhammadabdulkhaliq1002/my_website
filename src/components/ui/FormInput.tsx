'use client';

import { InputHTMLAttributes, useRef, useState, useCallback, memo } from 'react';
import { useHaptics } from '@/hooks/useHaptics';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  floatingLabel?: boolean;
  showSuccess?: boolean;
  debounceTime?: number;
  validateOnChange?: boolean;
}

function FormInputComponent({
  label,
  error,
  touched,
  helperText,
  className = '',
  id,
  floatingLabel = true,
  showSuccess = true,
  debounceTime = 150,
  validateOnChange = true,
  onChange,
  onBlur,
  disabled,
  required,
  ...props
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState(props.defaultValue || props.value || '');
  const { trigger } = useHaptics();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const inputId = id || props.name;
  const hasError = error && touched;
  const hasValue = value !== '';
  const showFloatingLabel = floatingLabel && (isFocused || hasValue);

  // Debounced change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onChange?.(e);
      if (hasError && validateOnChange) {
        trigger('light');
      }
    }, debounceTime);
  }, [onChange, hasError, validateOnChange, trigger, debounceTime]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    trigger('light');
  }, [trigger]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
    if (hasError) {
      trigger('light');
    }
  }, [onBlur, hasError, trigger]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl/Cmd + A to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.currentTarget.select();
    }
    // Escape to blur
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  }, []);

  return (
    <div className="relative mb-4">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          {...props}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={`${inputId}-error ${inputId}-helper`}
          className={`
            peer w-full px-3 py-2 rounded-md border bg-white
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            transition-all duration-200
            ${hasError 
              ? 'border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
            }
            ${showFloatingLabel ? 'pt-6 pb-2' : 'py-3'}
            focus:outline-none focus:ring-4 focus:border-transparent
            ${props.type === 'number' ? 'appearance-none' : ''}
            ${className}
          `}
        />
        <label 
          htmlFor={inputId}
          className={`
            absolute left-3 transition-all duration-200
            ${showFloatingLabel 
              ? 'transform -translate-y-3 scale-75 origin-left text-gray-500' 
              : 'translate-y-2'
            }
            ${disabled ? 'text-gray-400' : 'text-gray-700'}
            ${hasError ? 'text-red-500' : ''}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {!hasError && showSuccess && touched && hasValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-h-[20px]"> {/* Prevent layout shift */}
        {hasError && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 animate-fadeIn"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const FormInput = memo(FormInputComponent);