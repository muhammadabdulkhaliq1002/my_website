'use client';

import { Spinner } from '@/components/ui/Spinner';
import { useEffect, useState } from 'react';

export default function Loading() {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Only show spinner after a delay to prevent flash on fast loads
    const timer = setTimeout(() => setShowSpinner(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 w-full max-w-2xl px-4">
        {showSpinner ? (
          <>
            <div className="inline-block">
              <Spinner className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-gray-600 animate-pulse">Loading...</p>
          </>
        ) : (
          // Skeleton loader to prevent layout shift
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded-md animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded-md w-3/4 mx-auto animate-pulse" />
              <div className="h-4 bg-gray-200 rounded-md w-1/2 mx-auto animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}