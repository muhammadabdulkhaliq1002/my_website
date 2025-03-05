'use client';

import React, { useCallback, useState, useMemo, useEffect, FormEvent } from 'react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { Spinner } from '@/components/ui/Spinner';
import { debounce } from 'lodash';
import type { DebouncedFunc } from 'lodash';
import { calculateTax } from '@/lib/taxCalculations';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { VirtualKeypad } from '@/components/ui/VirtualKeypad';
import { useHaptics } from '@/hooks/useHaptics';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useFinancialYear } from '@/app/dashboard/layout';

const TAX_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 750000, rate: 0.10 },
  { min: 750000, max: 1000000, rate: 0.15 },
  { min: 1000000, max: 1250000, rate: 0.20 },
  { min: 1250000, max: 1500000, rate: 0.25 },
  { min: 1500000, max: null, rate: 0.30 }
];

interface ActiveInput {
  field: string;
  value: string;
}

interface FormData {
  salaryIncome: number;
  businessIncome: number;
  housePropertyIncome: number;
  capitalGains: number;
  otherIncome: number;
  assessmentYear: string;
}

interface TaxBreakdown {
  slab: string;
  taxableAmount: number;
  taxAmount: number;
}

interface TaxCalculationResult {
  breakdown: TaxBreakdown[];
  totalTax: number;
  cess: number;
  finalTax: number;
}

interface TaxCalculation extends TaxCalculationResult {
  totalIncome: number;
}

interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

interface FormErrors {
  [key: string]: string | undefined;
}

