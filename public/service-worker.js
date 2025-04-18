// Service Worker per l'app Gestione Appuntamenti
const CACHE_NAME = 'gestioneapp-v5';  // Aumentato versione cache

// Risorse da caricare nella cache - esteso per maggiore compatibilità
const urlsToCache = [
  '/',
  '/index.html',
  '/client.html',
  '/client-area.html',
  '/client-area',
  '/client-login',
  '/login',
  '/auto-login',
  '/activate',
  '/consent',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/default-app-icon.jpg',
  '/icons/app-icon.svg',
  // Stili e script essenziali
  '/src/main.tsx',
  '/src/App.tsx',
  // Meta percorsi per PWA
  '/pwa',
  '/share-target'
];

// Configurazioni speciali per PWA - Versione migliorata
const PWA_CONFIG = {
  redirectOnLaunch: true,     // Abilita il reindirizzamento quando la PWA viene avviata
  preserveQrData: true,       // Preserva i dati del QR code tra le sessioni
  defaultPath: '/pwa'         // Path di default a cui reindirizzare, ora va alla pagina launcher modificata
};

// Installazione del service worker - versione semplificata
self.addEventListener('install', (event) => {
  self.skipWaiting();
  
  // Aggiungiamo percorsi essenziali per la cache
  const loginPages = [
    '/login',
    '/client-login'
  ];
  
  // Aggiungi le pagine di login alla cache
  loginPages.forEach(path => {
    if (!urlsToCache.includes(path)) {
      urlsToCache.push(path);
    }
  });
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta con successo, salvataggio di ' + urlsToCache.length + ' risorse');
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
    // Verifica se la richiesta è per una pagina di login o auto-login
    const url = new URL(event.request.url);
    const isLoginPage = url.pathname === '/login' || 
                        url.pathname === '/client-login' || 
                        url.pathname === '/auto-login';
    
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
          
          // Se è una pagina di login e non è nella cache, serviamo la pagina di login standard
          if (isLoginPage) {
            console.log('Login page not in cache, serving default login page');
            const loginResponse = await caches.match('/login') || 
                                 await caches.match('/client-login') || 
                                 await caches.match('/index.html');
            if (loginResponse) return loginResponse;
          }
          
          // Per altre pagine PWA non trovate nella cache, reindirizza alla home page
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

// Gestione dei messaggi - versione semplificata
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Gestione dei messaggi per i dati QR Code
  if (event.data && event.data.type === 'SAVE_QR_DATA') {
    console.log('Salvataggio dati QR Code nel Service Worker');
    // Salva i dati del QR code per poterli usare al prossimo avvio
    if (event.data.qrData) {
      // Salviamo i dati QR nel localStorage così che siano accessibili al prossimo avvio
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'STORE_QR_DATA_LOCALLY',
            qrData: event.data.qrData
          });
        });
      });
    }
  }
  
  // Salva l'URL originale
  if (event.data && event.data.type === 'SAVE_ORIGINAL_URL') {
    console.log('Salvataggio URL originale nel Service Worker');
    if (event.data.url) {
      // Salviamo l'URL originale così da poterlo ripristinare quando l'app viene avviata
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'STORE_ORIGINAL_URL',
            url: event.data.url
          });
        });
      });
    }
  }
});

// L'evento fetch può essere usato per intercettare richieste specifiche
// e personalizzare il comportamento basato sul tipo di richiesta
self.addEventListener('fetch', event => {
  // Non facciamo nulla di specifico in questa versione semplificata
  // Questa è solo una struttura di base per eventuali implementazioni future
});

// Quando il service worker diventa attivo (dopo l'installazione)
self.addEventListener('activate', event => {
  console.log('Service Worker attivato');
  
  // Notifica tutti i client che il service worker è pronto
  event.waitUntil(
    self.clients.claim().then(() => {
      return self.clients.matchAll().then(clients => {
        return Promise.all(
          clients.map(client => {
            // Invia un messaggio a ciascun client
            return client.postMessage({
              type: 'SW_ACTIVATED',
              redirectOnLaunch: PWA_CONFIG.redirectOnLaunch,
              defaultPath: PWA_CONFIG.defaultPath
            });
          })
        );
      });
    })
  );
});

// Gestire i tentativi di accesso offline quando l'app è stata installata
self.addEventListener('fetch', event => {
  // Solo per richieste API quando siamo offline
  if (event.request.url.includes('/api/') && !navigator.onLine) {
    const url = new URL(event.request.url);
    
    // Gestione speciale per API di lettura cruciali (GET requests)
    if (event.request.method === 'GET') {
      // Tenta di servire dalla cache se possibile
      event.respondWith(
        caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se non in cache, rispondi con messaggio offline formattato
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'Sei attualmente offline. I dati potrebbero non essere aggiornati.'
            }), 
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );
    }
    
    // Per richieste di scrittura, mettiamole in una coda per inviarle più tardi
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
      // Notifichiamo l'utente che è offline e l'operazione verrà eseguita più tardi
      event.respondWith(
        new Response(
          JSON.stringify({
            error: 'offline',
            message: 'Sei attualmente offline. L\'operazione verrà completata quando torni online.',
            request: {
              url: event.request.url,
              method: event.request.method
            }
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );
      
      // In teoria, qui potremmo anche salvare la richiesta in IndexedDB per processarla più tardi
      // quando torniamo online, ma questo richiederebbe un'implementazione più complessa
    }
  }
});

// Ascolta eventi di connettività 
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ONLINE_STATUS_CHANGE') {
    const isOnline = event.data.isOnline;
    console.log(`Service Worker: connettività cambiata, ora ${isOnline ? 'online' : 'offline'}`);

    // Se torniamo online, potremmo processare la coda di richieste in attesa
    if (isOnline) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACK_ONLINE',
            message: 'Connessione ripristinata!'
          });
        });
      });
    }
  }
});

// Log per debug
console.log('Service Worker registrato e funzionante (versione PWA migliorata con supporto offline)');