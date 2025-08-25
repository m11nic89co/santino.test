const CACHE_NAME = 'santino-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/santino_magneto_outlined.svg',
  '/santino_magneto.svg',
  '/santino_og.png',
  '/site.webmanifest',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/magneto_bold.ttf',
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
  evt.respondWith(
    caches.match(evt.request).then(resp => {
      if (resp) return resp;
      return fetch(evt.request).then(res => {
        // optionally cache new resources
        return res;
      }).catch(() => {
        // fallback to cached index for navigation
        if (evt.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
