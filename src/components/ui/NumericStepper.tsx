'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { animator } from '@/lib/animations';

interface NumericStepperProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onValueChange: (value: number) => void;
  step?: number;
  formatValue?: (value: number) => string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  hapticFeedback?: boolean;
  animateChanges?: boolean;
}

interface TouchState {
  startY: number;
  startValue: number;
  velocity: number;
  lastY: number;
  lastTime: number;
}

function NumericStepperComponent({
  label,
  value: propValue,
  onValueChange,
  step = 1000,
  min = 0,
  max,
  formatValue = (v) => v.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
  error,
  touched,
  helperText,
  className = '',
  hapticFeedback = true,
  animateChanges = true,
  ...props
}: NumericStepperProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isLongPress, setIsLongPress] = useState(false);
  const { trigger } = useHaptics();
  const inputRef = useRef<HTMLInputElement>(null);
  const touchState = useRef<TouchState | null>(null);
  const stepInterval = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>();
  const lastValue = useRef<number>(typeof propValue === 'number' ? propValue : 0);

  // Reset display value when propValue changes externally
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplayValue('');
      
      if (animateChanges && typeof propValue === 'number') {
        const diff = propValue - lastValue.current;
        if (Math.abs(diff) > step) {
          // Animate large changes
          animator.animate(inputRef.current!, [
            { transform: `translateY(${diff > 0 ? '100%' : '-100%'})`, opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 }
          ], {
            duration: 200,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
          });
        }
      }
      lastValue.current = typeof propValue === 'number' ? propValue : 0;
    }
  }, [propValue, step, animateChanges]);

  const applyValueChange = useCallback((newValue: number, intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    const clampedValue = Math.max(Number(min), Math.min(Number(max || Infinity), newValue));
    if (clampedValue !== propValue) {
      onValueChange(clampedValue);
      if (hapticFeedback) {
        trigger(intensity);
      }
    } else if (
      (clampedValue === Number(max) && newValue > clampedValue) ||
      (clampedValue === Number(min) && newValue < clampedValue)
    ) {
      // Provide feedback when hitting limits
      if (hapticFeedback) {
        trigger('heavy');
      }
    }
  }, [propValue, min, max, onValueChange, hapticFeedback, trigger]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent zooming
    const touch = e.touches[0];
    touchState.current = {
      startY: touch.clientY,
      startValue: typeof propValue === 'number' ? propValue : 0,
      velocity: 0,
      lastY: touch.clientY,
      lastTime: e.timeStamp
    };
  }, [propValue]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return;

    const touch = e.touches[0];
    const deltaY = touchState.current.startY - touch.clientY;
    const deltaTime = e.timeStamp - touchState.current.lastTime;
    
    if (deltaTime > 0) {
      touchState.current.velocity = (touchState.current.lastY - touch.clientY) / deltaTime;
    }

    touchState.current.lastY = touch.clientY;
    touchState.current.lastTime = e.timeStamp;

    const sensitivity = 0.5; // Adjust for sensitivity
    const numSteps = deltaY * sensitivity;
    const newValue = touchState.current.startValue + (numSteps * step);
    
    applyValueChange(newValue, Math.abs(touchState.current.velocity) > 1 ? 'medium' : 'light');
  }, [step, applyValueChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return;

    // Apply momentum scrolling
    if (Math.abs(touchState.current.velocity) > 0.5) {
      const momentum = () => {
        if (!touchState.current) return;
        
        touchState.current.velocity *= 0.95; // Apply friction
        const delta = touchState.current.velocity * 16; // For 60fps
        const newValue = (typeof propValue === 'number' ? propValue : 0) + (delta * step);
        
        if (Math.abs(touchState.current.velocity) > 0.1) {
          applyValueChange(newValue);
          frameRef.current = requestAnimationFrame(momentum);
        } else {
          touchState.current = null;
        }
      };
      frameRef.current = requestAnimationFrame(momentum);
    }
  }, [propValue, step, applyValueChange]);

  const startIncrement = useCallback((increment: boolean) => {
    setIsLongPress(true);
    const baseInterval = 150;
    let currentInterval = baseInterval;
    let stepMultiplier = 1;

    const adjust = () => {
      const currentValue = typeof propValue === 'number' ? propValue : 0;
      const newValue = currentValue + (increment ? step : -step) * stepMultiplier;
      
      applyValueChange(newValue, stepMultiplier > 1 ? 'medium' : 'light');
      
      // Accelerate stepping
      currentInterval = Math.max(50, currentInterval * 0.9);
      stepMultiplier = Math.min(10, stepMultiplier * 1.1);
      
      stepInterval.current = setTimeout(adjust, currentInterval);
    };

    adjust();
  }, [propValue, step, applyValueChange]);

  const stopIncrement = useCallback(() => {
    setIsLongPress(false);
    if (stepInterval.current) {
      clearTimeout(stepInterval.current);
    }
  }, []);

  // Handle keyboard shortcuts and number input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = typeof propValue === 'number' ? propValue : 0;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = currentValue + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1);
      applyValueChange(newValue);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const newValue = currentValue + (e.key === 'PageUp' ? step : -step) * 10;
      applyValueChange(newValue);
    } else if (!/[\d.,\-+]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }, [propValue, step, applyValueChange]);

  // Handle wheel events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentValue = typeof propValue === 'number' ? propValue : 0;
    const multiplier = e.shiftKey ? 10 : 1;
    const newValue = currentValue + (e.deltaY > 0 ? -step : step) * multiplier;
    applyValueChange(newValue);
  }, [propValue, step, applyValueChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stepInterval.current) {
        clearTimeout(stepInterval.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative space-y-1">
      <label 
        htmlFor={props.id || props.name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="flex items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id={props.id || props.name}
            type="text"
            inputMode="decimal"
            value={displayValue || formatValue(Number(propValue))}
            onFocus={(e) => {
              const rawValue = String(Number(propValue));
              setDisplayValue(rawValue);
              e.target.select();
            }}
            onBlur={() => setDisplayValue('')}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9.-]+/g, '');
              setDisplayValue(rawValue);
              
              if (rawValue === '' || rawValue === '.' || rawValue === '-') {
                applyValueChange(0);
              } else {
                const numValue = Number(rawValue);
                if (!isNaN(numValue)) {
                  applyValueChange(numValue);
                }
              }
            }}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`
              block w-full px-3 py-2 rounded-md border
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-all duration-200
              ${error && touched ? 'border-red-500' : 'border-gray-300'}
              ${className}
            `}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
            }}
            {...props}
          />
        </div>
        <div className="flex flex-col ml-2 select-none touch-manipulation">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              startIncrement(true);
            }}
            onMouseUp={stopIncrement}
            onMouseLeave={stopIncrement}
            onTouchStart={() => startIncrement(true)}
            onTouchEnd={stopIncrement}
            className={`
              p-1 rounded focus:outline-none transition-colors duration-150
              ${isLongPress ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600'}
            `}
            aria-label="Increment"
            disabled={max !== undefined && Number(propValue) >= max}
          >
            ▲
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              startIncrement(false);
            }}
            onMouseUp={stopIncrement}
            onMouseLeave={stopIncrement}
            onTouchStart={() => startIncrement(false)}
            onTouchEnd={stopIncrement}
            className={`
              p-1 rounded focus:outline-none transition-colors duration-150
              ${isLongPress ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600'}
            `}
            aria-label="Decrement"
            disabled={Number(propValue) <= min}
          >
            ▼
          </button>
        </div>
      </div>
      {error && touched ? (
        <p 
          className="mt-1 text-sm text-red-600 animate-fadeIn" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : helperText ? (
        <p 
          className="mt-1 text-sm text-gray-500"
          id={`${props.id || props.name}-description`}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const NumericStepper = memo(NumericStepperComponent);
