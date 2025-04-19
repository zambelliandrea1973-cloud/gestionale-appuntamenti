// Service Worker Avanzato per l'app Gestione Appuntamenti
// Versione 3.1 con supporto migliorato per stream e 'duplex'
const CACHE_NAME = 'gestioneapp-v7';
const API_CACHE_NAME = 'gestioneapp-api-v7';
const STATIC_CACHE_NAME = 'gestioneapp-static-v7';

// Sistema di rilevamento problemi
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minuti
let healthCheckTimer = null;
let lastSuccessfulHealthCheck = Date.now();
let isConnected = self.navigator ? self.navigator.onLine : true;
let appIsActive = false;
let recoveryMode = false;

// Configurazione dei timeout
const FETCH_TIMEOUT = 15000; // 15 secondi timeout per fetch
const RECOVERY_INTERVAL = 2 * 60 * 1000; // 2 minuti

// Risorse critiche da caricare nella cache - esteso per maggiore compatibilità
const CRITICAL_RESOURCES = [
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
  '/assets/index.css',
  '/src/main.tsx',
  '/src/App.tsx',
  '/api/health'
];

// Risorse addizionali da caricare nella cache a priorità inferiore
const ADDITIONAL_RESOURCES = [
  '/pwa',
  '/share-target',
  // Aggiungi qui altre risorse statiche come icone, font, ecc.
  '/icons/logo.svg',
  '/icons/flowers-icon.svg',
  '/assets/fonts/inter.woff2',
  '/pwa',
  '/share-target'
];

// Lista completa delle risorse da cachare
const urlsToCache = [...CRITICAL_RESOURCES, ...ADDITIONAL_RESOURCES];

// Lista degli errori comuni e soluzioni
const COMMON_ERRORS = {
  'Failed to fetch': 'Impossibile raggiungere il server. Verificare la connessione.',
  'NetworkError': 'Errore di rete. Riprova più tardi.',
  'TypeError': 'Errore durante il caricamento delle risorse. Ricarica la pagina.',
  'The operation was aborted': 'Operazione interrotta dal browser. Riprova.',
  'AbortError': 'Richiesta interrotta per timeout o altro motivo.',
  'ServiceWorker registration failed': 'Impossibile registrare il Service Worker. Prova a ricaricare la pagina.',
  'duplex member must be specified': 'Errore durante lo streaming dei dati. Ricarica l\'applicazione.'
};

// Configurazioni speciali per PWA - Versione Avanzata
const PWA_CONFIG = {
  redirectOnLaunch: true,       // Abilita il reindirizzamento quando la PWA viene avviata
  preserveQrData: true,         // Preserva i dati del QR code tra le sessioni
  defaultPath: '/pwa',          // Path di default a cui reindirizzare
  offlineMode: true,            // Supporto modalità offline migliorato
  backgroundSync: true,         // Sincronizzazione in background quando torna online
  periodicSync: true,           // Sincronizzazione periodica con il server
  keepAlive: true,              // Mantiene l'applicazione attiva tramite ping periodici
  healthCheckEndpoint: '/api/health', // Endpoint per verificare lo stato del server
  persistentConnections: true,  // Usa connessioni persistenti quando possibile
  logLevel: 'info'              // Livello di log (debug, info, warn, error)
};

// Log avanzato con livelli e timestamping
function logWithLevel(level, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[SW ${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'debug':
      if (PWA_CONFIG.logLevel === 'debug') console.debug(prefix, ...args);
      break;
    case 'info':
      if (['debug', 'info'].includes(PWA_CONFIG.logLevel)) console.log(prefix, ...args);
      break;
    case 'warn':
      if (['debug', 'info', 'warn'].includes(PWA_CONFIG.logLevel)) console.warn(prefix, ...args);
      break;
    case 'error':
      console.error(prefix, ...args);
      break;
    default:
      console.log(prefix, ...args);
  }
}

// Funzioni di logging
const log = {
  debug: (...args) => logWithLevel('debug', ...args),
  info: (...args) => logWithLevel('info', ...args),
  warn: (...args) => logWithLevel('warn', ...args),
  error: (...args) => logWithLevel('error', ...args)
};

/**
 * Funzione per timeout delle richieste fetch
 */
function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const { signal } = controller;
    
    // Imposta il timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout fetching ${url}`));
    }, timeout);
    
    // Verifico se è necessario aggiungere duplex per richieste con body
    let fetchOptions = { ...options, signal };
    
    // Aggiungi duplex se c'è un body e non è già stato specificato
    if (options.body && !options.duplex) {
      fetchOptions.duplex = 'half';
    }
    
    // Esegui la fetch con il signal di abort
    fetch(url, fetchOptions)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Verifica lo stato di salute dell'applicazione
 */
