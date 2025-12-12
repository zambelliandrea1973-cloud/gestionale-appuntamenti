// Service Worker per l'applicazione di gestione appuntamenti
// VERSIONE 9 - CRITICAL FIX - NUKE ALL CACHES
// Build: 2025-12-12T08:00 - Force complete cache purge
const CACHE_NAME = 'appointment-manager-v9-purge-all';

// NIENTE da cachare - tutto deve passare dalla rete
const urlsToCache = [];

// Installazione del Service Worker
self.addEventListener('install', function(event) {
  console.log('🚨 Service Worker v9: INSTALLAZIONE - NUKE MODE');
  // CRITICO: skipWaiting() per attivare immediatamente
  self.skipWaiting();
  
  event.waitUntil(
    // Elimina TUTTE le cache esistenti durante l'installazione
    caches.keys().then(function(cacheNames) {
      console.log('🗑️ Service Worker v9: Eliminazione di TUTTE le cache:', cacheNames);
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('🗑️ Eliminazione cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker v9: ATTIVAZIONE - NUKE MODE');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      // Elimina TUTTE le cache, nessuna eccezione
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('🗑️ Service Worker v9: Eliminazione cache durante attivazione:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ Service Worker v9: Tutte le cache eliminate, claim clients');
      // Prendi controllo di tutti i client immediatamente
      return self.clients.claim();
    })
  );
});

// Intercettazione delle richieste di rete - TUTTO VA ALLA RETE
self.addEventListener('fetch', function(event) {
  // NON intercettare NULLA - tutto passa direttamente alla rete
  // Questo è il modo più sicuro per evitare problemi di cache
  return;
});

// Gestione dei messaggi dal client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ Service Worker v9: Tutte le cache eliminate su richiesta');
    });
  }
});

console.log('🚨 Service Worker v9: Script caricato - NUKE MODE ATTIVO');
