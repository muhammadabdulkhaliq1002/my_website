import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { animator } from '@/lib/animations';

interface VirtualKeyboardOptions {
  layout?: 'numeric' | 'calculator';
  onInput?: (value: string) => void;
  onClose?: () => void;
  initialValue?: string;
  maxLength?: number;
  debounceTime?: number;
  predictiveInput?: boolean;
  hapticFeedback?: boolean;
}

interface KeyBuffer {
  value: string;
  timestamp: number;
}

const BUFFER_TIMEOUT = 16; // ~60fps
const LONG_PRESS_DELAY = 500;
const REPEAT_INTERVAL = 100;

export function useVirtualKeyboard({
  layout = 'numeric',
  onInput,
  onClose,
  initialValue = '',
  maxLength = 10,
  debounceTime = 150,
  predictiveInput = true,
  hapticFeedback = true
}: VirtualKeyboardOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const { trigger } = useHaptics();
  
  const inputBuffer = useRef<KeyBuffer[]>([]);
  const bufferTimeout = useRef<number>();
  const longPressTimer = useRef<NodeJS.Timeout>();
  const repeatTimer = useRef<NodeJS.Timeout>();
  const lastKeyPress = useRef<{ key: string; time: number }>();
  const compositionRef = useRef<string>('');
  
  // Memoize regex patterns and validation
  const keyPattern = useMemo(() => ({
    numeric: /^[0-9.]$/,
    calculator: /^[0-9.+\-*/]$/
  }), []);

  const validateValue = useCallback((newValue: string) => {
    if (layout === 'calculator') {
      // Prevent multiple operators
      if (/[+\-*/]/.test(newValue.slice(-1)) && /[+\-*/]/.test(newValue.slice(-2, -1))) {
        return false;
      }
      // Prevent invalid calculator expressions
      if (!/^[0-9.]+([+\-*/][0-9.]+)*$/.test(newValue)) {
        return false;
      }
    }
    return true;
  }, [layout]);

  // Enhanced input handler with input prediction
  const processInput = useCallback((key: string) => {
    const now = Date.now();
    inputBuffer.current.push({ value: key, timestamp: now });

    // Clear existing buffer timeout
    if (bufferTimeout.current) {
      cancelAnimationFrame(bufferTimeout.current);
    }

    // Process buffer on next frame
    bufferTimeout.current = requestAnimationFrame(() => {
      const currentBuffer = inputBuffer.current;
      if (currentBuffer.length === 0) return;

      // Filter out old entries
      const recentEntries = currentBuffer.filter(
        entry => now - entry.timestamp < BUFFER_TIMEOUT
      );

      // Process buffered input
      setValue(prev => {
        let newValue = prev;
        for (const entry of recentEntries) {
          switch (entry.value) {
            case 'backspace':
              newValue = newValue.slice(0, -1);
              break;
            case 'clear':
              newValue = '';
              break;
            case '.':
              if (!newValue.includes('.')) {
                newValue = newValue + entry.value;
              }
              break;
            default:
              if (newValue.length < maxLength && validateValue(newValue + entry.value)) {
                newValue = newValue + entry.value;
              }
              break;
          }
        }
        return newValue;
      });

      // Clear buffer
      inputBuffer.current = [];
    });
  }, [maxLength, validateValue]);

  // Optimized debounced input handler
  const debouncedInput = useCallback((newValue: string) => {
    if (onInput) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        onInput(newValue);
      }, debounceTime);
    }
  }, [onInput, debounceTime]);

  // Enhanced key press handler with long press support
  const handleKeyPress = useCallback((key: string, isLongPress = false) => {
    if (hapticFeedback) {
      trigger(isLongPress ? 'medium' : 'light');
    }

    const now = Date.now();
    lastKeyPress.current = { key, time: now };

    // Handle long press for backspace and clear
    if (isLongPress && (key === 'backspace' || key === 'clear')) {
      setValue('');
      debouncedInput('');
      return;
    }

    processInput(key);
    
    // Start long press timer
    if (key === 'backspace') {
      longPressTimer.current = setTimeout(() => {
        repeatTimer.current = setInterval(() => {
          processInput(key);
        }, REPEAT_INTERVAL);
      }, LONG_PRESS_DELAY);
    }
  }, [hapticFeedback, trigger, processInput, debouncedInput]);

  // Handle key release
  const handleKeyRelease = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = undefined;
    }
  }, []);

  // Predictive input handler
  const predictNextInput = useCallback((currentValue: string) => {
    if (!predictiveInput || layout !== 'calculator') return;

    // Predict next likely input based on calculator pattern
    const lastChar = currentValue.slice(-1);
    if (/[0-9]/.test(lastChar)) {
      // After number, likely operators
      return ['+', '-', '*', '/'];
    } else if (/[+\-*/]/.test(lastChar)) {
      // After operator, likely numbers
      return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    }
    return [];
  }, [layout, predictiveInput]);

  // Optimize keyboard layout rendering
  const keyboardLayout = useMemo(() => {
    const predictions = predictNextInput(value);
    return {
      keys: layout === 'numeric' 
        ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']
        : ['1', '2', '3', '+', '4', '5', '6', '-', '7', '8', '9', '*', '.', '0', '/', '='],
      predictions
    };
  }, [layout, value, predictNextInput]);

  const open = useCallback(() => {
    setIsOpen(true);
    // Pre-cache animation frames
    animator.addFrameCallback(() => {});
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    handleKeyRelease();
    onClose?.();
  }, [onClose, handleKeyRelease]);

  // Enhanced physical keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      // Handle IME composition
      if (e.isComposing) {
        compositionRef.current += e.key;
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('backspace');
        return;
      }

      const pattern = keyPattern[layout];
      if (pattern.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        handleKeyRelease();
      }
    };

    const handleCompositionEnd = () => {
      if (compositionRef.current) {
        const validChars = compositionRef.current
          .split('')
          .filter(char => keyPattern[layout].test(char));
        
        validChars.forEach(char => handleKeyPress(char));
        compositionRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('compositionend', handleCompositionEnd);
      handleKeyRelease();
      if (bufferTimeout.current) {
        cancelAnimationFrame(bufferTimeout.current);
      }
    };
  }, [isOpen, layout, handleKeyPress, handleKeyRelease, close, keyPattern]);

  // Update input when value changes
  useEffect(() => {
    debouncedInput(value);
  }, [value, debouncedInput]);

  // Reset state when layout changes
  useEffect(() => {
    setValue(initialValue);
    compositionRef.current = '';
  }, [layout, initialValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (bufferTimeout.current) {
        cancelAnimationFrame(bufferTimeout.current);
      }
      handleKeyRelease();
    };
  }, [handleKeyRelease]);

  return {
    isOpen,
    value,
    open,
    close,
    handleKeyPress,
    handleKeyRelease,
    layout: keyboardLayout,
    predictions: keyboardLayout.predictions
  };
}