async function checkAppHealth() {
  try {
    if (!isConnected) {
      log.warn('Health check saltato: offline');
      return false;
    }
    
    if (recoveryMode) {
      log.warn('Health check saltato: in modalità di recupero');
      return false;
    }
    
    const response = await fetchWithTimeout(`${self.location.origin}/api/health`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-SW-Health-Check': 'true'
      }
    }, 10000);
    
    if (response.ok) {
      lastSuccessfulHealthCheck = Date.now();
      log.info('Health check completato con successo');
      return true;
    } else {
      log.warn(`Health check fallito: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    log.error('Health check fallito con errore:', error);
    
    // Tenta la procedura di risveglio se sono passati più di 10 minuti dall'ultimo health check riuscito
    const timeSinceLastSuccess = Date.now() - lastSuccessfulHealthCheck;
    if (timeSinceLastSuccess > 10 * 60 * 1000) {
      log.warn('Sono passati più di 10 minuti dall\'ultimo health check riuscito, tentativo di risveglio');
      await attemptWakeup();
    }
    
    return false;
  }
}

/**
 * Tenta di risvegliare l'applicazione
 */
async function attemptWakeup() {
  if (recoveryMode) {
    log.warn('Già in modalità di recupero, salto il tentativo di risveglio');
    return;
  }
  
  recoveryMode = true;
  log.info('Attivazione modalità di recupero');
  
  try {
    // Notifica i client della modalità di recupero
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RECOVERY_MODE',
          active: true,
          timestamp: Date.now()
        });
      });
    });
    
    // Esegui ping multipli con backoff esponenziale
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      try {
        log.info(`Tentativo di risveglio ${attempts + 1}/${maxAttempts}`);
        
        const response = await fetchWithTimeout(`${self.location.origin}/api/health`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-SW-Recovery': 'true',
            'X-SW-Attempt': attempts.toString()
          }
        }, 10000);
        
        if (response.ok) {
          success = true;
          log.info('Applicazione risvegliata con successo!');
          lastSuccessfulHealthCheck = Date.now();
          
          // Notifica i client che l'applicazione è tornata online
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'BACK_ONLINE',
                message: 'Connessione al server ripristinata!',
                timestamp: Date.now()
              });
            });
          });
          
          break;
        }
      } catch (error) {
        log.warn(`Tentativo di risveglio ${attempts + 1} fallito:`, error);
      }
      
      attempts++;
      
      // Attendi con backoff esponenziale prima del prossimo tentativo
      const waitTime = Math.min(1000 * Math.pow(2, attempts), 30000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    if (!success) {
      log.error('Tutti i tentativi di risveglio falliti');
      
      // Notifica i client che l'applicazione rimane offline
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'RECOVERY_FAILED',
            message: 'Impossibile riconnettersi al server. Riprova più tardi.',
            timestamp: Date.now()
          });
        });
      });
    }
  } finally {
    // Esci dalla modalità di recupero dopo 2 minuti comunque
    setTimeout(() => {
      recoveryMode = false;
      log.info('Uscita dalla modalità di recupero');
    }, RECOVERY_INTERVAL);
  }
}

/**
 * Configura e avvia il monitoraggio della salute dell'applicazione
 */
function setupHealthMonitoring() {
  // Cancella eventuali timer esistenti
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  
  // Esegui subito il primo health check
  checkAppHealth();
  
  // Imposta il timer per i controlli periodici
  healthCheckTimer = setInterval(() => {
    checkAppHealth();
  }, HEALTH_CHECK_INTERVAL);
  
  log.info(`Monitoraggio salute applicazione configurato con intervallo di ${HEALTH_CHECK_INTERVAL / 1000} secondi`);
}

// Installazione del service worker - migliorata con verifiche e precaricamento intelligente
self.addEventListener('install', (event) => {
  log.info('Installazione Service Worker in corso...');
  
  // Attivazione immediata del service worker
  self.skipWaiting();
  
  // Caricamento nella cache delle risorse critiche priorità 1
  const cacheCriticalResources = async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      log.info(`Caching di ${CRITICAL_RESOURCES.length} risorse critiche`);
      
      // Prima cache le risorse più critiche
      await cache.addAll(CRITICAL_RESOURCES);
      
      // Poi cache le risorse addizionali
      try {
        await cache.addAll(ADDITIONAL_RESOURCES);
        log.info('Risorse addizionali cachate con successo');
      } catch (additionalError) {
        // Continua comunque anche se le risorse addizionali non possono essere cachate
        log.warn('Impossibile cachare alcune risorse addizionali:', additionalError);
      }
      
      return true;
    } catch (error) {
      log.error('Errore durante il caching delle risorse:', error);
      
      // Tento di cachare almeno la pagina principale e il manifest
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(['/', '/index.html', '/manifest.json']);
        log.info('Cache di emergenza completata per le risorse minime');
      } catch (emergencyError) {
        log.error('Anche la cache di emergenza è fallita:', emergencyError);
      }
      
      return false;
    }
  };
  
  event.waitUntil(cacheCriticalResources());
});

// Attivazione: pulizia delle vecchie cache e inizializzazione
self.addEventListener('activate', (event) => {
  log.info('Attivazione Service Worker in corso...');
  
  const initializeAndCleanup = async () => {
    // Pulisci le vecchie cache
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (![CACHE_NAME, API_CACHE_NAME, STATIC_CACHE_NAME].includes(cacheName)) {
            log.info(`Eliminazione cache vecchia: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    } catch (error) {
      log.error('Errore durante la pulizia delle cache:', error);
    }
    
    // Inizializza il monitoraggio della salute
    setupHealthMonitoring();
    
    // Prendi il controllo immediato
    await self.clients.claim();
    
    // Notifica i client
    try {
      const clients = await self.clients.matchAll();
      log.info(`Notifica a ${clients.length} client che il Service Worker è attivo`);
      
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: '3.0',
          features: Object.keys(PWA_CONFIG).filter(key => PWA_CONFIG[key] === true),
          timestamp: Date.now()
        });
      });
    } catch (error) {
      log.error('Errore nella notifica ai client:', error);
    }
    
    return true;
  };
  
  event.waitUntil(initializeAndCleanup());
});

