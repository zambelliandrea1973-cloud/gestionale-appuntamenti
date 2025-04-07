// Nome della cache
const CACHE_NAME = 'studio-app-v3';

// File da memorizzare nella cache per il funzionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js',
  '/icons/app-icon.svg',
  '/icons/default-app-icon.jpg'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Errore durante la cache:', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Elimina le cache vecchie che non sono più necessarie
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Per le richieste API, prova prima la rete e poi fallback sulla cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Per risorse statiche, controlla prima la cache e poi la rete
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // La risorsa è stata trovata nella cache
          if (response) {
            return response;
          }
          
          // Se la risorsa non è nella cache, scaricala dalla rete
          return fetch(event.request)
            .then((response) => {
              // Verifica se abbiamo ricevuto una risposta valida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clona la risposta perché il body può essere usato solo una volta
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  // Aggiungi la risorsa alla cache
                  cache.put(event.request, responseToCache);
                });

              return response;
            });
        })
    );
  }
});

// Gestione degli aggiornamenti in background
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Aggiornamento icona
  if (event.data && event.data.type === 'UPDATE_ICON') {
    const iconUrl = event.data.iconUrl;
    if (iconUrl) {
      // Aggiorna la cache con la nuova icona
      caches.open(CACHE_NAME)
        .then(cache => {
          // Prima rimuoviamo eventuali vecchie versioni dell'icona
          cache.delete('/icons/app-icon.svg')
            .then(() => cache.delete('/icons/default-app-icon.jpg'))
            .then(() => {
              // Poi aggiungiamo la nuova icona alla cache
              return cache.add(iconUrl);
            })
            .then(() => {
              console.log('Icona aggiornata nella cache');
            })
            .catch(error => {
              console.error('Errore durante l\'aggiornamento dell\'icona nella cache:', error);
            });
        });
    }
  }
});