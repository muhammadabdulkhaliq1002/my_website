// This is the service worker for the Integrated Accounting website

const CACHE_NAME = 'tax-app-cache-v1';
const OFFLINE_URL = '/offline';
const API_CACHE = 'tax-api-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/Logo.PNG',
  '/dashboard',
  '/profile',
  '/services'
];

const API_ROUTES = [
  '/api/tax-returns',
  '/api/consultations',
  '/api/documents'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(API_CACHE).then(cache => {
        // Pre-cache API responses if available
        return Promise.all(
          API_ROUTES.map(route => 
            fetch(route)
              .then(response => response.ok ? cache.put(route, response) : null)
              .catch(() => null)
          )
        );
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      }),
      // Clean up old API cache entries
      caches.open(API_CACHE).then(cache => {
        return cache.keys().then(requests => {
          return Promise.all(
            requests.map(request => {
              const url = new URL(request.url);
              const timestamp = parseInt(url.searchParams.get('timestamp') || '0');
              if (Date.now() - timestamp > 24 * 60 * 60 * 1000) { // 24 hours
                return cache.delete(request);
              }
              return Promise.resolve();
            })
          );
        });
      })
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match(OFFLINE_URL))
  );
});

async function handleApiRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // If offline, return cached response
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline response
    return new Response(
      JSON.stringify({
        error: 'You are offline',
        offline: true,
        timestamp: Date.now()
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'tax-data-sync') {
    event.waitUntil(syncData());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification('Tax Return Update', {
      body: data.message,
      icon: '/Logo.PNG',
      badge: '/Logo.PNG',
      data: data.url,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
        windowClients[0].navigate(event.notification.data);
      } else {
        clients.openWindow(event.notification.data);
      }
    })
  );
});