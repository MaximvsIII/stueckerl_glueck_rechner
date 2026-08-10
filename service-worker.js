// SERVICE WORKER DI EMERGENZA - DISTRUZIONE CACHE
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map(name => caches.delete(name)));
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Non usare mai la cache, vai sempre sulla rete
  event.respondWith(fetch(event.request));
});
