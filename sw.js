const CACHE_NAME = 'santino-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/santino_magneto_outlined.svg',
  '/santino_magneto.svg',
  '/santino_og.png',
  '/img_opt/santino_og.png',
  '/site.webmanifest',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/img_opt/favicon-32x32.png',
  '/img_opt/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/img_opt/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/img_opt/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/img_opt/android-chrome-512x512.png',
  '/magneto_bold.ttf',
  '/deferred.css',
  // logos
  '/assets/logos/auchan.svg',
  '/assets/logos/avtodor.svg',
  '/assets/logos/fix-price.svg',
  '/assets/logos/lemana-pro.svg',
  '/assets/logos/lenta.svg',
  '/assets/logos/leroy-merlin.svg',
  '/assets/logos/magnit.svg',
  '/assets/logos/metro.svg',
  '/assets/logos/okei.svg',
  '/assets/logos/perekrestok.svg',
  '/assets/logos/pyaterochka.svg',
  '/assets/logos/spar.svg',
  '/assets/logos/vkusvill.svg'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
  return cache.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'}))).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  const req = evt.request;
  const url = new URL(req.url);

  // Navigation requests: try network, fallback to cached index.html
  if (req.mode === 'navigate') {
    evt.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // CSS files: network-first to avoid serving HTML/old content as CSS
  if (req.destination === 'style' || url.pathname.endsWith('.css')) {
    evt.respondWith(
      fetch(req).then(res => {
        // update cache for offline use
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Default: cache-first, but populate cache from network when possible
  evt.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // cache images and fonts for better offline experience
        if (req.destination === 'image' || req.destination === 'font') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
        }
        return res;
      }).catch(() => {
        // for non-GET/network errors we don't always have a fallback
        return undefined;
      });
    })
  );
});
