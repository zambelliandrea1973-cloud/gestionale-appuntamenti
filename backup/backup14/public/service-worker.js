/**
 * Service Worker (versione duplicata per compatibilità)
 * Gestisce cache e aggiornamenti per garantire funzionalità offline
 */

// Reindirizza all'implementazione principale
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Reindirizzamento a implementazione principale');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }).then(() => {
      console.log('[Service Worker Bridge] Cache pulita');
      return self.clients.claim();
    })
  );
});

// Reindirizza al service worker principale
self.addEventListener('fetch', (event) => {
  console.log('[Service Worker Bridge] Richiesta intercettata, reindirizzamento');
  event.respondWith(fetch(event.request));
});