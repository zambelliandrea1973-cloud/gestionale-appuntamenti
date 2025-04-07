// Nome della cache
const CACHE_NAME = 'studio-app-v5';

// File da memorizzare nella cache per il funzionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/client-area',
  '/client-login',
  '/consent',
  '/icons/app-icon.svg',
  '/icons/default-app-icon.jpg'
];

// Impedisci errori di cache per i file generati dinamicamente da Vite
self.addEventListener('push', () => {
  // Gestione base per evitare errori di mancanza di gestione
  console.log('Evento push ricevuto');
});

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installato');
  // Forza l'attivazione immediata senza aspettare il refresh della pagina
  self.skipWaiting();
  
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
  console.log('Service Worker attivato');
  // Forza il controllo immediato di tutte le pagine
  event.waitUntil(clients.claim());
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('Cache esistenti:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Elimina le cache vecchie che non sono più necessarie
            console.log('Eliminazione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Proteggi da errori non gestiti che potrebbero causare crash del service worker
  try {
    // Ignora le richieste di favicon o di file di sviluppo Vite che potrebbero causare problemi
    if (
      event.request.url.includes('favicon.ico') || 
      event.request.url.includes('__vite') ||
      event.request.url.match(/\.(hot-update|map)$/)
    ) {
      return;
    }
    
    // Gestione delle richieste in base al metodo
    if (event.request.method !== 'GET') {
      return;
    }
    
    // Per le richieste API, prova prima la rete e poi fallback sulla cache
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            console.log('Fallback alla cache per richiesta API:', event.request.url);
            return caches.match(event.request);
          })
      );
    } else {
      // Per risorse statiche o navigazione, usa la strategia cache-first
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            // La risorsa è stata trovata nella cache
            if (response) {
              return response;
            }
            
            // Se la risorsa non è nella cache, scaricala dalla rete
            return fetch(event.request)
              .then((networkResponse) => {
                // Se la richiesta fallisce, ritorna un errore gestito
                if (!networkResponse || networkResponse.status !== 200) {
                  // Per le pagine dell'app, ritorna la pagina principale
                  if (event.request.url.includes('/client-') || 
                      event.request.url.includes('/consent')) {
                    console.log('Reindirizzamento a index.html per:', event.request.url);
                    return caches.match('/index.html');
                  }
                  return networkResponse;
                }

                // Clona la risposta perché il body può essere usato solo una volta
                const responseToCache = networkResponse.clone();

                // Memorizza nella cache solo le risorse che ne valergono la pena
                const saveToCache = (
                  event.request.url.includes('/icons/') || 
                  event.request.url.endsWith('.html') ||
                  event.request.url.endsWith('.js') ||
                  event.request.url.endsWith('.css') ||
                  event.request.url.endsWith('.json') ||
                  event.request.url.endsWith('/')
                );
                
                if (saveToCache) {
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      console.log('Aggiunta alla cache:', event.request.url);
                      cache.put(event.request, responseToCache);
                    })
                    .catch(err => {
                      console.error('Errore durante il caching:', err);
                    });
                }

                return networkResponse;
              })
              .catch(error => {
                console.error('Errore di fetch:', error);
                // Per le pagine dell'app, ritorna la pagina principale in caso di errore
                if (event.request.url.includes('/client-') || 
                    event.request.url.includes('/consent')) {
                  return caches.match('/index.html');
                }
                // Altrimenti, propaga l'errore
                throw error;
              });
          })
      );
    }
  } catch (error) {
    console.error('Errore critico nel service worker durante il fetch:', error);
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