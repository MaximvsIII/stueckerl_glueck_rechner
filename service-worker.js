const CACHE_NAME = 'calcolatore-torte-v8';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'db.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Installazione: cache immediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Attivazione: pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Fetch: Strategia "Network-First"
// Prova a scaricare dal web. Se fallisce (offline), usa la cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se la rete risponde, aggiorna la cache e restituisci
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, usa la cache
        return caches.match(event.request);
      })
  );
});
