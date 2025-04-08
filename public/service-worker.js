// Nome e versione della cache
const CACHE_NAME = 'gestionale-appuntamenti-v1.0.1';

// Asset da cachare inizialmente (files, immagini, fonts, ecc.)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/default-app-icon.jpg',
  '/icons/app-icon.svg'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione');
  
  // Esecuzione fino al completamento dell'installazione
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Creazione cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Tutti i file sono stati cachati');
        return self.skipWaiting();
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione');
  
  // Rimuovere le vecchie versioni della cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Rimozione della vecchia cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Rivendicazione dei clients');
      return self.clients.claim();
    })
  );
});

// Strategia di caching: Cache First, poi Network
self.addEventListener('fetch', (event) => {
  // Ignoriamo le richieste di analytics o di terze parti
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - restituiamo la risposta dalla cache
        if (response) {
          return response;
        }
        
        // Cloniamo la richiesta perché può essere usata una volta sola
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then((response) => {
            // Controlliamo se abbiamo ricevuto una risposta valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cloniamo la risposta perché il body può essere letto una sola volta
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.log('[Service Worker] Errore di fetch:', error);
            // Possiamo fornire una fallback per connessioni offline qui
          });
      })
  );
});

// Gestione delle notifiche push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notifica push ricevuta');
  
  const title = 'Promemoria Appuntamento';
  const options = {
    body: event.data.text(),
    icon: '/icons/default-app-icon.jpg',
    badge: '/icons/app-icon.svg'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Click su notifica
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Click su notifica', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Gestione aggiornamenti
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});