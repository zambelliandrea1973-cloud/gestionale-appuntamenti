/**
 * Service Worker per l'applicazione
 * Gestisce cache e aggiornamenti per garantire funzionalità offline e aggiornamenti
 */

// Nome della cache per il nucleo dell'applicazione
const CACHE_NAME = 'app-core-v3.0.0';

// Risorse essenziali da cachare immediatamente durante l'installazione
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/client-area',
  '/auth',
  '/pwa',
  '/icons/default-app-icon.jpg'
];

// Evento di installazione - prima attivazione del service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione in corso');
  
  // Precache risorse essenziali
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aperta');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Forza l'attivazione immediata senza aspettare la chiusura delle schede
        return self.skipWaiting();
      })
  );
});

// Evento di attivazione - quando il service worker diventa attivo
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione in corso');
  
  // Elimina le vecchie cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Service Worker] Rimozione cache obsoleta:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => {
      // Assume il controllo di tutte le pagine aperte senza refresh
      return self.clients.claim();
    })
  );
});

// Evento fetch - intercettazione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Skip per richieste API, WebSocket e analytics (non cachare)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/ws') ||
      event.request.url.includes('/socket.io/')) {
    return;
  }
  
  // Per tutti gli altri, usa strategia "Cache First, Network Fallback"
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Cache miss - get from network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache the response per future requests
            let responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        ).catch(error => {
          console.error('[Service Worker] Errore fetch:', error);
          // Se è una richiesta di una pagina HTML, mostra pagina offline
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});

// Evento di sincronizzazione in background
self.addEventListener('sync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(
      // Aggiorna la cache di base
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CORE_ASSETS);
      })
    );
  }
});

// Gestione messaggi da client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Cancella cache completa su richiesta
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});