// Gestione avanzata delle richieste fetch con strategie differenziate per tipo di risorsa
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignora le richieste a risorse non HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Log minimo solo in modalità debug per evitare troppe scritture in console
  log.debug(`Fetch: ${request.method} ${url.pathname}`);
  
  // Definizione delle strategie per diversi tipi di richieste
  
  // 1. Per la navigazione e gli asset critici: Network con fallback a cache
  if (request.mode === 'navigate' || CRITICAL_RESOURCES.includes(url.pathname)) {
    event.respondWith(networkWithCacheFallback(request));
    return;
  }
  
  // 2. Per le richieste API: Strategie specifiche in base al metodo
  if (url.pathname.startsWith('/api/')) {
    // Per i dati dinamici (GET): Network con cache condizionale e fallback
    if (request.method === 'GET') {
      event.respondWith(apiNetworkFirstWithCache(request));
      return;
    }
    
    // Per operazioni di modifica (POST/PUT/DELETE): Gestione speciale
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      event.respondWith(handleMutationRequest(request));
      return;
    }
  }
  
  // 3. Per gli asset statici: Cache con fallback a network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
    return;
  }
  
  // 4. Per tutto il resto: Network con fallback a cache generico
  event.respondWith(networkWithCacheFallback(request));
});

// Funzione per determinare se una risorsa è un asset statico
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || ADDITIONAL_RESOURCES.includes(pathname);
}

