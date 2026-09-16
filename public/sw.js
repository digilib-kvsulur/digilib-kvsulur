// Service Worker for KV Sulur DLMS — installability, caching, and push notifications.
// ─── Domain Migration: Self-destruct if running on the old Vercel origin ────────
const NEW_ORIGIN = 'https://dlms.kvsulur.in';
const LEGACY_HOST = 'dlmskvsulur.vercel.app';

if (self.location.hostname === LEGACY_HOST) {
  // On the legacy domain: skip waiting, wipe all caches, unregister SW,
  // and tell the open tab to show the migration prompt.
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
        .then((clients) => {
          clients.forEach((c) => c.postMessage({ type: 'DOMAIN_MIGRATED', newOrigin: NEW_ORIGIN }));
          return self.registration.unregister();
        })
    );
    self.clients.claim();
  });
} else {

// ─── Normal Service Worker for dlms.kvsulur.in ─────────────────────────────────
const CACHE_NAME = 'kvsulur-dlms-v7';
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
    }).catch(() => {})
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
  const url = new URL(event.request.url);

  // Skip chrome-extension, API calls, Supabase endpoints, and non-http(s)
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.hostname.includes('supabase.co')) return;

  const isAsset = url.pathname.startsWith('/assets/');

  event.respondWith(
    (async () => {
      try {
        if (isAsset) {
          try {
            const cachedAsset = await caches.match(event.request);
            if (cachedAsset) return cachedAsset;
          } catch (e) {
            /* ignore cache match error */
          }
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            try {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              }).catch(() => {});
            } catch (e) {
              /* ignore clone error */
            }
          }
          return networkResponse;
        } catch (netErr) {
          try {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;

            if (event.request.mode === 'navigate') {
              const indexResponse = await caches.match('/index.html');
              if (indexResponse) return indexResponse;
            }
          } catch (cErr) {
            /* ignore cache match error */
          }

          return new Response('Network error occurred and no cache available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        }
      } catch (fatalErr) {
        return new Response('Service Worker Error', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      }
    })()
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

} // end else (normal domain)
