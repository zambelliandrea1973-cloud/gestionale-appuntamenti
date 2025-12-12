// Service Worker per l'applicazione di gestione appuntamenti
// Versione cache per gestire gli aggiornamenti
// IMPORTANTE: v8 - FORCE REBUILD - Google Calendar Sync Button Fix
// Build: 2025-12-12 - Complete cache invalidation for sync button
const CACHE_NAME = 'appointment-manager-v8-sync-fix';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Installazione del Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker v3: Installazione in corso...');
  // CRITICO: skipWaiting() per attivare immediatamente la nuova versione
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker v3: Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker v3: Errore durante il caching:', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker v3: Attivazione in corso...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker v3: Eliminazione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // CRITICO: clients.claim() prende controllo immediatamente
      return self.clients.claim();
    })
  );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  
  // CRITICO v6: BYPASS TOTALE per richieste POST (qualsiasi URL)
  if (event.request.method !== 'GET') {
    console.log('Service Worker v6: BYPASS TOTALE per non-GET:', event.request.method, requestUrl.pathname);
    // Non intercettare - lascia passare direttamente al network
    return;
  }
  
  // CRITICO: NON cachare NESSUNA richiesta API
  // Questo risolve il bug dove /api/user-with-license veniva cachata
  // causando cross-contamination tra utenti admin e staff
  if (requestUrl.pathname.startsWith('/api/')) {
    console.log('Service Worker v6: BYPASS cache per API:', requestUrl.pathname);
    // Network-only per tutte le API con no-cache headers
    const networkRequest = new Request(event.request.url, {
      method: event.request.method,
      headers: new Headers({
        ...Object.fromEntries(event.request.headers),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }),
      credentials: event.request.credentials
    });
    event.respondWith(fetch(networkRequest));
    return;
  }
  
  // NON cachare file JS per evitare problemi di versioning
  if (requestUrl.pathname.endsWith('.js') || requestUrl.pathname.endsWith('.tsx')) {
    console.log('Service Worker v5: BYPASS cache per JS:', requestUrl.pathname);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Solo per richieste GET non-API
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // Restituisce la risorsa dalla cache se disponibile
          if (response) {
            console.log('Service Worker v3: Serving from cache:', requestUrl.pathname);
            return response;
          }
          
          // Altrimenti effettua la richiesta di rete
          return fetch(event.request).then(function(response) {
            // Verifica se la risposta è valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la risposta per il caching (solo per file statici, non API)
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                console.log('Service Worker v2: Caching:', requestUrl.pathname);
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
        })
        .catch(function(error) {
          console.log('Service Worker v2: Errore nel fetch:', error);
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