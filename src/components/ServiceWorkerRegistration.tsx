'use client';

import { useEffect, useCallback } from 'react';
import { Toast } from '@/components/ui/Toast';

const SW_CACHE_NAME = 'integrated-accounting-cache-v1';
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60; // Check for updates every hour

export function ServiceWorkerRegistration() {
  const showUpdateToast = useCallback(() => {
    Toast.show({
      type: 'info',
      message: 'New version available! Refresh to update.',
      duration: 10000,
      action: {
        label: 'Update',
        onClick: () => window.location.reload()
      }
    });
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });

      // Periodic update checks
      setInterval(() => {
        registration.update();
      }, UPDATE_CHECK_INTERVAL);

      // Handle controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (registration.active) {
          showUpdateToast();
        }
      });

      // Cleanup old caches
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== SW_CACHE_NAME) {
          await caches.delete(key);
        }
      }

    } catch (err) {
      console.error('ServiceWorker registration failed:', err);
      
      // Attempt recovery
      if ('caches' in window) {
        try {
          await caches.delete(SW_CACHE_NAME);
          await navigator.serviceWorker.getRegistrations()
            .then(registrations => {
              for (const registration of registrations) {
                registration.unregister();
              }
            });
          // Retry registration after cleanup
          setTimeout(registerServiceWorker, 1000);
        } catch (cleanupErr) {
          console.error('Cache cleanup failed:', cleanupErr);
        }
      }
    }
  }, [showUpdateToast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Delay registration until after critical resources are loaded
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
        return () => window.removeEventListener('load', registerServiceWorker);
      }
    }
  }, [registerServiceWorker]);

  return null;
}