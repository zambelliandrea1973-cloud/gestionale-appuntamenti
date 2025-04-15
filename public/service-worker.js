// Service Worker per l'app Gestione Appuntamenti
const CACHE_NAME = 'gestioneapp-v4';

// Risorse da caricare nella cache
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
  '/icons/default-app-icon.jpg'
];

// Configurazioni speciali per PWA
const PWA_CONFIG = {
  autoLoginEnabled: true,    // Abilita il tentativo di auto-login quando la PWA viene avviata
  preserveAuth: true,        // Preserva i dati di autenticazione tra le sessioni
  loginPath: '/auto-login',  // Path a cui reindirizzare per l'auto-login
  fallbackPath: '/login',    // Path di fallback se l'auto-login fallisce
  alwaysCacheLoginPaths: true // Assicura che le pagine di login siano sempre accessibili anche offline
};

// Installazione del service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  
  // Aggiungiamo percorsi extra per la cache in caso di necessità futura
  const loginPages = [
    '/login',
    '/client-login',
    '/auto-login'
  ];
  
  // Se è abilitata l'opzione di cachare sempre le pagine di login
  if (PWA_CONFIG.alwaysCacheLoginPaths) {
    loginPages.forEach(path => {
      if (!urlsToCache.includes(path)) {
        urlsToCache.push(path);
      }
    });
  }
  
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

// Gestione dei messaggi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Gestione dei messaggi per l'autenticazione
  if (event.data && event.data.type === 'CHECK_AUTH') {
    // Invia un messaggio a tutti i client controllati dal service worker
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'AUTH_STATUS',
          needsLogin: PWA_CONFIG.autoLoginEnabled,
          loginPath: PWA_CONFIG.loginPath
        });
      });
    });
  }
});

// L'evento fetch può essere usato per intercettare richieste specifiche
// e personalizzare il comportamento basato sul tipo di richiesta
self.addEventListener('fetch', event => {
  // Intercetta richieste API di autenticazione
  if (event.request.url.includes('/api/client/login') || 
      event.request.url.includes('/api/verify-token')) {
    // Non facciamo nulla di speciale qui, ma potremmo implementare logica custom
    // per gestire il caching o modificare le richieste se necessario
    console.log('Richiesta di autenticazione intercettata dal Service Worker');
  }
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
              autoLoginEnabled: PWA_CONFIG.autoLoginEnabled,
              loginPath: PWA_CONFIG.loginPath
            });
          })
        );
      });
    })
  );
});

// Log per debug
console.log('Service Worker registrato e funzionante (versione PWA migliorata)');