// Service Worker per l'app Gestione Appuntamenti
const CACHE_NAME = 'gestioneapp-v1';

// Risorse da caricare nella cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/app-icon.svg',
  '/icons/default-app-icon.jpg'
];

// Installazione del service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta con successo');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Errore durante il caching delle risorse:', err);
      })
  );
});

// Attivazione: pulizia delle vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminazione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Assicurarsi che il service worker prenda immediatamente il controllo
  return self.clients.claim();
});

// Strategia di cache: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cloniamo la risposta per poterla usare sia per la cache che per il return
        const responseClone = response.clone();
        
        // Apriamo la cache e ci mettiamo la risposta, ma solo se la risposta è valida
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, proviamo a servire dalla cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se non è nella cache, mostriamo una pagina di fallback per le richieste di navigazione
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Per altre risorse, ritorniamo una risposta vuota
            return new Response('Risorsa non disponibile offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Gestione dei messaggi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log per debug
console.log('Service Worker registrato e funzionante');