const TaxReturnForm: React.FC = () => {
  const { selectedYear } = useFinancialYear();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { trigger } = useHaptics();
  const prefetch = usePrefetch();

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const initialValues: FormData = {
    salaryIncome: 0,
    businessIncome: 0,
    housePropertyIncome: 0,
    capitalGains: 0,
    otherIncome: 0,
    assessmentYear: selectedYear
  };

  const rules: ValidationRules = {
    salaryIncome: [
      {
        validate: (value: any) => !isNaN(Number(value)),
        message: 'Please enter a valid number'
      },
      {
        validate: (value: any) => Number(value) >= 0,
        message: 'Amount cannot be negative'
      },
      {
        validate: (value: any) => Number(value) <= 100000000,
        message: 'Amount exceeds maximum limit (10 Crore)'
      }
    ],
    businessIncome: [
      {
        validate: (value: any) => !isNaN(Number(value)),
        message: 'Please enter a valid number'
      },
      {
        validate: (value: any) => Number(value) >= 0,
        message: 'Amount cannot be negative'
      },
      {
        validate: (value: any) => Number(value) <= 100000000,
        message: 'Amount exceeds maximum limit (10 Crore)'
      }
    ],
    housePropertyIncome: [
      {
        validate: (value: any) => !isNaN(Number(value)),
        message: 'Please enter a valid number'
      },
      {
        validate: (value: any) => Number(value) >= -200000,
        message: 'Loss from house property cannot exceed ₹2,00,000'
      },
      {
        validate: (value: any) => Number(value) <= 100000000,
        message: 'Amount exceeds maximum limit (10 Crore)'
      }
    ],
    capitalGains: [
      {
        validate: (value: any) => !isNaN(Number(value)),
        message: 'Please enter a valid number'
      },
      {
        validate: (value: any) => Number(value) >= 0,
        message: 'Amount cannot be negative'
      },
      {
        validate: (value: any) => Number(value) <= 100000000,
        message: 'Amount exceeds maximum limit (10 Crore)'
      }
    ],
    otherIncome: [
      {
        validate: (value: any) => !isNaN(Number(value)),
        message: 'Please enter a valid number'
      },
      {
        validate: (value: any) => Number(value) >= 0,
        message: 'Amount cannot be negative'
      },
      {
        validate: (value: any) => Number(value) <= 100000000,
        message: 'Amount exceeds maximum limit (10 Crore)'
      }
    ],
    assessmentYear: [
      {
        validate: (value: any) => /^\d{4}-\d{4}$/.test(value),
        message: 'Assessment year must be in YYYY-YYYY format'
      },
      {
        validate: (value: any) => {
          const [start, end] = value.split('-').map(Number);
          return end === start + 1;
        },
        message: 'End year must be one year after start year'
      },
      {
        validate: (value: any) => {
          const currentYear = new Date().getFullYear();
          const [start] = value.split('-').map(Number);
          return start >= currentYear - 2 && start <= currentYear + 1;
        },
        message: 'Assessment year must be within 2 years past or 1 year future'
      }
    ]
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset
  } = useFormValidation({
    initialValues,
    rules,
    onSubmit: async (values: Record<string, any>) => {
      setIsSubmitting(true);
      try {
        const formValues = values as FormData;
        const totalIncome = 
          formValues.salaryIncome +
          formValues.businessIncome +
          formValues.housePropertyIncome +
          formValues.capitalGains +
          formValues.otherIncome;

        const calcResult = await calculateTax(totalIncome);
        const finalCalc: TaxCalculation = {
          totalIncome,
          ...calcResult
        };

        if (isOnline) {
          await handleServerSubmit(formValues, finalCalc);
        } else {
          localStorage.setItem('pendingTaxReturn', JSON.stringify({
            formData: formValues,
            calculations: finalCalc
          }));
        }
        setShowPreview(true);
      } catch (error) {
        console.error('Submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  // Debounced auto-save function with proper typing
  const debouncedSave: DebouncedFunc<(formData: FormData) => void> = useMemo(
    () =>
      debounce((formData: FormData) => {
        localStorage.setItem('draftTaxReturn', JSON.stringify(formData));
      }, 1000),
    []
  );

  // Auto-save on form changes
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      debouncedSave(values as FormData);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [values, touched, debouncedSave]);

  const handleServerSubmit = async (formData: FormData, calculations: TaxCalculation) => {
    const response = await fetch('/api/dashboard/tax-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, calculations })
    });

    if (!response.ok) {
      throw new Error('Failed to submit tax return');
    }
  };

  const handleInputFocus = useCallback((field: string, value: string) => {
    if (window.innerWidth <= 768) {
      setActiveInput({ field, value });
      setShowKeypad(true);
    }
  }, []);

  const handleKeypadInput = useCallback((value: string) => {
    if (!activeInput) return;

    handleChange({
      target: {
        name: activeInput.field,
        value,
        type: 'number'
      }
    } as React.ChangeEvent<HTMLInputElement>);

    trigger('light');
  }, [activeInput, handleChange, trigger]);

  const handleKeypadClose = useCallback(() => {
    setShowKeypad(false);
    setActiveInput(null);
    trigger('medium');
  }, [trigger]);

  // Keep only one useEffect for back navigation
  useEffect(() => {
    const handleBackNavigation = () => {
      if (showKeypad) {
        handleKeypadClose();
        return true;
      }
      return false;
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBackNavigation);

    return () => {
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, [showKeypad, handleKeypadClose]);

  const renderFormField = (field: keyof FormData) => {
    if (field === 'assessmentYear') {
      return renderYearSelect(field);
    }
    return renderNumericField(field);
  };

  const renderYearSelect = (field: keyof FormData) => {
    return (
      <>
        <label className="label">
          <span className="label-text capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
        </label>
        <select
          name={field}
          value={values[field]}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            handleChange({
              target: {
                name: field,
                value: e.target.value,
                type: 'text'
              }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          onBlur={(e: React.FocusEvent<HTMLSelectElement>) => {
            handleBlur({
              target: {
                name: field,
                value: e.target.value,
                type: 'text'
              }
            } as React.FocusEvent<HTMLInputElement>);
          }}
          disabled={isSubmitting}
          className="select select-bordered w-full"
        >
          {(() => {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let i = -2; i <= 1; i++) {
              const startYear = currentYear + i;
              const endYear = startYear + 1;
              years.push(`${startYear}-${endYear}`);
            }
            return years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ));
          })()}
        </select>
        {touched[field] && errors[field] && (
          <div className="text-error text-sm mt-1">
            {errors[field]}
          </div>
        )}
      </>
    );
  };

  const renderNumericField = (field: keyof FormData) => {
    return (
      <>
        <label className="label">
          <span className="label-text capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
        </label>
        <NumericStepper
          label={field.replace(/([A-Z])/g, ' $1').trim()}
          name={field}
          value={Number(values[field])}
          step={1000}
          min={field === 'housePropertyIncome' ? -200000 : 0}
          max={100000000}
          helperText={
            field === 'housePropertyIncome'
              ? 'Loss from house property cannot exceed ₹2,00,000'
              : field === 'salaryIncome'
              ? 'Include basic salary, HRA, and other allowances'
              : field === 'businessIncome'
              ? 'Total income from business/profession after expenses'
              : field === 'capitalGains'
              ? 'Include both short-term and long-term capital gains'
              : field === 'otherIncome'
              ? 'Interest income, dividends, and other sources'
              : undefined
          }
          onValueChange={(value) => {
            handleChange({
              target: {
                name: field,
                value: value.toString(),
                type: 'number'
              }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          onBlur={handleBlur}
          onFocus={() => handleInputFocus(field, values[field].toString())}
          error={touched[field] ? errors[field] : undefined}
          disabled={isSubmitting}
          className="input input-bordered w-full"
        />
        {touched[field] && errors[field] && (
          <div className="text-error text-sm mt-1">
            {errors[field]}
          </div>
        )}
      </>
    );
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'max-w-2xl mx-auto p-4' },
      React.createElement(
        'form',
        {
          onSubmit: handleSubmit,
          className: 'space-y-6',
          noValidate: true,
        },
        React.createElement(
          'div',
          { className: 'space-y-4' },
          React.createElement(
            'div',
            { className: 'grid gap-4 sm:grid-cols-2' },
            (Object.keys(initialValues) as Array<keyof FormData>).map((field) =>
              React.createElement(
                'div',
                { key: field, className: 'form-control' },
                renderFormField(field)
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'flex justify-end space-x-4' },
          React.createElement(
            'button',
            {
              type: 'submit',
              disabled: isSubmitting,
              className: 'btn btn-primary',
            },
            isSubmitting
              ? [
                  React.createElement(Spinner, {
                    key: 'spinner',
                    className: 'w-4 h-4 mr-2',
                  }),
                  React.createElement('span', { key: 'text' }, 'Processing...')
                ]
              : React.createElement('span', { key: 'text' }, 'Submit Tax Return')
          )
        )
      )
    ),
    showKeypad && activeInput && 
      React.createElement(VirtualKeypad, {
        key: 'keypad',
        onInput: handleKeypadInput,
        onClose: handleKeypadClose,
        initialValue: activeInput.value,
      })
  );
};

export default TaxReturnForm;
