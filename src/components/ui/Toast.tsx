'use client';

import { createContext, useContext, useCallback, useState, useRef, memo } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { animator } from '@/lib/animations';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type: Toast['type'], options?: {
    duration?: number;
    icon?: React.ReactNode;
    action?: Toast['action'];
  }) => void;
  clearToasts: () => void;
}

interface ToastQueueItem extends Toast {
  timeoutId?: NodeJS.Timeout;
  animationId?: number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_LIMIT = 3;
const ANIMATION_DURATION = 300;
const SWIPE_THRESHOLD = 80;

const ToastIcons = {
  success: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
};

const ToastProviderComponent = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastQueueItem[]>([]);
  const { trigger } = useHaptics();
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchStartX = useRef<number>(0);
  const isAnimating = useRef<boolean>(false);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast?.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
      if (toast?.animationId) {
        cancelAnimationFrame(toast.animationId);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const animateToast = useCallback((id: string, direction: 'in' | 'out' = 'in') => {
    const element = toastRefs.current.get(id);
    if (!element || isAnimating.current) return;

    isAnimating.current = true;
    
    const animation = animator.animate(element, [
      {
        opacity: direction === 'in' ? 0 : 1,
        transform: `translate3d(${direction === 'in' ? '0, 100%, 0' : '0, 0, 0'})`,
      },
      {
        opacity: direction === 'in' ? 1 : 0,
        transform: `translate3d(${direction === 'in' ? '0, 0, 0' : '100%, 0, 0'})`,
      }
    ], {
      duration: ANIMATION_DURATION,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
      onComplete: () => {
        isAnimating.current = false;
        if (direction === 'out') {
          removeToast(id);
        }
      }
    });

    return animation;
  }, [removeToast]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'],
    options: {
      duration?: number;
      icon?: React.ReactNode;
      action?: Toast['action'];
    } = {}
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const { duration = 5000, icon = ToastIcons[type], action } = options;

    // Trigger haptic feedback
    switch (type) {
      case 'success':
        trigger('success');
        break;
      case 'error':
        trigger('error');
        break;
      case 'warning':
        trigger('warning');
        break;
      default:
        trigger('light');
    }

    setToasts(prev => {
      const newToasts = [...prev, { id, message, type, duration, icon, action }];
      
      // Limit number of toasts
      if (newToasts.length > TOAST_LIMIT) {
        const [oldestToast, ...remainingToasts] = newToasts;
        if (oldestToast.timeoutId) {
          clearTimeout(oldestToast.timeoutId);
        }
        return remainingToasts;
      }
      
      return newToasts;
    });

    // Setup auto-dismiss
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        const element = toastRefs.current.get(id);
        if (element) {
          animateToast(id, 'out');
        }
      }, duration);

      setToasts(prev => 
        prev.map(toast => 
          toast.id === id ? { ...toast, timeoutId } : toast
        )
      );
    }

    // Animate in
    requestAnimationFrame(() => {
      const element = toastRefs.current.get(id);
      if (element) {
        animateToast(id, 'in');
      }
    });
  }, [trigger, animateToast]);

  const clearToasts = useCallback(() => {
    setToasts(prev => {
      prev.forEach(toast => {
        if (toast.timeoutId) {
          clearTimeout(toast.timeoutId);
        }
        const element = toastRefs.current.get(toast.id);
        if (element) {
          animateToast(toast.id, 'out');
        }
      });
      return [];
    });
  }, [animateToast]);

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, id: string) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const element = toastRefs.current.get(id);
    
    if (element && deltaX > 0) {
      element.style.transform = `translate3d(${deltaX}px, 0, 0)`;
      element.style.opacity = `${1 - (deltaX / element.offsetWidth)}`;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, id: string) => {
    const element = toastRefs.current.get(id);
    if (!element) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    
    if (deltaX > SWIPE_THRESHOLD) {
      animateToast(id, 'out');
    } else {
      // Reset position
      element.style.transform = '';
      element.style.opacity = '';
    }
  }, [animateToast]);

  return (
    <ToastContext.Provider value={{ showToast, clearToasts }}>
      {children}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        <div className="max-w-sm mx-auto p-4 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              ref={el => el && toastRefs.current.set(toast.id, el)}
              role="alert"
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={`
                rounded-lg p-4 shadow-lg 
                pointer-events-auto
                flex items-center gap-3
                touch-pan-x
                ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
                ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
                ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
              `}
              style={{
                willChange: 'transform, opacity',
                transform: 'translate3d(0, 100%, 0)',
                opacity: 0
              }}
              onTouchStart={e => handleTouchStart(e, toast.id)}
              onTouchMove={e => handleTouchMove(e, toast.id)}
              onTouchEnd={e => handleTouchEnd(e, toast.id)}
            >
              {toast.icon && (
                <span className="flex-shrink-0">{toast.icon}</span>
              )}
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-inherit rounded"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const ToastProvider = memo(ToastProviderComponent);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}