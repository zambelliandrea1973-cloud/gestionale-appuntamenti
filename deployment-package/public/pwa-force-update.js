// Script per forzare l'aggiornamento delle icone PWA su Android
(function() {
  'use strict';
  
  // Forza la rimozione della cache del manifest
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
  
  // Forza refresh del manifest con nuovo ID univoco
  const timestamp = Date.now();
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    const currentHref = manifestLink.getAttribute('href');
    const newHref = currentHref.includes('?') 
      ? `${currentHref}&force_refresh=${timestamp}`
      : `${currentHref}?force_refresh=${timestamp}`;
    
    // Rimuovi e ricrea il link al manifest
    manifestLink.remove();
    
    setTimeout(() => {
      const newLink = document.createElement('link');
      newLink.rel = 'manifest';
      newLink.href = newHref;
      document.head.appendChild(newLink);
      
      console.log('📱 PWA: Manifest ricreato con nuovo timestamp:', newHref);
    }, 100);
  }
  
  // Aggiorna le meta tag per forzare re-installazione con tema Silvia Busnari
  let themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = '#006400';
  }
  
  // Aggiorna il nome dell'app per Android
  let appTitle = document.querySelector('meta[name="application-name"]');
  if (!appTitle) {
    appTitle = document.createElement('meta');
    appTitle.name = 'application-name';
    document.head.appendChild(appTitle);
  }
  appTitle.content = 'Silvia Busnari';
  
  // Trigger evento per notificare il cambio
  window.dispatchEvent(new CustomEvent('pwaManifestUpdated', {
    detail: { timestamp: timestamp }
  }));
})();