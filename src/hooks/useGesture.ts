import { useCallback, useRef, useEffect, useState } from 'react';
import { useHaptics } from './useHaptics';
import { animator } from '@/lib/animations';

interface GestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  threshold?: number;
  velocityThreshold?: number;
  hapticFeedback?: boolean;
  preventScroll?: boolean;
  touchAction?: 'none' | 'pan-x' | 'pan-y' | 'auto';
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  touches: Touch[];
  initialDistance?: number;
  initialAngle?: number;
}

export function useGesture(options: GestureOptions = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.5,
    hapticFeedback = true,
    preventScroll = false,
    touchAction = 'auto'
  } = options;

  const touchState = useRef<TouchState | null>(null);
  const { trigger } = useHaptics();
  const isGestureInProgress = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const calculateVelocity = (distance: number, time: number) => {
    return Math.abs(distance) / time;
  };

  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touch1: Touch, touch2: Touch) => {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    );
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      touchState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTime: performance.now(),
        touches: Array.from(e.touches)
      };

      if (e.touches.length === 2) {
        const [touch1, touch2] = e.touches;
        touchState.current.initialDistance = getDistance(touch1, touch2);
        touchState.current.initialAngle = getAngle(touch1, touch2);
      }

      setIsSwiping(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState.current || isGestureInProgress.current) return;

    if (preventScroll) {
      e.preventDefault();
    }

    const currentTouch = e.touches[0];
    const { startX, startY, startTime } = touchState.current;
    
    const deltaX = currentTouch.clientX - startX;
    const deltaY = currentTouch.clientY - startY;
    const deltaTime = (performance.now() - startTime) / 1000; // Convert to seconds

    // Handle multi-touch gestures
    if (e.touches.length === 2 && touchState.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / touchState.current.initialDistance;

      if (options.onPinch) {
        options.onPinch(scale);
        if (hapticFeedback) {
          trigger('light');
        }
      }

      if (options.onRotate && touchState.current.initialAngle !== undefined) {
        const currentAngle = getAngle(e.touches[0], e.touches[1]);
        const rotation = (currentAngle - touchState.current.initialAngle) * (180 / Math.PI);
        options.onRotate(rotation);
      }
      return;
    }

    // Handle swipe gestures
    const velocity = calculateVelocity(Math.max(Math.abs(deltaX), Math.abs(deltaY)), deltaTime);
    
    if (velocity >= velocityThreshold) {
      isGestureInProgress.current = true;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) >= threshold) {
          if (deltaX > 0 && options.onSwipeRight) {
            animator.animate('swipeRight', () => {
              options.onSwipeRight?.();
              if (hapticFeedback) trigger('medium');
            });
          } else if (deltaX < 0 && options.onSwipeLeft) {
            animator.animate('swipeLeft', () => {
              options.onSwipeLeft?.();
              if (hapticFeedback) trigger('medium');
            });
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) >= threshold) {
          if (deltaY > 0 && options.onSwipeDown) {
            animator.animate('swipeDown', () => {
              options.onSwipeDown?.();
              if (hapticFeedback) trigger('medium');
            });
          } else if (deltaY < 0 && options.onSwipeUp) {
            animator.animate('swipeUp', () => {
              options.onSwipeUp?.();
              if (hapticFeedback) trigger('medium');
            });
          }
        }
      }
    }
  }, [options, threshold, velocityThreshold, hapticFeedback, trigger, preventScroll]);

  const handleTouchEnd = useCallback(() => {
    touchState.current = null;
    isGestureInProgress.current = false;
    setIsSwiping(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Apply touch-action CSS property to prevent browser default behaviors
    if (preventScroll) {
      document.body.style.touchAction = touchAction;
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      if (preventScroll) {
        document.body.style.touchAction = 'auto';
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll, touchAction]);

  return {
    isGestureSupported: typeof window !== 'undefined' && 'ontouchstart' in window,
    isSwiping
  };
}