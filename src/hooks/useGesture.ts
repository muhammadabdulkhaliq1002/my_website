import { useEffect, useRef, useState, useCallback } from 'react';

interface GestureOptions {
  onSwipeLeft?: (velocity: number) => void;
  onSwipeRight?: (velocity: number) => void;
  onSwipeUp?: (velocity: number) => void;
  onSwipeDown?: (velocity: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  threshold?: number;
  velocityThreshold?: number;
  preventScroll?: boolean;
  touchAction?: 'none' | 'pan-x' | 'pan-y' | 'auto';
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface TouchState {
  initialTouch: TouchPoint;
  lastTouch: TouchPoint;
  velocityX: number;
  velocityY: number;
  isTracking: boolean;
}

const VELOCITY_SAMPLE_INTERVAL = 16.67; // ~60fps
const MOMENTUM_FACTOR = 0.95;

export function useGesture(options: GestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPan,
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    touchAction = 'auto'
  } = options;

  const touchState = useRef<TouchState | null>(null);
  const frameId = useRef<number>();
  const [isSwiping, setIsSwiping] = useState(false);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, []);

  const calculateVelocity = useCallback((current: TouchPoint, last: TouchPoint) => {
    const deltaTime = current.time - last.time;
    if (deltaTime === 0) return { x: 0, y: 0 };

    return {
      x: (current.x - last.x) / deltaTime,
      y: (current.y - last.y) / deltaTime
    };
  }, []);

  const handlePan = useCallback((deltaX: number, deltaY: number, velocity: { x: number, y: number }) => {
    if (onPan) {
      onPan(deltaX, deltaY);
    }

    // Apply momentum if velocity is significant
    if (Math.abs(velocity.x) > velocityThreshold || Math.abs(velocity.y) > velocityThreshold) {
      let momentumX = velocity.x;
      let momentumY = velocity.y;

      const applyMomentum = () => {
        if (Math.abs(momentumX) < 0.01 && Math.abs(momentumY) < 0.01) return;

        onPan?.(momentumX, momentumY);
        momentumX *= MOMENTUM_FACTOR;
        momentumY *= MOMENTUM_FACTOR;
        frameId.current = requestAnimationFrame(applyMomentum);
      };

      frameId.current = requestAnimationFrame(applyMomentum);
    }
  }, [onPan, velocityThreshold]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }

      const touch = e.touches[0];
      const touchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      touchState.current = {
        initialTouch: touchPoint,
        lastTouch: touchPoint,
        velocityX: 0,
        velocityY: 0,
        isTracking: true
      };

      setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.current?.isTracking) return;

      if (preventScroll) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const currentTouch = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      // Update velocity on regular intervals
      if (currentTouch.time - touchState.current.lastTouch.time >= VELOCITY_SAMPLE_INTERVAL) {
        const velocity = calculateVelocity(currentTouch, touchState.current.lastTouch);
        touchState.current.velocityX = velocity.x;
        touchState.current.velocityY = velocity.y;
        touchState.current.lastTouch = currentTouch;

        // Call pan handler with current deltas and velocity
        const deltaX = currentTouch.x - touchState.current.initialTouch.x;
        const deltaY = currentTouch.y - touchState.current.initialTouch.y;
        handlePan(deltaX, deltaY, velocity);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchState.current?.isTracking) return;

      const touch = e.changedTouches[0];
      const currentTouch = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      const deltaX = currentTouch.x - touchState.current.initialTouch.x;
      const deltaY = currentTouch.y - touchState.current.initialTouch.y;
      const velocity = calculateVelocity(currentTouch, touchState.current.lastTouch);
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

      // Only trigger for swipes with sufficient velocity
      if (speed > velocityThreshold) {
        // Check if horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight(velocity.x);
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft(-velocity.x);
          }
        }
        // Check if vertical swipe
        else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown(velocity.y);
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp(-velocity.y);
          }
        }
      }

      setIsSwiping(false);
      touchState.current.isTracking = false;
    };

    const handleTouchCancel = () => {
      if (touchState.current?.isTracking) {
        setIsSwiping(false);
        touchState.current.isTracking = false;
      }
    };

    // Apply touch-action CSS property to prevent browser default behaviors
    if (preventScroll) {
      document.body.style.touchAction = touchAction;
    }

    // Use passive listeners where possible for better scrolling performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { 
      passive: !preventScroll,
      capture: true // Ensure our handler runs first
    });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);

      if (preventScroll) {
        document.body.style.touchAction = 'auto';
      }
    };
  }, [
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown, 
    threshold,
    velocityThreshold,
    preventScroll,
    touchAction,
    calculateVelocity,
    handlePan
  ]);

  return { 
    isSwiping,
    velocity: touchState.current ? {
      x: touchState.current.velocityX,
      y: touchState.current.velocityY
    } : { x: 0, y: 0 }
  };
}