// Strategia 1: Network con fallback a cache (per navigazione e risorse critiche)
async function networkWithCacheFallback(request) {
  try {
    // Prova prima dalla rete
    const networkResponse = await fetchWithTimeout(request.url, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials,
      cache: 'no-cache' // Forza sempre risorse fresche
    });
    
    // Se la risposta è valida, cachala
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    log.warn(`Fallback a cache per: ${request.url}`, error);
    
    // Se c'è un errore di rete, cerca nella cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback a index.html per richieste di navigazione
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) return indexResponse;
    }
    
    // Ultima spiaggia: errore formattato
    return createErrorResponse(
      `Impossibile caricare ${request.url} e nessuna versione è disponibile in cache.`,
      503
    );
  }
}

// Strategia 2: Cache-first con fallback a network (per asset statici)
async function cacheFirstWithNetworkFallback(request) {
  try {
    // Cerca prima nella cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Refresh cache in background (stale-while-revalidate)
      refreshCacheInBackground(request);
      return cachedResponse;
    }
    
    // Se non trovato in cache, prendi dalla rete
    const networkResponse = await fetchWithTimeout(request.url, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials
    });
    
    // Cache per la prossima volta
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    log.warn(`Errore nel recupero dell'asset statico: ${request.url}`, error);
    
    // Se già cercato in cache e non trovato, ritorna errore
    return createErrorResponse(
      `Impossibile caricare l'asset: ${request.url}`,
      503
    );
  }
}

// Strategia 3: API Network-first con refresh cache
async function apiNetworkFirstWithCache(request) {
  try {
    // Prova prima dalla rete
    const networkResponse = await fetchWithTimeout(request.url, {
      method: request.method,
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }),
      credentials: request.credentials
    });
    
    // Se la risposta è valida, cachala
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Mantieni le informazioni di freschezza in un'altra cache
      saveFreshnessInfo(request.url);
    }
    
    return networkResponse;
  } catch (error) {
    log.warn(`API non disponibile, fallback a cache per: ${request.url}`, error);
    
    // Cerca nella cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Aggiungi header per indicare che è una risposta dalla cache
      const headers = new Headers(cachedResponse.headers);
      headers.append('X-Cached-Response', 'true');
      
      // Recupera l'età del dato
      const freshness = await getFreshnessInfo(request.url);
      if (freshness) {
        const ageInSeconds = Math.floor((Date.now() - freshness) / 1000);
        headers.append('X-Cache-Age', ageInSeconds.toString());
      }
      
      return new Response(await cachedResponse.blob(), {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText + ' (cached)',
        headers
      });
    }
    
    // Se non c'è in cache, restituisci errore formattato
    return createErrorResponse(
      JSON.stringify({
        error: 'offline',
        message: 'Dati non disponibili offline. Riprova quando sarai online.',
        endpoint: request.url
      }),
      503,
      { 'Content-Type': 'application/json' }
    );
  }
}

// Strategia 4: Gestione richieste di mutazione (POST/PUT/PATCH/DELETE)
async function handleMutationRequest(request) {
  try {
    // Se siamo online, invia normalmente
    if (isConnected) {
      // Aggiungi il parametro 'duplex' richiesto per richieste con corpo in streaming
      return await fetchWithTimeout(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.clone().body,
        credentials: request.credentials,
        duplex: 'half' // Risolve l'errore "The 'duplex' member must be specified for a request with a streaming body"
      });
    } else {
      // Se siamo offline, salva la richiesta in coda e notifica l'utente
      const requestData = await getRequestData(request);
      
      try {
        await enqueueRequest(request.clone(), requestData);
      } catch (queueError) {
        log.error('Errore nel salvataggio della richiesta in coda:', queueError);
      }
      
      // Restituisci risposta formattata
      return createErrorResponse(
        JSON.stringify({
          error: 'offline',
          message: 'Sei offline. La richiesta verrà inviata automaticamente quando tornerai online.',
          queued: true,
          request: {
            url: request.url,
            method: request.method
          }
        }),
        503,
        { 'Content-Type': 'application/json' }
      );
    }
  } catch (error) {
    log.error(`Errore nella richiesta di mutazione: ${request.url}`, error);
    
    return createErrorResponse(
      JSON.stringify({
        error: 'request_failed',
        message: getErrorMessage(error) || 'La richiesta non è andata a buon fine.',
        details: error.toString()
      }),
      500,
      { 'Content-Type': 'application/json' }
    );
  }
}

