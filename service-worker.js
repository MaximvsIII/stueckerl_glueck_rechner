const CACHE_NAME = 'calcolatore-torte-cache-v5';

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

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// MESSAGGI DAL CLIENT
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// FETCH
self.addEventListener('fetch', event => {
  const request = event.request;

  // Gestiamo solo richieste GET
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  // Gestiamo solo le risorse dello stesso sito
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // INDEX.HTML
  // Prima prova sempre a prendere la versione aggiornata dalla rete.
  // Se non c'è connessione, utilizza quella presente nella cache.
  if (
    requestUrl.pathname.endsWith('/') ||
    requestUrl.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );

    return;
  }

  // CSS, JS, immagini e altre risorse locali
  // Network-first: usa la versione online quando disponibile.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});