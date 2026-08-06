const CACHE_NAME = 'calcolatore-torte-cache-v3';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  const canCache = self.location.protocol === 'http:' || self.location.protocol === 'https:';
  event.waitUntil(
    canCache
      ? caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
      : Promise.resolve()
  );
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const responseClone = response.clone();
        const requestUrl = new URL(request.url);
        const sameOrigin = requestUrl.origin === self.location.origin;
        const canCache = (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') && sameOrigin;
        if (canCache) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
