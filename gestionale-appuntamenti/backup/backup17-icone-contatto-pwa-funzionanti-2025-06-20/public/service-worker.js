// Service Worker per l'applicazione di gestione appuntamenti
// Versione cache per gestire gli aggiornamenti
const CACHE_NAME = 'appointment-manager-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Installazione del Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installazione in corso...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker: Errore durante il caching:', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Attivazione in corso...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminazione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', function(event) {
  // Solo per richieste GET
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // Restituisce la risorsa dalla cache se disponibile
          if (response) {
            return response;
          }
          
          // Altrimenti effettua la richiesta di rete
          return fetch(event.request).then(function(response) {
            // Verifica se la risposta è valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la risposta per il caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
        })
        .catch(function(error) {
          console.log('Service Worker: Errore nel fetch:', error);
          // In caso di errore, restituisce la richiesta originale
          return fetch(event.request);
        })
    );
  }
});

// Gestione dei messaggi dal client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Script caricato correttamente');