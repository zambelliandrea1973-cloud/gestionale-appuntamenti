/**
 * Script di correzione per errori di caricamento JavaScript
 * Questo script intercetta gli errori di caricamento e tenta di caricare correttamente le risorse
 */

(function() {
  // Monitora errori di caricamento di script
  window.addEventListener('error', function(event) {
    const errorMessage = event.message || '';
    const errorSource = event.filename || '';
    
    // Controlla se è l'errore specifico "Unexpected token '<'"
    if (errorMessage.includes("Unexpected token '<'") || 
        (event.error && event.error.message && event.error.message.includes("Unexpected token '<'"))) {
      
      console.log('Errore di caricamento rilevato, tentativo di recupero:', errorSource);
      
      // Se è un errore su una risorsa JavaScript specifica, tenta di ricaricarla correttamente
      if (errorSource && errorSource.endsWith('.js')) {
        // Pulisce la cache per questa risorsa
        if ('caches' in window) {
          caches.keys().then(function(cacheNames) {
            cacheNames.forEach(function(cacheName) {
              caches.open(cacheName).then(function(cache) {
                cache.delete(errorSource).then(function() {
                  console.log('Cache pulita per:', errorSource);
                });
              });
            });
          });
        }
        
        // Tenta di caricare nuovamente la risorsa con cache busting
        const timestamp = new Date().getTime();
        const newScriptUrl = errorSource.includes('?') 
          ? `${errorSource}&_cachebust=${timestamp}` 
          : `${errorSource}?_cachebust=${timestamp}`;
        
        const scriptElement = document.createElement('script');
        scriptElement.src = newScriptUrl;
        scriptElement.async = true;
        document.head.appendChild(scriptElement);
        
        console.log('Tentativo di ricaricamento della risorsa:', newScriptUrl);
        
        // Previene la propagazione dell'errore
        event.preventDefault();
        return false;
      }
      
      // Nascondi sempre l'overlay di errore di Vite
      setTimeout(function() {
        const errorOverlay = document.querySelector('vite-error-overlay');
        if (errorOverlay) {
          errorOverlay.style.display = 'none';
          console.log('Overlay di errore nascosto con successo');
        }
      }, 100);
    }
  }, true);
  
  // Monitora errori di caricamento dinamico (per i moduli ES)
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    if (error && error.message && error.message.includes("Unexpected token '<'")) {
      console.warn('Errore di caricamento modulo, potrebbe essere necessario ricaricare la pagina');
      
      // Nascondi l'overlay di errore
      setTimeout(function() {
        const errorOverlay = document.querySelector('vite-error-overlay');
        if (errorOverlay) {
          errorOverlay.style.display = 'none';
        }
      }, 100);
      
      // Previene la propagazione dell'errore
      event.preventDefault();
      return false;
    }
  });
  
  console.log('Script di correzione errori caricato e attivo');
})();