// Utilitarie per la freschezza dei dati
async function saveFreshnessInfo(url) {
  try {
    const freshnessCache = await caches.open('freshness-info');
    await freshnessCache.put(
      new Request(url + '-freshness'),
      new Response(Date.now().toString())
    );
  } catch (e) {
    log.error('Errore nel salvare le informazioni di freschezza:', e);
  }
}

async function getFreshnessInfo(url) {
  try {
    const freshnessCache = await caches.open('freshness-info');
    const response = await freshnessCache.match(new Request(url + '-freshness'));
    
    if (response) {
      const text = await response.text();
      return parseInt(text, 10);
    }
  } catch (e) {
    log.error('Errore nel recuperare le informazioni di freschezza:', e);
  }
  
  return null;
}

// Utilitarie per la gestione della coda di richieste offline
async function enqueueRequest(request, data) {
  // Salva la richiesta in IndexedDB o localStorage per inviarla quando torna online
  // Per semplicità, in questa implementazione usiamo localStorage
  try {
    const queue = JSON.parse(localStorage.getItem('offline-requests') || '[]');
    
    queue.push({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: data,
      timestamp: Date.now()
    });
    
    localStorage.setItem('offline-requests', JSON.stringify(queue));
    log.info(`Richiesta aggiunta alla coda offline: ${request.method} ${request.url}`);
    
    return true;
  } catch (error) {
    log.error('Errore nel salvataggio della richiesta offline:', error);
    throw error;
  }
}

// Utility per estrarre dati dalla richiesta
async function getRequestData(request) {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      const clone = request.clone();
      return await clone.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const clone = request.clone();
      const formData = await clone.formData();
      return Object.fromEntries(formData.entries());
    } else {
      const clone = request.clone();
      return await clone.text();
    }
  } catch (error) {
    log.error('Errore nell\'estrazione dei dati dalla richiesta:', error);
    return {};
  }
}

// Processa la coda delle richieste offline
async function processOfflineQueue() {
  try {
    const queueString = localStorage.getItem('offline-requests');
    if (!queueString) return;
    
    const queue = JSON.parse(queueString);
    if (!queue.length) return;
    
    log.info(`Processamento di ${queue.length} richieste offline in coda`);
    
    // Crea una nuova coda per le richieste che falliscono ancora
    const failedRequests = [];
    
    for (const request of queue) {
      try {
        log.info(`Invio richiesta in coda: ${request.method} ${request.url}`);
        
        const response = await fetchWithTimeout(request.url, {
          method: request.method,
          headers: new Headers(request.headers),
          body: JSON.stringify(request.body),
          credentials: 'include',
          duplex: 'half' // Aggiungi duplex per evitare errori con corpo in streaming
        }, 15000);
        
        if (!response.ok) {
          log.warn(`La richiesta in coda ha fallito con status: ${response.status}`);
          failedRequests.push(request);
        } else {
          log.info(`Richiesta in coda completata con successo: ${request.method} ${request.url}`);
        }
      } catch (error) {
        log.error(`Errore nell'invio della richiesta in coda: ${request.url}`, error);
        failedRequests.push(request);
      }
    }
    
    // Salva le richieste fallite di nuovo in coda
    if (failedRequests.length) {
      localStorage.setItem('offline-requests', JSON.stringify(failedRequests));
      log.warn(`${failedRequests.length} richieste rimangono in coda`);
    } else {
      localStorage.removeItem('offline-requests');
      log.info('Tutte le richieste in coda sono state processate con successo');
    }
    
    // Notifica i client
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'OFFLINE_QUEUE_PROCESSED',
          success: queue.length - failedRequests.length,
          failed: failedRequests.length,
          timestamp: Date.now()
        });
      });
    });
  } catch (error) {
    log.error('Errore nel processamento della coda offline:', error);
  }
}

