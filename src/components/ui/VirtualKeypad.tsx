'use client';

import { useVirtualKeyboard } from '@/lib/virtualKeyboard';
import { useHaptics } from '@/hooks/useHaptics';
import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { animator } from '@/lib/animations';

interface VirtualKeypadProps {
  onInput?: (value: string) => void;
  onClose?: () => void;
  initialValue?: string;
  maxLength?: number;
  className?: string;
  hapticFeedback?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
}

interface KeyState {
  isPressed: boolean;
  startTime: number;
  longPressTimer?: NodeJS.Timeout;
}

const LONG_PRESS_DELAY = 500;
const REPEAT_INTERVAL = 100;
const DOUBLE_TAP_DELAY = 300;

function VirtualKeypadComponent({
  onInput,
  onClose,
  initialValue = '',
  maxLength = 10,
  className = '',
  hapticFeedback = true,
  size = 'md',
  theme = 'light'
}: VirtualKeypadProps) {
  const { trigger } = useHaptics();
  const [activeKeys, setActiveKeys] = useState<Record<string, KeyState>>({});
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const frameRef = useRef<number>();

  const {
    value,
    handleKeyPress
  } = useVirtualKeyboard({
    layout: 'numeric',
    onInput,
    onClose,
    initialValue,
    maxLength
  });

  // Memoize size classes
  const sizeClasses = useMemo(() => ({
    sm: 'h-12 text-lg',
    md: 'h-16 text-xl',
    lg: 'h-20 text-2xl'
  }), []);

  // Memoize theme classes
  const themeClasses = useMemo(() => ({
    light: {
      keypad: 'bg-white shadow-lg',
      key: 'bg-gray-100 text-gray-800 active:bg-gray-200',
      clear: 'bg-red-100 text-red-600 active:bg-red-200',
      display: 'bg-gray-50 text-gray-900'
    },
    dark: {
      keypad: 'bg-gray-900 shadow-lg',
      key: 'bg-gray-800 text-gray-100 active:bg-gray-700',
      clear: 'bg-red-900 text-red-100 active:bg-red-800',
      display: 'bg-gray-800 text-gray-100'
    }
  }), []);

  const handleKeyDown = useCallback((key: string, e?: React.TouchEvent | React.MouseEvent) => {
    e?.preventDefault(); // Prevent default behavior
    
    const now = Date.now();
    setActiveKeys(prev => ({
      ...prev,
      [key]: {
        isPressed: true,
        startTime: now,
        longPressTimer: setTimeout(() => {
          if (key === 'backspace' || key === 'clear') {
            // Start continuous deletion
            const repeat = () => {
              handleKeyPress(key);
              if (hapticFeedback) trigger('medium');
              frameRef.current = requestAnimationFrame(repeat);
            };
            frameRef.current = requestAnimationFrame(repeat);
          }
        }, LONG_PRESS_DELAY)
      }
    }));

    // Handle double tap for special functions
    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      if (key === 'clear') {
        onClose?.();
        if (hapticFeedback) trigger('heavy');
      }
    }
    setLastTapTime(now);

    handleKeyPress(key);
    if (hapticFeedback) {
      trigger(key === 'clear' ? 'medium' : 'light');
    }
  }, [handleKeyPress, hapticFeedback, trigger, lastTapTime, onClose]);

  const handleKeyUp = useCallback((key: string, e?: React.TouchEvent | React.MouseEvent) => {
    e?.preventDefault();
    
    setActiveKeys(prev => {
      const { [key]: keyState, ...rest } = prev;
      if (keyState?.longPressTimer) {
        clearTimeout(keyState.longPressTimer);
      }
      return rest;
    });

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  // Handle touch events
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventScroll = (e: TouchEvent) => {
      if (Object.keys(activeKeys).length > 0) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [activeKeys]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(activeKeys).forEach(state => {
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
        }
      });
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [activeKeys]);

  const renderKey = useCallback((key: string | number, span = 1) => {
    const isPressed = activeKeys[key]?.isPressed;
    const themes = themeClasses[theme];
    const keySize = sizeClasses[size];

    return (
      <button
        type="button"
        onTouchStart={(e) => handleKeyDown(key.toString(), e)}
        onTouchEnd={(e) => handleKeyUp(key.toString(), e)}
        onMouseDown={(e) => handleKeyDown(key.toString(), e)}
        onMouseUp={(e) => handleKeyUp(key.toString(), e)}
        onMouseLeave={(e) => handleKeyUp(key.toString(), e)}
        className={`
          flex items-center justify-center
          ${keySize} rounded-lg
          font-semibold
          transition-all duration-100
          touch-manipulation
          ${key === 'clear' ? themes.clear : themes.key}
          ${isPressed ? 'scale-95' : 'scale-100'}
          ${span > 1 ? `col-span-${span}` : ''}
        `}
        aria-label={key.toString()}
        aria-pressed={isPressed}
      >
        {key === 'backspace' ? '←' : key}
      </button>
    );
  }, [activeKeys, theme, size, handleKeyDown, handleKeyUp, sizeClasses, themeClasses]);

  return (
    <div 
      className={`
        fixed bottom-0 left-0 right-0 
        ${themeClasses[theme].keypad}
        p-4 
        transform transition-transform duration-200
        ${className}
      `}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div 
        className="grid grid-cols-3 gap-2 max-w-sm mx-auto"
        style={{ touchAction: 'none' }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => renderKey(num))}
        {renderKey('clear')}
        {renderKey(0)}
        {renderKey('backspace')}
      </div>

      <div className={`
        mt-4 text-center text-2xl font-mono p-4 rounded-lg
        ${themeClasses[theme].display}
      `}>
        {value || '0'}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const VirtualKeypad = memo(VirtualKeypadComponent);