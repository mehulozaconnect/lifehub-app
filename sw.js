const CACHE_NAME = 'lifehub-cache-v9';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell (HTML/manifest) so updates always show up
// immediately when online. Falls back to cache when offline. Icons (which
// rarely change) stay cache-first for speed.
function isAppShell(url) {
  return url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('manifest.json');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate' || (url.origin === self.location.origin && isAppShell(url))) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => { try { cache.put(event.request, resClone); } catch (e) {} });
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        return caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(event.request, res.clone()); } catch (e) {}
          return res;
        });
      }).catch(() => cached);
    })
  );
});
