// Service Worker completamente disabilitato
// Questo file esiste solo per evitare errori 404

// Disattiva immediatamente qualsiasi service worker esistente
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Non gestire nessun fetch
self.addEventListener('fetch', function(event) {
  // Lascia passare tutte le richieste al network
  return;
});

console.log('Service Worker disabilitato - tutte le cache pulite');