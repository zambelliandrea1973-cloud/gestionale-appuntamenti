/**
 * cleanup-menu.js v2.0
 * 
 * Script AVANZATO per rimuovere forzatamente i pulsanti problematici dal menu mobile
 * Utilizza multiple strategie per garantire che i pulsanti vengano rimossi
 * anche se sono caricati dinamicamente da qualsiasi fonte
 */

(function() {
  // Elenco delle parole chiave da rimuovere (case insensitive)
  const forbiddenTexts = ['appuntamenti', 'questionari'];
  
  // ID di debug per tracciare le operazioni eseguite
  const debugId = 'menu-cleanup-v2-' + Date.now();
  console.log(`[${debugId}] Inizializzazione script di pulizia menu`);
  
  // Conta gli elementi rimossi per debug
  let removedCount = 0;
  
  // Funzione avanzata che rimuove i pulsanti problematici con più strategie
  function cleanupMenuItems() {
    // 1. Selettori più ampi per catturare tutti i possibili pulsanti
    const allPossibleButtons = document.querySelectorAll('button, a, [role="button"], .button, [class*="Button"], [class*="button"], [class*="Nav"], [class*="Menu"], li');
    
    allPossibleButtons.forEach(element => {
      // Ottieni tutto il testo contenuto nell'elemento
      const fullText = element.textContent || '';
      const lowerText = fullText.toLowerCase().trim();
      
      // Controlla se contiene una delle parole proibite
      const hasForbiddenText = forbiddenTexts.some(text => 
        lowerText.includes(text.toLowerCase())
      );
      
      if (hasForbiddenText) {
        // Nascondi l'elemento e il suo contenitore se possibile
        element.style.display = 'none !important';
        element.style.visibility = 'hidden !important';
        element.style.opacity = '0 !important';
        element.style.pointerEvents = 'none !important';
        element.style.position = 'absolute !important';
        element.style.left = '-9999px !important';
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('data-removed-by', debugId);
        
        // Se è un elemento di lista, nascondi anche il li genitore
        const parentLi = element.closest('li');
        if (parentLi && parentLi !== element) {
          parentLi.style.display = 'none !important';
          parentLi.setAttribute('data-removed-by', debugId);
        }
        
        // Nascondi anche elementi con attributi che contengono le parole proibite
        const allAttrs = Array.from(element.attributes);
        for (const attr of allAttrs) {
          const attrValue = attr.value.toLowerCase();
          if (forbiddenTexts.some(text => attrValue.includes(text.toLowerCase()))) {
            element.style.display = 'none !important';
            element.setAttribute('data-removed-by-attr', debugId);
            break;
          }
        }
        
        removedCount++;
        console.log(`[${debugId}] Nascosto elemento #${removedCount}: "${fullText.trim().substring(0, 30)}${fullText.length > 30 ? '...' : ''}"`);
      }
    });
    
    // 2. Selettori specifici per le classi comuni di menu nei framework React
    const targetSelectors = [
      '[data-state="open"] button', 
      '[data-state="open"] a',
      '.MuiDrawer-root button', 
      '.MuiDrawer-root a',
      '.mobile-menu button',
      '.mobile-menu a',
      '[role="menu"] button',
      '[role="menu"] a',
      '[role="menuitem"]',
      '.side-menu button',
      '.side-menu a',
      '.menu-container button',
      '.menu-container a',
      'nav button',
      'nav a'
    ];
    
    // Unisci tutti i selettori specifici
    const specificElements = document.querySelectorAll(targetSelectors.join(', '));
    
    specificElements.forEach(element => {
      const fullText = element.textContent || '';
      const lowerText = fullText.toLowerCase().trim();
      
      if (forbiddenTexts.some(text => lowerText.includes(text.toLowerCase()))) {
        element.style.display = 'none !important';
        element.style.visibility = 'hidden !important';
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('data-removed-by-specific', debugId);
        
        removedCount++;
        console.log(`[${debugId}] Nascosto elemento specifico #${removedCount}: "${fullText.trim().substring(0, 30)}${fullText.length > 30 ? '...' : ''}"`);
      }
    });
    
    // 3. Rimuovi anche stili CSS che potrebbero mostrare questi elementi
    injectOverrideStyles();
    
    return removedCount;
  }
  
  // Funzione che inietta stili CSS direttamente nel documento
  function injectOverrideStyles() {
    // Verifica se abbiamo già iniettato gli stili
    if (document.getElementById('menu-cleanup-styles')) {
      return;
    }
    
    // Crea un elemento style
    const styleElement = document.createElement('style');
    styleElement.id = 'menu-cleanup-styles';
    styleElement.innerHTML = `
      /* Nascondi elementi con testo problematico */
      button:contains("Appuntamenti"), 
      a:contains("Appuntamenti"),
      button:contains("Questionari"), 
      a:contains("Questionari"),
      button:contains("appuntamenti"), 
      a:contains("appuntamenti"),
      button:contains("questionari"), 
      a:contains("questionari"),
      [href*="appointment"],
      [href*="questionnaire"],
      li:has(> a:contains("Appuntamenti")),
      li:has(> a:contains("Questionari")),
      li:has(> button:contains("Appuntamenti")),
      li:has(> button:contains("Questionari")) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -9999px !important;
      }
    `;
    
    // Aggiungi lo stile alla head
    document.head.appendChild(styleElement);
    console.log(`[${debugId}] Stili CSS iniettati per nascondere elementi problematici`);
  }
  
  // Funzione per creare un osservatore avanzato del DOM
  function setupAdvancedObserver() {
    // Configura un osservatore per le modifiche ai nodi DOM
    const observer = new MutationObserver((mutations) => {
      let needsCleanup = false;
      
      for (const mutation of mutations) {
        // Se sono stati aggiunti nodi, pulisci
        if (mutation.addedNodes.length > 0) {
          needsCleanup = true;
          break;
        }
        
        // Se un attributo è cambiato, controlla se è rilevante
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          // Se l'elemento è diventato visibile o è cambiato il suo stato
          if (
            mutation.attributeName === 'style' || 
            mutation.attributeName === 'class' ||
            mutation.attributeName === 'data-state' ||
            mutation.attributeName === 'aria-expanded'
          ) {
            needsCleanup = true;
            break;
          }
        }
      }
      
      if (needsCleanup) {
        const removedItems = cleanupMenuItems();
        if (removedItems > 0) {
          console.log(`[${debugId}] Eseguita pulizia dopo mutazione DOM: ${removedItems} elementi rimossi`);
        }
      }
    });
    
    // Osserva l'intero documento con opzioni complete
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-state', 'aria-expanded']
    });
    
    console.log(`[${debugId}] Osservatore DOM avanzato configurato`);
    return observer;
  }
  
  // Esecuzione periodica per catturare elementi caricati in ritardo
  function setupPeriodicCleanup() {
    // Pulisci ogni 1 secondo per 30 secondi dopo il caricamento
    let count = 0;
    const interval = setInterval(() => {
      const removedItems = cleanupMenuItems();
      if (removedItems > 0) {
        console.log(`[${debugId}] Eseguita pulizia periodica #${count+1}: ${removedItems} elementi rimossi`);
      }
      
      count++;
      if (count >= 30) {
        clearInterval(interval);
        console.log(`[${debugId}] Pulizia periodica completata dopo ${count} iterazioni`);
        
        // Continua con intervalli più lunghi
        setInterval(cleanupMenuItems, 5000);
      }
    }, 1000);
  }
  
  // Intercetta le API che potrebbero modificare il DOM dinamicamente
  function hookDynamicApis() {
    // Intercetta chiamate fetch che potrebbero caricare dati di menu
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const promise = originalFetch.apply(this, args);
      promise.then(() => {
        // Esegui la pulizia quando la fetch si completa
        setTimeout(cleanupMenuItems, 200);
      });
      return promise;
    };
    
    // Intercetta XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      this.addEventListener('load', () => {
        // Esegui la pulizia quando la XHR si completa
        setTimeout(cleanupMenuItems, 200);
      });
      return originalXHROpen.apply(this, args);
    };
    
    console.log(`[${debugId}] API dinamiche intercettate`);
  }
  
  // Event handler per vari eventi che potrebbero causare l'apertura di menu
  function setupEventHandlers() {
    // Array di eventi da monitorare
    const eventsToWatch = [
      'click', 'touchend', 'mouseup',  // Interazione utente
      'popstate', 'hashchange',        // Navigazione
      'focus', 'blur',                 // Focus
      'animationend', 'transitionend'  // Animazioni
    ];
    
    // Aggiungi handler per ogni evento
    eventsToWatch.forEach(eventType => {
      document.addEventListener(eventType, () => {
        // Aspetta che eventuali menu si aprano
        setTimeout(cleanupMenuItems, 100);
      }, { passive: true });
    });
    
    console.log(`[${debugId}] Event handler configurati per ${eventsToWatch.length} tipi di eventi`);
  }
  
  // Funzione principale iniziale
  function init() {
    console.log(`[${debugId}] Avvio script di pulizia menu v2.0`);
    
    // Esegui la prima pulizia al più presto possibile
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log(`[${debugId}] DOM caricato, esecuzione pulizia iniziale`);
        cleanupMenuItems();
        setupAdvancedObserver();
        setupPeriodicCleanup();
        setupEventHandlers();
        hookDynamicApis();
      });
    } else {
      // DOM già caricato, esegui subito
      console.log(`[${debugId}] DOM già caricato, esecuzione pulizia immediata`);
      cleanupMenuItems();
      setupAdvancedObserver();
      setupPeriodicCleanup();
      setupEventHandlers();
      hookDynamicApis();
    }
    
    // Esegui anche al caricamento completo della pagina per sicurezza
    window.addEventListener('load', () => {
      console.log(`[${debugId}] Pagina completamente caricata, esecuzione pulizia aggiuntiva`);
      cleanupMenuItems();
    });
  }
  
  // Avvio dello script
  init();
})();