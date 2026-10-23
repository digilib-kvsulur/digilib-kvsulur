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
const CACHE_NAME = 'kvsulur-dlms-v10';
const STORAGE_IMAGE_CACHE = 'kvsulur-storage-images-v1';
const STORAGE_IMAGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_IMAGE_MAX_ENTRIES = 60;
const STORAGE_IMAGE_MAX_BYTES = 1024 * 1024;
const ASSETS = [
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
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== STORAGE_IMAGE_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip chrome-extension, API calls, Supabase endpoints, and non-http(s),
  // except public Supabase Storage images which are safe to cache locally.
  if (!url.protocol.startsWith('http')) return;
  const isPublicStorageImage = url.hostname.endsWith('.supabase.co') &&
    /^\/storage\/v1\/object\/(?:public|render\/image\/public)\//.test(url.pathname) &&
    /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname) &&
    event.request.method === 'GET';
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') ||
      (url.hostname.includes('supabase.co') && !isPublicStorageImage)) return;

  if (isPublicStorageImage) {
    event.respondWith((async () => {
      const cache = await caches.open(STORAGE_IMAGE_CACHE);
      const cached = await cache.match(event.request);
      const cachedAt = cached ? Number(cached.headers.get('x-dlms-cached-at') || 0) : 0;
      const isFresh = cached && cachedAt > 0 && Date.now() - cachedAt < STORAGE_IMAGE_MAX_AGE_MS;
      if (isFresh) return cached;

      try {
        const response = await fetch(event.request);
        const contentType = response.headers.get('content-type') || '';
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (response.status === 200 && contentType.startsWith('image/') &&
            contentLength > 0 && contentLength <= STORAGE_IMAGE_MAX_BYTES) {
          const headers = new Headers(response.headers);
          headers.set('x-dlms-cached-at', String(Date.now()));
          const cacheableResponse = new Response(response.clone().body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
          await cache.put(event.request, cacheableResponse);
          const keys = await cache.keys();
          while (keys.length > STORAGE_IMAGE_MAX_ENTRIES) {
            await cache.delete(keys.shift());
          }
        }
        return response;
      } catch (error) {
        // Retain expired cache entries until the network succeeds so images
        // remain available during a temporary outage.
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  const isAsset = url.pathname.startsWith('/assets/');

  event.respondWith(
    (async () => {
      try {
        // Hashed bundles are checked against the active deployment first. A
        // cache-first response can keep a suspended PWA on an old app shell,
        // whose later lazy imports may point at chunks removed by a deploy.
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            // ONLY cache static hashed assets (JS/CSS/images in /assets/), NEVER cache HTML navigation documents
            if (isAsset) {
              try {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache).catch(() => {});
                }).catch(() => {});
              } catch (e) {
                /* ignore clone error */
              }
            }
          }
          return networkResponse;
        } catch (netErr) {
          try {
            // Keep offline support, but only use an old bundle when the network
            // is unavailable. A network 404 is returned above so the app can
            // reload the current document instead of executing stale modules.
            if (isAsset) {
              const cachedAsset = await caches.match(event.request);
              if (cachedAsset) return cachedAsset;
            }

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
    data = { title: 'KV Sulur DLMS', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'PM SHRI KV Sulur DigiLib';
  const targetUrl = (data.data && data.data.url) ? data.data.url : (data.url || '/');
  
  const options = {
    body: data.body || 'You have a new update from KV Sulur DLMS.',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: targetUrl,
    },
    tag: data.tag || 'dlms-notification',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'open', title: 'Open DigiLib' }
    ]
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