// Aggiorna la cache in background senza bloccare la risposta
async function refreshCacheInBackground(request) {
  try {
    const cacheName = isStaticAsset(new URL(request.url).pathname) ? STATIC_CACHE_NAME : CACHE_NAME;
    
    fetchWithTimeout(request.url, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials,
      cache: 'no-cache'
    }).then(response => {
      if (response.ok) {
        caches.open(cacheName).then(cache => {
          cache.put(request, response);
          log.debug(`Aggiornata cache in background per: ${request.url}`);
        });
      }
    }).catch(error => {
      log.debug(`Impossibile aggiornare la cache in background per: ${request.url}`, error);
    });
  } catch (error) {
    log.error(`Errore durante il refresh della cache in background: ${request.url}`, error);
  }
}

// Crea una risposta di errore formattata
function createErrorResponse(message, status = 503, additionalHeaders = {}) {
  return new Response(message, {
    status: status,
    statusText: status === 503 ? 'Service Unavailable' : 'Error',
    headers: new Headers({
      'Content-Type': 'text/plain',
      ...additionalHeaders
    })
  });
}

// Ottieni un messaggio di errore utente-amichevole
function getErrorMessage(error) {
  if (!error) return 'Errore sconosciuto';
  
  const errorMessage = error.message || error.toString();
  
  // Cerca tra gli errori comuni
  for (const [pattern, message] of Object.entries(COMMON_ERRORS)) {
    if (errorMessage.includes(pattern)) {
      return message;
    }
  }
  
  return errorMessage;
}

// Ascolta eventi di connettività
self.addEventListener('message', event => {
  // Gestione del cambio di stato online/offline
  if (event.data && event.data.type === 'ONLINE_STATUS_CHANGE') {
    const wasConnected = isConnected;
    isConnected = event.data.isOnline;
    
    log.info(`Stato connettività cambiato: ${isConnected ? 'online' : 'offline'}`);
    
    // Se siamo tornati online, processa la coda delle richieste offline
    if (isConnected && !wasConnected) {
      processOfflineQueue();
      
      // Notifica tutti i client che siamo tornati online
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACK_ONLINE',
            message: 'Connessione ripristinata! Sincronizzazione in corso...',
            timestamp: Date.now()
          });
        });
      });
    }
  }
  
  // Gestione richiesta skip waiting
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Gestione richieste di riavvio dell'app
  if (event.data && event.data.type === 'RESTART_APP') {
    log.info('Richiesto riavvio dell\'applicazione');
    
    // Notifica tutti i client di ricaricare
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RELOAD_APP',
          message: 'Riavvio in corso...',
          hard: event.data.hard || false,
          timestamp: Date.now()
        });
      });
    });
  }
  
  // Gestione richiesta controllo salute immediato
  if (event.data && event.data.type === 'CHECK_HEALTH_NOW') {
    log.info('Richiesto controllo salute immediato');
    checkAppHealth();
  }
  
  // Aggiorna lo stato dell'app
  if (event.data && event.data.type === 'APP_STATE_UPDATE') {
    appIsActive = event.data.isActive;
    log.debug(`Stato app aggiornato: ${appIsActive ? 'attiva' : 'inattiva'}`);
  }
});

// Gestione eventi push per le notifiche
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const title = data.title || 'Notifica';
    const options = {
      body: data.body || 'Nuova notifica',
      icon: '/icons/default-app-icon.jpg',
      badge: '/icons/notification-badge.png',
      data: {
        url: data.url || '/',
        ...data.data
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    log.error('Errore nella gestione della notifica push:', error);
  }
});

// Click sulle notifiche
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // Cerca una finestra già aperta da cui andare
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Apri una nuova finestra se non ce ne sono
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Log per debug
log.info('Service Worker 3.0 registrato e funzionante (versione avanzata con recupero automatico)');