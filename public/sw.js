// PWA Service Worker for SpecialsApp & MunchiDate
const CACHE_NAME = 'munchidate-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Install service worker and cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.warn("SW caching issue:", err))
  );
  self.skipWaiting();
});

// Activate service worker and clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First for Navigation/HTML, Cache-First for static assets, with offline fallbacks
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  
  const isHtmlRequest = event.request.mode === 'navigate' || 
                        event.request.headers.get('accept')?.includes('text/html') ||
                        event.request.url.endsWith('.html');
                        
  if (isHtmlRequest) {
    // Network-First strategy: Always check the network for index.html/updates first, fallback to cache if offline
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request) || caches.match('/index.html') || caches.match('/');
      })
    );
  } else {
    // Cache-First strategy for static assets (js, css, images, fonts, audio)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          return new Response("Offline Content Available", { status: 200, headers: { 'Content-Type': 'text/plain' } });
        });
      })
    );
  }
});

// PWA Background Sync Event Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-specials') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/manifest.json').then((response) => {
          if (response.status === 200) {
            cache.put('/manifest.json', response);
          }
        });
      }).catch(err => console.log("Background sync failed:", err))
    );
  }
});

// PWA Periodic Background Sync Event Listener
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-specials-sync') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/').then((response) => {
          if (response.status === 200) {
            cache.put('/', response);
          }
        });
      }).catch(err => console.log("Periodic background sync failed:", err))
    );
  }
});

// Background Push Notification handler
self.addEventListener('push', (event) => {
  let payload = {
    title: '✨ Match Alert | MunchiDate',
    body: 'Someone is looking for you! Tap to check compatible daily specials near you.',
    url: '/'
  };
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }
  
  const options = {
    body: payload.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: '💬 Chat Now' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click router
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus if tab is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new tab if none exist
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
