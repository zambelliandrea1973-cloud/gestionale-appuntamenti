// Nome della cache
const CACHE_NAME = 'gestione-appuntamenti-v1';

// File da mettere in cache (pagine, CSS, JavaScript, immagini, ecc.)
const urlsToCache = [
  '/',
  '/index.html',
  '/client-login',
  '/client-area',
  '/consent',
  '/activate-account',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/assets/index.css', // Principale file CSS generato da Vite
  '/assets/index.js',  // Principale file JS generato da Vite
];

// Installa il Service Worker
self.addEventListener('install', event => {
  // Esegue il processo di installazione
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Errore durante la cache dei file:', error);
      })
  );
});

// Attiva il Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  // Rimuove le cache vecchie
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercetta le richieste e serve dalla cache se possibile, altrimenti dalla rete
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - restituisce la risposta dalla cache
        if (response) {
          return response;
        }
        
        // Altrimenti fa una copia della richiesta
        const fetchRequest = event.request.clone();
        
        // Cerca la risorsa nella rete
        return fetch(fetchRequest)
          .then(response => {
            // Controlla se abbiamo ricevuto una risposta valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Fa una copia della risposta
            const responseToCache = response.clone();
            
            // Apre la cache e memorizza la risposta
            caches.open(CACHE_NAME)
              .then(cache => {
                // Escludiamo le richieste POST e API dalla cache
                if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(error => {
            // Se la rete fallisce e la richiesta è per una pagina, serviamo la pagina offline
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Per altri tipi di risorse, non facciamo nulla di speciale
            console.error('Errore durante il fetch:', error);
          });
      })
  );
});