const CACHE = 'pokevault-v14';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Cache API responses for 1 hour
  if (url.hostname === 'api.tcgdex.net') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) {
          const age = Date.now() - new Date(cached.headers.get('sw-cached') || 0).getTime();
          if (age < 3600000) return cached;
        }
        try {
          const res = await fetch(e.request);
          const clone = res.clone();
          const headers = new Headers(clone.headers);
          headers.set('sw-cached', new Date().toISOString());
          const body = await clone.blob();
          cache.put(e.request, new Response(body, { status: res.status, headers }));
          return res;
        } catch { return cached || new Response('{}', { status: 503 }); }
      })
    );
    return;
  }
  // Cache-first for app assets
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
