'use client';

import { useHaptics } from '@/hooks/useHaptics';
import { useEffect, useRef, useState, useCallback } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}

interface ErrorMetadata {
  timestamp: number;
  url: string;
  userAgent: string;
  errorCount: number;
}

const ERROR_THRESHOLD = 3;
const ERROR_COOLDOWN = 5000; // 5 seconds between retries
const MAX_ERROR_AGE = 30 * 60 * 1000; // 30 minutes

function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('fetch failed') ||
    error.message.includes('network') ||
    (error as any).status === 503 ||
    !navigator.onLine
  );
}

function getErrorKey(error: Error): string {
  return error.digest || error.message;
}

export default function MobileErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps) {
  const { trigger } = useHaptics();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const errorMetadata = useRef<ErrorMetadata>({
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    errorCount: 1
  });

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Error tracking and persistence
  useEffect(() => {
    const errorKey = getErrorKey(error);
    const storedErrors = JSON.parse(
      sessionStorage.getItem('errorTracking') || '{}'
    );

    // Clean up old errors
    const now = Date.now();
    Object.keys(storedErrors).forEach(key => {
      if (now - storedErrors[key].timestamp > MAX_ERROR_AGE) {
        delete storedErrors[key];
      }
    });

    // Update error tracking
    if (storedErrors[errorKey]) {
      storedErrors[errorKey].errorCount++;
      storedErrors[errorKey].timestamp = now;
    } else {
      storedErrors[errorKey] = errorMetadata.current;
    }

    sessionStorage.setItem('errorTracking', JSON.stringify(storedErrors));

    // Log to monitoring service with rate limiting
    if (process.env.NODE_ENV === 'production') {
      const errorLog = {
        ...errorMetadata.current,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: error.digest
        }
      };

      // Example: Send to monitoring service
      fetch('/api/error-logging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog),
        // Use keepalive to ensure the request completes
        keepalive: true
      }).catch(() => {
        // Silently fail if error logging fails
      });
    }
  }, [error]);

  const handleReset = useCallback(async () => {
    const errorKey = getErrorKey(error);
    const storedErrors = JSON.parse(
      sessionStorage.getItem('errorTracking') || '{}'
    );
    
    if (
      storedErrors[errorKey]?.errorCount > ERROR_THRESHOLD && 
      Date.now() - storedErrors[errorKey].timestamp < ERROR_COOLDOWN
    ) {
      trigger('error');
      return; // Prevent rapid retries
    }

    setRetryCount(count => count + 1);
    trigger('medium');

    try {
      if (isNetworkError(error)) {
        // For network errors, verify connection first
        const response = await fetch('/api/health-check');
        if (!response.ok) throw new Error('Service unavailable');
      }

      reset();
    } catch (e) {
      trigger('error');
    }
  }, [error, trigger, reset]);

  const handleRefresh = useCallback(() => {
    trigger('light');
    // Clear error tracking on manual refresh
    sessionStorage.removeItem('errorTracking');
    window.location.reload();
  }, [trigger]);

  const handleReport = useCallback(() => {
    trigger('light');
    const errorReport = {
      ...errorMetadata.current,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest
      },
      retryCount
    };

    // Open email client with error report
    const mailtoLink = `mailto:support@example.com?subject=Error Report&body=${
      encodeURIComponent(JSON.stringify(errorReport, null, 2))
    }`;
    window.location.href = mailtoLink;
  }, [error, retryCount, trigger]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="w-full max-w-md text-center space-y-6 animate-scale-in">
        <div 
          className={`
            p-4 rounded-full mx-auto w-16 h-16 
            flex items-center justify-center
            ${isOffline ? 'bg-yellow-100' : 'bg-red-100'}
          `}
        >
          {isOffline ? (
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>
        
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {isOffline 
              ? 'No Internet Connection'
              : 'Something went wrong!'}
          </h1>
          <p className="text-gray-600">
            {isOffline
              ? 'Please check your connection and try again.'
              : 'We apologize for the inconvenience. Please try again or refresh the page.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReset}
            className={`
              w-full px-4 py-2 rounded-md 
              transition-all duration-200
              transform active:scale-95
              ${retryCount > ERROR_THRESHOLD 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
              text-white touch-manipulation
            `}
            disabled={retryCount > ERROR_THRESHOLD}
          >
            {isOffline ? 'Retry Connection' : 'Try Again'}
          </button>
          <button
            onClick={handleRefresh}
            className="
              w-full px-4 py-2 border border-gray-300 
              text-gray-700 rounded-md hover:bg-gray-50 
              transition-all duration-200
              transform active:scale-95
              touch-manipulation
            "
          >
            Refresh Page
          </button>
          {!isOffline && (
            <button
              onClick={handleReport}
              className="
                w-full px-4 py-2 text-blue-600 
                hover:underline text-sm
                transition-colors touch-manipulation
              "
            >
              Report this issue
            </button>
          )}
        </div>

        {retryCount > ERROR_THRESHOLD && (
          <p className="text-sm text-red-500 animate-fadeIn">
            Too many retry attempts. Please try refreshing the page.
          </p>
        )}

        <p className="text-sm text-gray-500">
          {isOffline 
            ? 'Your changes will be saved and synced when you're back online.'
            : 'If the problem persists, please contact support.'}
        </p>
      </div>
    </div>
  );
}