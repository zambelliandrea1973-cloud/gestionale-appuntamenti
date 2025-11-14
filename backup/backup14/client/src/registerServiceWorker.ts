/**
 * Funzioni di gestione del service worker
 * per garantire che l'app sia sempre aggiornata all'ultima versione
 */

// Registra il service worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Versione attuale dell'app, cambiare quando si aggiornano risorse
    const APP_VERSION = 'v3.0.0';
    
    window.addEventListener('load', async () => {
      try {
        // Prima di registrare il nuovo, disattiviamo quelli esistenti
        await unregisterPreviousServiceWorkers();
        
        // Registra con versione nella query per forzare aggiornamento
        const registration = await navigator.serviceWorker.register('/sw.js?v=' + APP_VERSION, {
          scope: '/',
          updateViaCache: 'none' // Non usare cache per updates
        });
        
        console.log('Service Worker registrato con successo:', registration.scope);
        
        // Forza un controllo immediato per aggiornamenti
        if (registration.active) {
          registration.update();
        }
        
        // Gestione aggiornamenti
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nuovo Service Worker installato, pronto per aggiornamento');
                
                if (confirm('Nuova versione disponibile! Ricaricare ora per aggiornare?')) {
                  // Pulisci cache e ricarica
                  clearCaches().then(() => window.location.reload());
                }
              }
            });
          }
        });
      } catch (error) {
        console.error('Errore durante la registrazione del Service Worker:', error);
      }
    });
    
    // Gestione errori del service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ERROR') {
        console.error('Errore nel Service Worker:', event.data.message);
      }
    });
  }
}

// Unregistra tutti i service worker esistenti
async function unregisterPreviousServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service Worker precedente rimosso');
    }
    return true;
  } catch (error) {
    console.error('Errore durante la rimozione dei Service Worker:', error);
    return false;
  }
}

// Pulisci tutte le cache
async function clearCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Tutte le cache sono state eliminate');
    
    // Pulisce anche localStorage per dati obsoleti
    if (window.localStorage) {
      const keysToKeep = ['theme']; // Mantieni impostazioni fondamentali
      
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante la pulizia delle cache:', error);
    return false;
  }
}