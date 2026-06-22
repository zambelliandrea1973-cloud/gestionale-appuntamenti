// Service Worker - VERSIONE 10 - NUKE ALL CACHES
// Build: 2026-06-22 - Force complete cache purge
const CACHE_NAME = 'gestionale-appuntamenti-v10-nuke';

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      }));
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// NON intercettare NULLA - tutto passa direttamente alla rete
self.addEventListener('fetch', function(event) {
  return;
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(function(cacheNames) {
      return Promise.all(cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      }));
    });
  }
});
