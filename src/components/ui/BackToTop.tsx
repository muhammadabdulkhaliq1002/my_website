'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { animator } from '@/lib/animations';

interface BackToTopProps {
  threshold?: number;
  showAtY?: number;
  smoothDuration?: number;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  hapticFeedback?: boolean;
}

const SCROLL_FRAME_RATE = 1000 / 60; // 60fps

function BackToTopComponent({
  threshold = 0.5,
  showAtY = 400,
  smoothDuration = 500,
  className = '',
  position = 'bottom-right',
  hapticFeedback = true
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const { trigger } = useHaptics();
  const frameRef = useRef<number>();
  const scrollStartTime = useRef<number>(0);
  const scrollStartPosition = useRef<number>(0);

  // Handle scroll events with throttling
  useEffect(() => {
    let lastScrollTime = 0;
    let ticking = false;

    const handleScroll = () => {
      const now = Date.now();
      
      if (!ticking && now - lastScrollTime > SCROLL_FRAME_RATE) {
        requestAnimationFrame(() => {
          const shouldShow = window.pageYOffset > showAtY;
          setIsVisible(shouldShow);
          lastScrollTime = now;
          ticking = false;
        });
        ticking = true;
      }
    };

    // Use Intersection Observer when available
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsVisible(false);
            } else if (window.pageYOffset > showAtY) {
              setIsVisible(true);
            }
          });
        },
        { threshold }
      );

      // Observe the first screen
      const target = document.getElementById('main-content') || document.body;
      observer.observe(target);

      return () => observer.disconnect();
    } else {
      // Fallback to scroll event
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [showAtY, threshold]);

  const scrollToTop = useCallback(() => {
    if (isScrolling) return;

    if (hapticFeedback) {
      trigger('medium');
    }

    setIsScrolling(true);
    scrollStartPosition.current = window.pageYOffset;
    scrollStartTime.current = performance.now();

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - scrollStartTime.current;
      const progress = Math.min(elapsed / smoothDuration, 1);
      
      const easedProgress = easeOutCubic(progress);
      const newPosition = scrollStartPosition.current * (1 - easedProgress);
      
      window.scrollTo(0, newPosition);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animateScroll);
      } else {
        setIsScrolling(false);
        if (hapticFeedback) {
          trigger('light');
        }
      }
    };

    frameRef.current = requestAnimationFrame(animateScroll);

    // Animate the button
    animator.animate(
      document.getElementById('back-to-top-btn')!,
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.9)' },
        { transform: 'scale(1)' }
      ],
      {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    );
  }, [isScrolling, smoothDuration, hapticFeedback, trigger]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!isVisible) return null;

  return (
    <button
      id="back-to-top-btn"
      onClick={scrollToTop}
      disabled={isScrolling}
      className={`
        fixed ${positionClasses[position]}
        p-3 rounded-full
        bg-blue-600 text-white
        shadow-lg hover:bg-blue-700
        transform transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-400
        disabled:opacity-50
        ${isScrolling ? 'scale-90' : 'scale-100 hover:scale-105'}
        ${className}
      `}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
      aria-label="Scroll to top"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const BackToTop = memo(BackToTopComponent);