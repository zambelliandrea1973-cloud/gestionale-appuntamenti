// Service Worker per l'app Gestione Appuntamenti
const CACHE_NAME = 'gestioneapp-v3';

// Risorse da caricare nella cache
const urlsToCache = [
  '/',
  '/index.html',
  '/client.html',
  '/client-area.html',
  '/client-area',
  '/client-login',
  '/auto-login',
  '/activate',
  '/consent',
  '/manifest.json',
  '/manifest.webmanifest',
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
  // Ignora le richieste a risorse non HTTP (come chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Handler speciale per le richieste di navigazione
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Per le richieste di navigazione, controlliamo se l'utente sta tentando
      // di andare su una pagina dell'app che potrebbe avere parametri
      (async () => {
        try {
          // Prova prima a fare la fetch dalla rete
          const networkResponse = await fetch(event.request);
          
          // Cache la risposta se è valida
          if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          console.log('Fallback to cache for navigation request', error);
          
          // Se il network fallisce, serviamo dalla cache
          const cachedResponse = await caches.match(event.request);
          
          // Se è nella cache, usiamo quella
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Per pagine PWA non trovate nella cache, reindirizza alla home page
          // Questo è importante per l'app quando viene lanciata come PWA
          console.log('No cached response for navigation, returning index.html');
          return caches.match('/index.html');
        }
      })()
    );
    return;
  }
  
  // Gestione standard per richieste non di navigazione
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