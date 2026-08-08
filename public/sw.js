// Minimal Service Worker for installability, caching, and push notifications.
const CACHE_NAME = 'kvsulur-dlms-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Simple network-first fetching strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// ─── Push Notification Handler ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'New Notification', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'KVS Digilib';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: (data.data && data.data.url) ? data.data.url : '/',
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync & Message Bridge ─────────────────────────────────────────
// When a background sync fires, notify all clients to attempt flushing the offline queue.
self.addEventListener('sync', (event) => {
  if (event.tag && event.tag.indexOf('study-sync') === 0) {
    event.waitUntil((async () => {
      const all = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of all) {
        client.postMessage('bg-sync');
      }
    })());
  }
});

// Clients can also send a message 'trigger-sync' to request immediate sync notification
self.addEventListener('message', (ev) => {
  if (ev.data === 'trigger-sync') {
    (async () => {
      try {
        // try to register a sync (may throw on unsupported browsers)
        await self.registration.sync.register('study-sync');
      } catch (e) {
        // ignore failure
      }
      const all = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of all) client.postMessage('bg-sync');
    })();
  }
});
